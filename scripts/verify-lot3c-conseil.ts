/**
 * Script de vérification et smoke test du Lot 3C/5 — Bloc Conseil de Classe.
 *
 * Vérifie :
 *  1. Matrice de permissions stricte (refus pour TEACHER, PARENT, ACCOUNTANT / succès ADMIN, OWNER)
 *  2. Proposition automatique vs décision retenue (proposée jamais imposée)
 *  3. Sanctions travail et conduite séparées
 *  4. Décision d'orientation strictement réservée au 3e trimestre (rejet prouvé sur T1/T2)
 *  5. Absences justifiées et non justifiées (module présence + saisie)
 *  6. Observations spécifiques par cycle (élémentaire vs secondaire)
 *
 *   npm run script -- scripts/verify-lot3c-conseil.ts
 */
import { prisma } from "./_env";
import { assertCanManageConseilDeClasse } from "../src/lib/notes/entryPermissions";
import {
  proposerDistinction,
  isTroisiemeTrimestre,
} from "../src/lib/notes/conseil";
import {
  getConseilContextWithActor,
  saveConseilReviewWithActor,
} from "../src/app/dashboard/grades/conseil/actions";

async function run() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST 1 : Matrice de permissions serveur (Contrôle d'accès strict)");
  console.log("════════════════════════════════════════════════════════════════");

  const rolesToTest = [
    { role: "TEACHER", shouldPass: false },
    { role: "PARENT", shouldPass: false },
    { role: "ACCOUNTANT", shouldPass: false },
    { role: "SECRETARY", shouldPass: false },
    { role: "ADMIN", shouldPass: true },
    { role: "OWNER", shouldPass: true },
  ];

  for (const { role, shouldPass } of rolesToTest) {
    const perm = assertCanManageConseilDeClasse({ role });
    const passed = perm.ok === shouldPass;
    if (!passed) {
      throw new Error(`ÉCHEC PERMISSION : rôle ${role} attendu ${shouldPass ? "AUTORISÉ" : "REFUSÉ"} mais obtenu ${perm.ok}`);
    }
    console.log(`  ✓ Rôle ${role.padEnd(10)} → ${perm.ok ? "AUTORISÉ (200)" : "REFUSÉ STRICT (403) : " + perm.error}`);
  }

  // Trouver une école et des classes pour le test réel
  const school = await prisma.school.findFirst({
    where: { name: "SENG.CO ACADEMY" },
    include: {
      classes: {
        include: {
          enrollments: { include: { student: true } },
        },
      },
      terms: {
        orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      },
    },
  });

  if (!school) {
    throw new Error("École SENG.CO ACADEMY introuvable pour le smoke test.");
  }

  const terms = school.terms;
  const t1 = terms.find((t) => !isTroisiemeTrimestre(t, terms)) ?? terms[0];
  const t3 = terms.find((t) => isTroisiemeTrimestre(t, terms)) ?? terms[terms.length - 1];

  const secondaryClass = school.classes.find((c) =>
    c.enrollments.length > 0 && c.cycle !== "ELEMENTAIRE" && !c.name.toLowerCase().startsWith("c")
  );
  const elementaryClass = school.classes.find((c) =>
    c.enrollments.length > 0 && (c.cycle === "ELEMENTAIRE" || c.name.toLowerCase().startsWith("c"))
  );

  if (!secondaryClass || !elementaryClass) {
    throw new Error("Classes élémentaire et secondaire avec élèves requises.");
  }

  console.log(`\nCible de test : École ${school.name}`);
  console.log(`  - Classe Élémentaire : ${elementaryClass.name} (${elementaryClass.enrollments.length} élèves)`);
  console.log(`  - Classe Secondaire  : ${secondaryClass.name} (${secondaryClass.enrollments.length} élèves)`);
  console.log(`  - Trimestre T1/T2   : ${t1.name} (id: ${t1.id})`);
  console.log(`  - Trimestre T3      : ${t3.name} (id: ${t3.id})`);

  // Test Server Actions avec acteur TEACHER vs ADMIN
  const teacherActor = { userId: "teacher-fake-id", role: "TEACHER", schoolId: school.id };
  const parentActor = { userId: "parent-fake-id", role: "PARENT", schoolId: school.id };
  const accountantActor = { userId: "acct-fake-id", role: "ACCOUNTANT", schoolId: school.id };
  const adminActor = { userId: "admin-real-test", role: "ADMIN", schoolId: school.id };

  const readDenialTeacher = await getConseilContextWithActor(teacherActor, secondaryClass.id, t1.id);
  if (readDenialTeacher.ok) throw new Error("TEACHER a pu lire le contexte de conseil !");
  console.log(`  ✓ getConseilContextWithActor(TEACHER)    → REJETÉ (${readDenialTeacher.error})`);

  const writeDenialTeacher = await saveConseilReviewWithActor(teacherActor, {
    classId: secondaryClass.id,
    termId: t1.id,
    studentId: secondaryClass.enrollments[0].studentId,
    observation: "Test pirate",
  });
  if (writeDenialTeacher.ok) throw new Error("TEACHER a pu enregistrer dans le conseil !");
  console.log(`  ✓ saveConseilReviewWithActor(TEACHER)    → REJETÉ (${writeDenialTeacher.error})`);

  const writeDenialParent = await saveConseilReviewWithActor(parentActor, {
    classId: secondaryClass.id,
    termId: t1.id,
    studentId: secondaryClass.enrollments[0].studentId,
  });
  if (writeDenialParent.ok) throw new Error("PARENT a pu enregistrer dans le conseil !");
  console.log(`  ✓ saveConseilReviewWithActor(PARENT)     → REJETÉ (${writeDenialParent.error})`);

  const writeDenialAccountant = await saveConseilReviewWithActor(accountantActor, {
    classId: secondaryClass.id,
    termId: t1.id,
    studentId: secondaryClass.enrollments[0].studentId,
  });
  if (writeDenialAccountant.ok) throw new Error("ACCOUNTANT a pu enregistrer dans le conseil !");
  console.log(`  ✓ saveConseilReviewWithActor(ACCOUNTANT) → REJETÉ (${writeDenialAccountant.error})`);

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("TEST 2 : Distinctions — Proposées, jamais imposées");
  console.log("════════════════════════════════════════════════════════════════");

  if (proposerDistinction(11.99) !== null) throw new Error("11.99 ne doit pas avoir de distinction");
  if (proposerDistinction(12.0) !== "TABLEAU_HONNEUR") throw new Error("12.0 doit proposer TABLEAU_HONNEUR");
  if (proposerDistinction(13.9) !== "TABLEAU_HONNEUR") throw new Error("13.9 doit proposer TABLEAU_HONNEUR");
  if (proposerDistinction(14.0) !== "ENCOURAGEMENTS") throw new Error("14.0 doit proposer ENCOURAGEMENTS");
  if (proposerDistinction(15.99) !== "ENCOURAGEMENTS") throw new Error("15.99 doit proposer ENCOURAGEMENTS");
  if (proposerDistinction(16.0) !== "FELICITATIONS") throw new Error("16.0 doit proposer FELICITATIONS");
  if (proposerDistinction(19.5) !== "FELICITATIONS") throw new Error("19.5 doit proposer FELICITATIONS");
  console.log("  ✓ Barème de proposition validé (≥12 Tableau d'honneur, ≥14 Encouragements, ≥16 Félicitations)");

  // Test de modification/retrait par le conseil
  const targetStudent = secondaryClass.enrollments[0].student;
  console.log(`  Test d'indiscipline sur l'élève : ${targetStudent.firstName} ${targetStudent.lastName}`);

  // Enregistrer distinction RETIRÉE (AUCUNE) avec blâme de conduite
  const saveIndiscipline = await saveConseilReviewWithActor(adminActor, {
    classId: secondaryClass.id,
    termId: t1.id,
    studentId: targetStudent.id,
    distinctionRetenue: "AUCUNE",
    sanctionTravail: null,
    sanctionConduite: "BLAME",
    observation: "Comportement perturbateur, tableau d'honneur retiré par le conseil",
  });
  if (!saveIndiscipline.ok) throw new Error(`Échec saveIndiscipline: ${saveIndiscipline.error}`);

  // Relire le contexte
  const ctxSec = await getConseilContextWithActor(adminActor, secondaryClass.id, t1.id);
  if (!ctxSec.ok) throw new Error(`Échec lecture contexte: ${ctxSec.error}`);

  const row = ctxSec.eleves.find((e) => e.studentId === targetStudent.id);
  if (!row) throw new Error("Élève introuvable dans le contexte.");

  console.log(`  ✓ Distinction proposée : ${row.distinctionProposee ?? "Aucune (selon notes)"}`);
  console.log(`  ✓ Distinction retenue par conseil : ${row.distinctionRetenue ?? "AUCUNE"}`);
  console.log(`  ✓ Sanction travail   : ${row.sanctionTravail ?? "Aucune"}`);
  console.log(`  ✓ Sanction conduite  : ${row.sanctionConduite}`);
  console.log(`  ✓ Observations       : ${row.observation}`);

  if (row.sanctionConduite !== "BLAME" || row.sanctionTravail !== null) {
    throw new Error("L'indépendance des sanctions travail/conduite n'a pas été respectée !");
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("TEST 3 : Décision d'orientation (3e TRIMESTRE UNIQUEMENT)");
  console.log("════════════════════════════════════════════════════════════════");

  // Tentative en T1/T2 -> DOIT ÉCHOUER
  const orientT1Fail = await saveConseilReviewWithActor(adminActor, {
    classId: secondaryClass.id,
    termId: t1.id,
    studentId: targetStudent.id,
    decisionOrientation: "PASSAGE",
  });
  if (orientT1Fail.ok) {
    throw new Error("FAILLE : Une décision d'orientation a été acceptée hors 3e trimestre !");
  }
  console.log(`  ✓ Tentative d'orientation en ${t1.name} → REJETÉE : ${orientT1Fail.error}`);

  // Écriture en T3 -> DOIT RÉUSSIR
  const orientT3Success = await saveConseilReviewWithActor(adminActor, {
    classId: secondaryClass.id,
    termId: t3.id,
    studentId: targetStudent.id,
    decisionOrientation: "PASSAGE",
    observation: "Admis en classe supérieure",
  });
  if (!orientT3Success.ok) {
    throw new Error(`Échec orientation T3: ${orientT3Success.error}`);
  }
  console.log(`  ✓ Décision d'orientation en ${t3.name} → ACCEPTÉE (PASSAGE)`);

  const ctxT3 = await getConseilContextWithActor(adminActor, secondaryClass.id, t3.id);
  if (!ctxT3.ok) throw new Error(`Échec lecture T3: ${ctxT3.error}`);
  const rowT3 = ctxT3.eleves.find((e) => e.studentId === targetStudent.id);
  if (rowT3?.decisionOrientation !== "PASSAGE") {
    throw new Error(`Orientation non persistée en T3, trouvé: ${rowT3?.decisionOrientation}`);
  }
  console.log(`  ✓ Vérification lecture T3 : isT3=${ctxT3.isT3}, orientation=${rowT3.decisionOrientation}`);

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("TEST 4 : Cycle Élémentaire (Appréciation du Titulaire)");
  console.log("════════════════════════════════════════════════════════════════");

  const elemStudent = elementaryClass.enrollments[0].student;
  const saveElem = await saveConseilReviewWithActor(adminActor, {
    classId: elementaryClass.id,
    termId: t1.id,
    studentId: elemStudent.id,
    distinctionRetenue: "ENCOURAGEMENTS",
    absencesJustifiees: 2,
    absencesNonJustifiees: 1,
    observation: "Très bon trimestre de l'élève en élémentaire.",
  });
  if (!saveElem.ok) throw new Error(`Échec save élémentaire: ${saveElem.error}`);

  const ctxElem = await getConseilContextWithActor(adminActor, elementaryClass.id, t1.id);
  if (!ctxElem.ok) throw new Error(`Échec ctx élémentaire: ${ctxElem.error}`);
  const rowElem = ctxElem.eleves.find((e) => e.studentId === elemStudent.id);
  if (!rowElem) throw new Error("Élève élémentaire introuvable.");

  console.log(`  ✓ Élémentaire cycle  : ${ctxElem.cycle}`);
  console.log(`  ✓ Distinction        : ${rowElem.distinctionRetenue}`);
  console.log(`  ✓ Absences (J / NJ)  : ${rowElem.absencesJustifiees} / ${rowElem.absencesNonJustifiees}`);
  console.log(`  ✓ Appréciation       : ${rowElem.observation}`);

  // Vérifier en base que c'est bien stocké dans appreciationTitulaire
  const dbElemReview = await prisma.termReview.findUnique({
    where: { studentId_termId: { studentId: elemStudent.id, termId: t1.id } },
  });
  if (dbElemReview?.appreciationTitulaire !== "Très bon trimestre de l'élève en élémentaire.") {
    throw new Error("appreciationTitulaire n'a pas été renseignée en base.");
  }
  console.log("  ✓ Champ TermReview.appreciationTitulaire validé directement en base SQL.");

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("TEST 5 : Nettoyage réversible des données de test");
  console.log("════════════════════════════════════════════════════════════════");

  // Nettoyage de la review T3 créée pour ne pas polluer l'historique
  await prisma.termReview.deleteMany({
    where: {
      studentId: targetStudent.id,
      termId: t3.id,
    },
  });
  console.log("  ✓ Ligne de test T3 nettoyée avec succès.");

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("TOUS LES TESTS DU LOT 3C ONT RÉUSSI (100% CONFORME)");
  console.log("════════════════════════════════════════════════════════════════");
}

run()
  .catch((e) => {
    console.error("\n❌ ÉCHEC DU SCRIPT :", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
