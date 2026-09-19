import { prisma } from "./_env";

// Écoles légitimes à NE JAMAIS supprimer
const PRESERVED_SCHOOL_NAMES = [
  "SENG.CO ACADEMY",
  "SAINT JEAN PAUL INSTITUT",
  "Queen School",
  "Group Scolaire Kory",
  "Mbin Waly Senghor",
  "Ecole primaire Sainte Bernadette",
  "École primaire Sainte Bernadette",
];

async function main() {
  const isApply = process.env.APPLY === "1";

  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log(`   AUDIT ET NETTOYAGE DES DONNÉES DE TEST EN PRODUCTION`);
  console.log(`   Mode : ${isApply ? "⚠️ APPLICATION RÉELLE (APPLY=1)" : "🔍 SIMULATION SÉCURISÉE (DRY-RUN)"}`);
  console.log("═══════════════════════════════════════════════════════════════════════════\n");

  // 1. Écoles de test
  const allSchools = await prisma.school.findMany({
    select: { id: true, name: true, createdAt: true, _count: { select: { students: true, users: true, classes: true } } },
  });

  const testSchools = allSchools.filter((s) => {
    // Si l'école est dans la liste préservée, on ne touche jamais
    if (PRESERVED_SCHOOL_NAMES.some((preserved) => s.name.toLowerCase().includes(preserved.toLowerCase()))) {
      return false;
    }
    // Critères d'écoles de test :
    const isExplicitTest =
      s.name.includes("SMOKETEST") ||
      s.name.includes("École de Démo") ||
      s.name.includes("Test Admissions") ||
      s.name.includes("TEST FLOW") ||
      s.name === "Test" ||
      s.name === "École en configuration";

    // Écoles générées par fuzzing E2E (0 élèves, nom aléatoire, 1-2 users max)
    const isFuzzingTest = s._count.students === 0 && s._count.classes === 0 && s.name.length <= 12 && !s.name.includes(" ");

    return isExplicitTest || isFuzzingTest;
  });

  console.log(`[1] ÉCOLES DE TEST IDENTIFIÉES : ${testSchools.length} école(s)`);
  testSchools.slice(0, 10).forEach((s) => {
    console.log(`    - [${s.id}] "${s.name}" (${s._count.students} élèves, ${s._count.users} users, ${s._count.classes} classes)`);
  });
  if (testSchools.length > 10) console.log(`    ... et ${testSchools.length - 10} autres écoles de test.`);

  // 2. Élèves de test préfixés TEST_ (notamment dans SENG.CO)
  const testStudents = await prisma.student.findMany({
    where: {
      OR: [
        { lastName: { startsWith: "TEST_" } },
        { firstName: { startsWith: "TEST_" } },
        { matricule: { startsWith: "TEST_" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, school: { select: { name: true } } },
  });

  console.log(`\n[2] ÉLÈVES DE TEST IDENTIFIÉS : ${testStudents.length} élève(s)`);
  testStudents.slice(0, 5).forEach((st) => {
    console.log(`    - [${st.id}] ${st.firstName} ${st.lastName} (École : ${st.school.name})`);
  });
  if (testStudents.length > 5) console.log(`    ... et ${testStudents.length - 5} autres élèves TEST_.`);

  // 3. Comptes utilisateurs de test
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "prof.maths.test@" } },
        { email: { contains: "@sonde.invalid" } },
        { email: { startsWith: "testparent" } },
        { email: { contains: "audit-test@" } },
      ],
    },
    select: { id: true, email: true, role: true, school: { select: { name: true } } },
  });

  console.log(`\n[3] UTILISATEURS DE TEST IDENTIFIÉS : ${testUsers.length} compte(s)`);
  testUsers.slice(0, 5).forEach((u) => {
    console.log(`    - [${u.id}] ${u.email} (${u.role}) (École : ${u.school.name})`);
  });
  if (testUsers.length > 5) console.log(`    ... et ${testUsers.length - 5} autres comptes.`);

  // 4. Classes de démo / test
  const testClasses = await prisma.class.findMany({
    where: {
      OR: [
        { isDemo: true },
        { name: { contains: "Test" } },
      ],
    },
    select: { id: true, name: true, school: { select: { name: true } } },
  });
  console.log(`\n[4] CLASSES DE TEST / DÉMO IDENTIFIÉES : ${testClasses.length} classe(s)`);

  if (!isApply) {
    console.log("\n───────────────────────────────────────────────────────────────────────────");
    console.log("ℹ️  MODE SIMULATION (DRY-RUN) : AUCUNE MODIFICATION EFFECTUÉE EN BASE.");
    console.log("    Pour appliquer ce nettoyage de manière définitive :");
    console.log("    👉 APPLY=1 npm run script -- scripts/cleanup-test-data.ts");
    console.log("───────────────────────────────────────────────────────────────────────────\n");
    return;
  }

  // EXÉCUTION RÉELLE
  console.log("\n⏳ DÉBUT DU NETTOYAGE RÉEL EN BASE...");

  // A. Supprimer élèves TEST_ et leurs liaisons (Cascade gère Enrollments et Grades)
  const studentIds = testStudents.map((s) => s.id);
  if (studentIds.length > 0) {
    const delGrades = await prisma.grade.deleteMany({ where: { studentId: { in: studentIds } } });
    const delEnrollments = await prisma.enrollment.deleteMany({ where: { studentId: { in: studentIds } } });
    const delStudents = await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    console.log(`✓ ${delStudents.count} élèves TEST_ supprimés (${delEnrollments.count} inscriptions, ${delGrades.count} notes nettoyées).`);
  }

  // B. Supprimer utilisateurs de test
  const userIds = testUsers.map((u) => u.id);
  if (userIds.length > 0) {
    await prisma.teachingAssignment.deleteMany({ where: { teacherId: { in: userIds } } });
    const delUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`✓ ${delUsers.count} comptes de test supprimés.`);
  }

  // C. Supprimer écoles de test
  const schoolIds = testSchools.map((s) => s.id);
  if (schoolIds.length > 0) {
    const delSchools = await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
    console.log(`✓ ${delSchools.count} écoles de test supprimées.`);
  }

  console.log("\n🎉 NETTOYAGE TERMINÉ AVEC SUCCÈS.");
}

main().catch((err) => {
  console.error("Erreur lors du nettoyage :", err);
  process.exit(1);
});
