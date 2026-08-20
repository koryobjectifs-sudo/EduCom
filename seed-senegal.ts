import { prisma } from "./scripts/_env";

/**
 * Jeu de données de démonstration — classes, matières, élèves fictifs.
 *
 * ⚠️ GARDE-FOU AJOUTÉ LE 19 AOÛT 2026. Ce script écrivait dans la PREMIÈRE
 * école de la base, sans confirmation. Lancé par mégarde, il injectait des
 * élèves fictifs dans un établissement réel — « Kory Academy 2 » en compte 133
 * de vrais. Une base de production ne doit jamais pouvoir recevoir des données
 * de démonstration par une commande sans argument.
 *
 * Il exige désormais l'identifiant de l'école ET une confirmation explicite :
 *
 *   npm run seed:senegal                       → refuse, et affiche les écoles
 *   SCHOOL_ID=<uuid> npm run seed:senegal      → essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run seed:senegal → écrit
 */
const APPLY = process.env.APPLY === "1";
const SCHOOL_ID = process.env.SCHOOL_ID?.trim();

async function main() {
  if (!SCHOOL_ID) {
    const ecoles = await prisma.school.findMany({
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { createdAt: "asc" },
    });
    console.log("⚠️ REFUS : ce script injecte des données de DÉMONSTRATION.\n");
    console.log("Indiquez explicitement l'établissement cible :\n");
    for (const e of ecoles) console.log(`  SCHOOL_ID=${e.id}  → ${e.name} (${e._count.students} élève(s) RÉELS)`);
    console.log("\nPuis ajoutez APPLY=1 pour écrire.");
    return;
  }

  const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID } });
  if (!school) {
    console.log(`Aucun établissement avec l'identifiant ${SCHOOL_ID}.`);
    return;
  }
  const schoolId = school.id;
  const dejaLa = await prisma.student.count({ where: { schoolId } });
  console.log(`Cible : ${school.name} (${schoolId}) — ${dejaLa} élève(s) déjà présent(s).`);
  if (!APPLY) {
    console.log("\n→ ESSAI À BLANC. Relancer avec APPLY=1 pour écrire.");
    return;
  }
  console.log(`Seeding school: ${school.name} (${schoolId})`);

  // 1. Pre-register Classes
  const classesToCreate = [
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
    { name: "6ème", cycle: "COLLEGE" },
    { name: "5ème", cycle: "COLLEGE" },
    { name: "4ème", cycle: "COLLEGE" },
    { name: "3ème", cycle: "COLLEGE" },
    { name: "Seconde", cycle: "LYCEE" },
    { name: "Première", cycle: "LYCEE" },
    { name: "Terminale", cycle: "LYCEE" },
  ];

  for (const c of classesToCreate) {
    const exists = await prisma.class.findFirst({ where: { name: c.name, schoolId } });
    if (!exists) {
      await prisma.class.create({
        data: { name: c.name, cycle: c.cycle as any, schoolId }
      });
    }
  }
  console.log("Classes seeded.");

  // 2. Pre-register Subjects
  const subjectsToCreate = [
    "Mathématiques", "Français", "Anglais", "Histoire-Géographie", 
    "SVT", "Physique-Chimie", "Éducation Physique (EPS)", "Philosophie", "Espagnol", "Arabe"
  ];
  for (const s of subjectsToCreate) {
    const exists = await prisma.subject.findFirst({ where: { name: s, schoolId } });
    if (!exists) {
      await prisma.subject.create({ data: { name: s, schoolId } });
    }
  }
  console.log("Subjects seeded.");

  // 3. Pre-register Terms and Evaluations
  const termsData = [
    {
      name: "1er Trimestre",
      evaluations: [
        { name: "Contrôle 1", type: "QUIZ" },
        { name: "Contrôle 2", type: "QUIZ" },
        { name: "Composition 1er Trim", type: "EXAM" }
      ]
    },
    {
      name: "2ème Trimestre",
      evaluations: [
        { name: "Contrôle 1", type: "QUIZ" },
        { name: "Contrôle 2", type: "QUIZ" },
        { name: "Composition 2ème Trim", type: "EXAM" }
      ]
    },
    {
      name: "3ème Trimestre",
      evaluations: [
        { name: "Contrôle 1", type: "QUIZ" },
        { name: "Contrôle 2", type: "QUIZ" },
        { name: "Composition 3ème Trim", type: "EXAM" }
      ]
    }
  ];

  for (const t of termsData) {
    let term = await prisma.term.findFirst({ where: { name: t.name, schoolId } });
    if (!term) {
      term = await prisma.term.create({ data: { name: t.name, schoolId } });
    }
    
    // Add evaluations
    for (const ev of t.evaluations) {
      const evExists = await prisma.evaluation.findFirst({ where: { name: ev.name, termId: term.id } });
      if (!evExists) {
        await prisma.evaluation.create({
          data: {
            name: ev.name,
            type: ev.type as any,
            termId: term.id,
            schoolId
          }
        });
      }
    }
  }
  console.log("Terms and Evaluations seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
