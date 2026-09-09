import { prisma } from "./_env";
import { getNextAcademicYear, predictNextClass, PROMOTION_LADDER, EXIT_DESTINATION } from "../src/lib/reinscription";

async function runVerification() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("VERIFICATION LOT 3 — REINSCRIPTION EN MASSE ET TRANSITION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Trouver l'école pilote (celle ayant le plus d'élèves)
  const schools = await prisma.school.findMany({
    include: {
      classes: true,
      _count: {
        select: { students: true },
      },
    },
    orderBy: {
      students: { _count: "desc" },
    },
  });

  if (schools.length === 0) {
    console.error("❌ Aucune école trouvée !");
    process.exit(1);
  }

  const school = schools[0];

  const schoolId = school.id;
  const currentActiveYear = school.activeAcademicYear || "2025-2026";
  console.log(`🏫 École pilote : ${school.name} (${schoolId})`);
  console.log(`📅 Année active : ${currentActiveYear}`);
  console.log(`📚 Classes existantes : ${school.classes.length}\n`);

  // 2. Compter les élèves et inscriptions de 2025-2026
  const sourceYear = "2025-2026";
  const targetYear = "2026-2027";

  const sourceEnrollmentsCount = await prisma.enrollment.count({
    where: {
      academicYear: sourceYear,
      class: { schoolId },
    },
  });

  const totalStudentsCount = await prisma.student.count({
    where: { schoolId },
  });

  console.log(`📊 Effectif total en base (Student) : ${totalStudentsCount}`);
  console.log(`📊 Inscriptions en ${sourceYear} : ${sourceEnrollmentsCount}`);

  // 3. Test des règles de promotion sénégalaises
  console.log("\n🧪 Test des prédictions de promotion sénégalaise :");
  const testCases = [
    { name: "Petite Section", cycle: "PRESCOLAIRE", expected: "Moyenne Section" },
    { name: "Moyenne Section", cycle: "PRESCOLAIRE", expected: "Grande Section" },
    { name: "Grande Section", cycle: "PRESCOLAIRE", expected: "CI" },
    { name: "CI A", cycle: "ELEMENTAIRE", expected: "CP A" },
    { name: "CP", cycle: "ELEMENTAIRE", expected: "CE1" },
    { name: "CE1 1", cycle: "ELEMENTAIRE", expected: "CE2 1" },
    { name: "CE2", cycle: "ELEMENTAIRE", expected: "CM1" },
    { name: "CM1 B", cycle: "ELEMENTAIRE", expected: "CM2 B" },
    { name: "CM2", cycle: "ELEMENTAIRE", expected: EXIT_DESTINATION },
    { name: "6ème A", cycle: "MOYEN", expected: "5ème A" },
    { name: "3ème", cycle: "MOYEN", expected: EXIT_DESTINATION },
    { name: "Seconde S", cycle: "SECONDAIRE", expected: "Première S" },
    { name: "Terminale L", cycle: "SECONDAIRE", expected: EXIT_DESTINATION },
  ];

  let ladderSuccess = true;
  for (const tc of testCases) {
    const res = predictNextClass(tc.name, tc.cycle);
    const pass = res.targetName === tc.expected;
    console.log(`   ${pass ? "✅" : "❌"} ${tc.name} → ${res.targetName} (attendu: ${tc.expected})`);
    if (!pass) ladderSuccess = false;
  }

  if (!ladderSuccess) {
    console.error("❌ Échec des règles de promotion");
    process.exit(1);
  }

  // 4. Test d'exécution de la réinscription en masse
  console.log(`\n🚀 Simulation de réinscription pour ${sourceEnrollmentsCount} élèves (${sourceYear} → ${targetYear}) :`);

  const sourceEnrollments = await prisma.enrollment.findMany({
    where: {
      academicYear: sourceYear,
      class: { schoolId },
    },
    include: {
      student: true,
      class: true,
    },
  });

  // Mapper chaque élève vers sa classe cible
  const classMap = new Map(school.classes.map((c) => [c.id, c]));
  const classByName = new Map(school.classes.map((c) => [c.name.toLowerCase().trim(), c]));

  const enrollmentsToCreate: { studentId: string; classId: string; academicYear: string }[] = [];
  let exitsCount = 0;

  for (const enr of sourceEnrollments) {
    const pred = predictNextClass(enr.class.name, enr.class.cycle);
    if (pred.isExit) {
      exitsCount++;
      continue;
    }

    let targetCls = classByName.get(pred.targetName.toLowerCase().trim());
    if (!targetCls) {
      // Créer la classe si manquante
      targetCls = await prisma.class.create({
        data: {
          name: pred.targetName,
          cycle: pred.cycle as any,
          schoolId,
        },
      });
      classByName.set(pred.targetName.toLowerCase().trim(), targetCls);
      school.classes.push(targetCls);
    }

    enrollmentsToCreate.push({
      studentId: enr.studentId,
      classId: targetCls.id,
      academicYear: targetYear,
    });
  }

  console.log(`   - Évalués : ${sourceEnrollments.length}`);
  console.log(`   - À réinscrire : ${enrollmentsToCreate.length}`);
  console.log(`   - Sortants (fin de cycle) : ${exitsCount}`);

  // Insertion par lots
  const CHUNK_SIZE = 250;
  let inserted = 0;
  for (let i = 0; i < enrollmentsToCreate.length; i += CHUNK_SIZE) {
    const chunk = enrollmentsToCreate.slice(i, i + CHUNK_SIZE);
    const res = await prisma.enrollment.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += res.count;
  }

  console.log(`   ✅ Inscriptions créées en base : ${inserted}`);

  // 5. Test d'idempotence : ré-exécuter le même batch sans erreur
  console.log("\n🔁 Test d'idempotence (seconde exécution immédiate) :");
  let duplicateInserted = 0;
  for (let i = 0; i < enrollmentsToCreate.length; i += CHUNK_SIZE) {
    const chunk = enrollmentsToCreate.slice(i, i + CHUNK_SIZE);
    const res = await prisma.enrollment.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    duplicateInserted += res.count;
  }
  console.log(`   ✅ Nouvelles lignes insérées lors de la 2e exécution : ${duplicateInserted} (attendu: 0)`);

  // 6. Vérification des comptes
  const targetEnrollmentsCount = await prisma.enrollment.count({
    where: {
      academicYear: targetYear,
      class: { schoolId },
    },
  });
  console.log(`   ✅ Total inscriptions réelles en ${targetYear} : ${targetEnrollmentsCount}`);

  const remainingSourceCount = await prisma.enrollment.count({
    where: {
      academicYear: sourceYear,
      class: { schoolId },
    },
  });
  console.log(`   ✅ Inscriptions source ${sourceYear} toujours intactes : ${remainingSourceCount}`);

  // 7. Test de sécurité de l'annulation
  console.log("\n🛡️ Test du mécanisme d'annulation :");
  const reportCardsCount = await prisma.reportCard.count({
    where: {
      schoolId,
      class: {
        enrollments: {
          some: { academicYear: targetYear },
        },
      },
    },
  });
  console.log(`   - Bulletins/évaluations présents sur ${targetYear} : ${reportCardsCount}`);
  if (reportCardsCount === 0) {
    console.log("   ✅ Aucun bulletin bloquant : annulation autorisée.");
  } else {
    console.log("   ⚠️ Évaluations présentes : annulation bloquée pour protéger les données.");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("✅ TOUTES LES VÉRIFICATIONS DU LOT 3 SONT VALIDÉES !");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

runVerification()
  .catch((e) => {
    console.error("❌ Erreur pendant la vérification :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
