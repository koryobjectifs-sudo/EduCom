/**
 * Remplit CHAQUE classe d'un effectif d'élèves de test, pour éprouver la saisie
 * des notes sur des cas réalistes.
 *
 * Le script vise un effectif cible par classe et ne crée que ce qui manque :
 * relancer ne double jamais les élèves. Les noms proviennent d'un pool
 * déterministe qui sert aussi de marqueur pour le nettoyage (CLEAN=1).
 *
 * ⚠️ GARDE-FOU AJOUTÉ LE 19 AOÛT 2026. Le script visait la PREMIÈRE école de la
 * base et y injectait des élèves FICTIFS — dans un établissement qui en compte
 * 133 de réels, ils deviennent indiscernables sans le pool de noms. Pire,
 * `CLEAN=1` supprime des élèves. L'établissement doit être nommé.
 *
 *   npm run script -- scripts/seed-test-students.ts                              -> refuse
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-test-students.ts              -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-test-students.ts      -> crée
 *   SCHOOL_ID=<uuid> CLEAN=1 APPLY=1 npm run script -- scripts/seed-test-students.ts -> supprime
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { APPLY, resoudreCible } from "./_cible";

const CLEAN = process.env.CLEAN === "1";

/** Effectif visé par classe. */
const TARGET = 10;

// Doit correspondre aux inscriptions existantes : `Enrollment` est unique par
// (élève, année scolaire), donc un élève n'appartient qu'à une classe par an.
const ACADEMIC_YEAR = "2023-2024";

const FIRST_NAMES = [
  "Aïssatou", "Mamadou", "Fatou", "Ousmane", "Awa", "Ibrahima", "Mariama", "Cheikh",
  "Ndeye", "Moussa", "Khady", "Abdoulaye", "Sokhna", "Modou", "Rama", "Alioune",
  "Bineta", "Serigne", "Coumba", "Pape",
];
const LAST_NAMES = [
  "Diallo", "Ndiaye", "Sarr", "Ba", "Diop", "Fall", "Sow", "Gueye", "Faye", "Camara",
  "Thiam", "Cissé", "Mbaye", "Seck", "Diouf", "Kane", "Barry", "Touré", "Sy", "Niang",
];

/** 400 combinaisons uniques, dans un ordre stable d'une exécution à l'autre. */
const NAME_POOL: [string, string][] = LAST_NAMES.flatMap((last) =>
  FIRST_NAMES.map((first) => [first, last] as [string, string])
);

// Les 10 premiers élèves de CM2 avaient été créés avec un appariement différent :
// on les garde dans le marqueur pour que CLEAN les retire aussi.
const LEGACY_NAMES: [string, string][] = [
  ["Aïssatou", "Diallo"], ["Mamadou", "Ndiaye"], ["Fatou", "Sarr"], ["Ousmane", "Ba"],
  ["Awa", "Diop"], ["Ibrahima", "Fall"], ["Mariama", "Sow"], ["Cheikh", "Gueye"],
  ["Ndeye", "Faye"], ["Moussa", "Camara"],
];

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const cible = await resoudreCible(
    CLEAN ? "SUPPRIME des élèves de test" : "des ÉLÈVES FICTIFS",
    prisma as never,
  );
  if (!cible) return;
  const school = { id: cible.id };

  if (CLEAN) return clean(school.id);

  // Ordre stable : l'allocation des noms doit être reproductible.
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    orderBy: { name: "asc" },
  });

  let cursor = 0;
  let createdTotal = 0;

  for (const cls of classes) {
    const current = await prisma.enrollment.count({ where: { classId: cls.id } });
    const missing = Math.max(0, TARGET - current);

    if (missing === 0) {
      console.log(`  ${cls.name.padEnd(12)} ${current} élève(s) — complet`);
      continue;
    }

    let created = 0;
    while (created < missing && cursor < NAME_POOL.length) {
      const [firstName, lastName] = NAME_POOL[cursor++];

      const exists = await prisma.student.findFirst({
        where: { schoolId: school.id, firstName, lastName },
      });
      if (exists) continue; // nom déjà pris : on avance dans le pool

      if (APPLY) {
        await prisma.student.create({
          data: {
            firstName,
            lastName,
            status: "ENROLLED",
            schoolId: school.id,
            enrollments: { create: { classId: cls.id, academicYear: ACADEMIC_YEAR } },
          },
        });
      }
      created++;
    }

    createdTotal += created;
    console.log(`  ${cls.name.padEnd(12)} ${current} → ${current + created} élève(s)  (+${created})`);
  }

  console.log(`\n${createdTotal} élève(s) créé(s).`);
  if (!APPLY) console.log("Essai à blanc : rien écrit. Relance avec APPLY=1.");
}

async function clean(schoolId: string) {
  const marker = [...NAME_POOL, ...LEGACY_NAMES];
  let removed = 0;
  let kept = 0;

  for (const [firstName, lastName] of marker) {
    const student = await prisma.student.findFirst({
      where: { schoolId, firstName, lastName },
    });
    if (!student) continue;

    // Un élève porteur de notes n'est plus une donnée de test : on n'y touche pas.
    const grades = await prisma.grade.count({ where: { studentId: student.id } });
    if (grades > 0) {
      console.log(`  ${firstName} ${lastName} — ${grades} note(s), CONSERVÉ`);
      kept++;
      continue;
    }

    if (APPLY) await prisma.student.delete({ where: { id: student.id } });
    removed++;
  }

  console.log(`\n${removed} supprimé(s), ${kept} conservé(s) car porteurs de notes.`);
  if (!APPLY) console.log("Essai à blanc : rien supprimé.");
}

main()
  .catch((e) => {
    console.error("ÉCHEC :", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
