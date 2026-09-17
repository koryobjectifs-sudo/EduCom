/**
 * Rattrapage des classes sans matières du système — lot 18 / urgence matières.
 *
 * Règles appliquées :
 *   - 6e et 5e     → Français, Maths, Hist-Géo, Anglais, SVT, EPS (ni PC, ni LV2)
 *   - 4e et 3e     → les précédentes + Physique-Chimie + LV2
 *   - Seconde L/S  → leurs grilles propres
 *   - 1ère et Tle  → par séries L1, L2, S1, S2
 *   - Élémentaire  → domaines et sous-disciplines officiels (pas de ClassSubject)
 *
 * Essai à blanc par défaut.
 *   npm run script -- scripts/catchup-class-subjects.ts          -> essai à blanc
 *   APPLY=1 npm run script -- scripts/catchup-class-subjects.ts  -> écrit en base
 */
import { prisma } from "./_env";
import { APPLY } from "./_cible";
import { attachCurriculumSubjectsToClass, getSubjectCodesForClass } from "../src/lib/notes/class-subjects";

async function main() {
  console.log("═".repeat(70));
  console.log("  RATTRAPAGE DES CLASSES SANS MATIÈRE");
  console.log("═".repeat(70));

  const classes = await prisma.class.findMany({
    include: {
      school: { select: { id: true, name: true } },
      subjects: { include: { subject: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
  });

  const moyenSecClasses = classes.filter(
    (c) => c.cycle === "MOYEN" || c.cycle === "SECONDAIRE",
  );

  const sansMatieresAvant = moyenSecClasses.filter((c) => c.subjects.length === 0);

  console.log(`\nÉtat avant rattrapage :`);
  console.log(`  Classes Collège & Lycée total : ${moyenSecClasses.length}`);
  console.log(`  Classes avec matières        : ${moyenSecClasses.length - sansMatieresAvant.length}`);
  console.log(`  Classes SANS matière         : ${sansMatieresAvant.length}\n`);

  if (sansMatieresAvant.length > 0) {
    console.log("Détail des classes sans matière identifiées :");
    for (const c of sansMatieresAvant) {
      const attendues = getSubjectCodesForClass({
        cycle: c.cycle,
        className: c.name,
        serie: c.serie,
      });
      console.log(`  - [${c.school.name}] ${c.name} (${c.cycle}, série: ${c.serie || "aucun"}) → attendu: ${attendues.join(", ")}`);
    }
  }

  let totalRattachees = 0;

  for (const c of sansMatieresAvant) {
    if (APPLY) {
      const res = await attachCurriculumSubjectsToClass(c.id, prisma as never);
      totalRattachees += res.attached;
      console.log(`  ✓ [${c.school.name}] ${c.name} : ${res.attached} matière(s) rattachée(s) [${res.codes.join(", ")}]`);
    } else {
      const codes = getSubjectCodesForClass({
        cycle: c.cycle,
        className: c.name,
        serie: c.serie,
      });
      console.log(`  [SIMULATION] [${c.school.name}] ${c.name} : ${codes.length} matière(s) à rattacher [${codes.join(", ")}]`);
    }
  }

  // Vérification après rattrapage
  const classesApres = await prisma.class.findMany({
    where: {
      cycle: { in: ["MOYEN", "SECONDAIRE"] },
    },
    include: {
      subjects: true,
      school: { select: { name: true } },
    },
  });

  const sansMatieresApres = classesApres.filter((c) => c.subjects.length === 0);

  console.log("\n" + "═".repeat(70));
  console.log(`Bilan ${APPLY ? "réel (base écrite)" : "simulation"}`);
  console.log(`  Classes Moyen/Secondaire sans matière AVANT : ${sansMatieresAvant.length}`);
  console.log(`  Classes Moyen/Secondaire sans matière APRÈS : ${sansMatieresApres.length}`);
  console.log("═".repeat(70));

  if (!APPLY) {
    console.log("\nEssai à blanc : aucune modification en base. Lance avec APPLY=1 pour exécuter.");
  } else {
    if (sansMatieresApres.length === 0) {
      console.log("\n✅ SUCCÈS : AUCUNE classe du secondaire ou du moyen n'est sans matière !");
    } else {
      console.error(`\n⚠️ ATTENTION : Il reste ${sansMatieresApres.length} classe(s) sans matière !`);
    }
  }
}

main()
  .catch((e) => {
    console.error("ÉCHEC :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
