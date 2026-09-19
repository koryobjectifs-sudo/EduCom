import { prisma } from "./_env";
import fs from "fs";
import path from "path";

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
  console.log("=== CRÉATION D'UNE SAUVEGARDE COMPLÈTE AVANT NETTOYAGE ===");

  const allSchools = await prisma.school.findMany({
    include: {
      users: true,
      classes: true,
      students: true,
    },
  });

  const testSchools = allSchools.filter((s) => {
    if (PRESERVED_SCHOOL_NAMES.some((preserved) => s.name.toLowerCase().includes(preserved.toLowerCase()))) {
      return false;
    }
    const isExplicitTest =
      s.name.includes("SMOKETEST") ||
      s.name.includes("École de Démo") ||
      s.name.includes("Test Admissions") ||
      s.name.includes("TEST FLOW") ||
      s.name === "Test" ||
      s.name === "École en configuration";

    const isFuzzingTest = s.students.length === 0 && s.classes.length === 0 && s.name.length <= 12 && !s.name.includes(" ");
    return isExplicitTest || isFuzzingTest;
  });

  const testStudents = await prisma.student.findMany({
    where: {
      OR: [
        { lastName: { startsWith: "TEST_" } },
        { firstName: { startsWith: "TEST_" } },
        { matricule: { startsWith: "TEST_" } },
      ],
    },
    include: {
      enrollments: true,
      grades: true,
    },
  });

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "prof.maths.test@" } },
        { email: { contains: "@sonde.invalid" } },
        { email: { startsWith: "testparent" } },
        { email: { contains: "audit-test@" } },
      ],
    },
  });

  const backupData = {
    timestamp: new Date().toISOString(),
    preservedSchools: allSchools
      .filter((s) => PRESERVED_SCHOOL_NAMES.some((p) => s.name.toLowerCase().includes(p.toLowerCase())))
      .map((s) => ({ id: s.id, name: s.name, studentsCount: s.students.length, usersCount: s.users.length, classesCount: s.classes.length })),
    testSchoolsCount: testSchools.length,
    testStudentsCount: testStudents.length,
    testUsersCount: testUsers.length,
    testSchools,
    testStudents,
    testUsers,
  };

  const backupPath = path.join(process.cwd(), "scripts", "backups", `backup_test_data_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf-8");

  console.log(`✅ Sauvegarde écrite avec succès dans : ${backupPath}`);
  console.log(`   - ${testSchools.length} écoles de test sauvegardées`);
  console.log(`   - ${testStudents.length} élèves TEST_ sauvegardés`);
  console.log(`   - ${testUsers.length} utilisateurs de test sauvegardés`);
  console.log(`   - ${backupData.preservedSchools.length} écoles réelles vérifiées et exclues du nettoyage.`);
}

main().catch((err) => {
  console.error("Erreur sauvegarde :", err);
  process.exit(1);
});
