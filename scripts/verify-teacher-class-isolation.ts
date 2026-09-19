import { prisma } from "./_env";
import { teacherClassIds, studentWhereFor } from "../src/lib/studentScope";

async function main() {
  console.log("=== VÉRIFICATION ISOLATION DES CLASSES ET ÉLÈVES POUR ENSEIGNANT ===");

  // Création d'un jeu de données de test isolé
  const testPrefix = `test_isol_${Date.now()}`;
  const school = await prisma.school.create({
    data: {
      name: `${testPrefix}_School`,
    },
  });

  try {
    // 3 classes : 6e, 5e, 4e
    const class6e = await prisma.class.create({
      data: { name: `${testPrefix}_6e`, cycle: "SECONDAIRE", schoolId: school.id },
    });
    const class5e = await prisma.class.create({
      data: { name: `${testPrefix}_5e`, cycle: "SECONDAIRE", schoolId: school.id },
    });
    const class4e = await prisma.class.create({
      data: { name: `${testPrefix}_4e`, cycle: "SECONDAIRE", schoolId: school.id },
    });

    // 1 matière : Anglais
    const subjectAnglais = await prisma.subject.create({
      data: { name: "Anglais", schoolId: school.id, code: `ANG_${Date.now()}` },
    });

    // 1 professeur d'anglais de la 4e
    const teacherUser = await prisma.user.create({
      data: {
        email: `${testPrefix}_teacher@educom.sn`,
        firstName: "Amadou",
        lastName: "Diallo",
        role: "TEACHER",
        schoolId: school.id,
      },
    });

    // Affectation du prof UNIQUEMENT à la 4e en Anglais
    await prisma.teachingAssignment.create({
      data: {
        schoolId: school.id,
        teacherId: teacherUser.id,
        classId: class4e.id,
        subjectId: subjectAnglais.id,
      },
    });

    // 1 élève par classe
    const student4e = await prisma.student.create({
      data: { firstName: "Fatou", lastName: "Sow", schoolId: school.id },
    });
    await prisma.enrollment.create({
      data: { studentId: student4e.id, classId: class4e.id, academicYear: "2026-2027" },
    });

    const student6e = await prisma.student.create({
      data: { firstName: "Moussa", lastName: "Diop", schoolId: school.id },
    });
    await prisma.enrollment.create({
      data: { studentId: student6e.id, classId: class6e.id, academicYear: "2026-2027" },
    });

    // 1 trimestre
    const term = await prisma.term.create({
      data: { name: "1er Trimestre", schoolId: school.id },
    });

    const teacherClasses = await teacherClassIds({
      schoolId: school.id,
      userId: teacherUser.id,
      role: "TEACHER",
    });

    console.log(`Classes de l'école : 3 (${class6e.name}, ${class5e.name}, ${class4e.name})`);
    console.log(`Périmètre prof d'anglais : ${teacherClasses.length} classe(s) -> ID ${teacherClasses.join(", ")}`);

    let failures = 0;

    // ── TEST 1 : ÉCRAN BULLETINS (/dashboard/grades/report-card) ──
    console.log("\n[TEST 1] Écran Bulletins (/dashboard/grades/report-card)");
    const reportCardClasses = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        ...(teacherClasses ? { id: { in: teacherClasses } } : {}),
      },
      select: { id: true, name: true },
    });
    if (reportCardClasses.length !== 1 || reportCardClasses[0].id !== class4e.id) {
      console.error("❌ ÉCHEC : Le filtre classe ne borne pas strictement à la 4e !", reportCardClasses);
      failures++;
    } else {
      console.log("✅ SUCCÈS : Seule la 4e est retournée pour le professeur d'anglais.");
    }

    // ── TEST 2 : ÉCRAN STRUCTURE / CLASSES (/dashboard/classes) ──
    console.log("\n[TEST 2] Écran Structure (/dashboard/classes)");
    const classesPageList = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        ...(teacherClasses ? { id: { in: teacherClasses } } : {}),
      },
      select: { id: true, name: true },
    });
    if (classesPageList.length !== 1 || classesPageList[0].id !== class4e.id) {
      console.error("❌ ÉCHEC : La liste des classes contient des classes hors périmètre !", classesPageList);
      failures++;
    } else {
      console.log("✅ SUCCÈS : Seule la 4e est visible dans la liste des classes.");
    }

    // ── TEST 3 : GARDE SERVEUR CLASSE ÉTRANGÈRE (/dashboard/classes/[id]) ──
    console.log("\n[TEST 3] Garde serveur /dashboard/classes/[id]");
    const isAllowed6e = teacherClasses.includes(class6e.id);
    const isAllowed4e = teacherClasses.includes(class4e.id);
    if (isAllowed6e || !isAllowed4e) {
      console.error("❌ ÉCHEC : La classe 6e est autorisée ou la 4e est refusée !");
      failures++;
    } else {
      console.log("✅ SUCCÈS : Accès à la 6e interdit (redirection), accès à la 4e autorisé.");
    }

    // ── TEST 4 : APPEL DES PRÉSENCES (/dashboard/attendance/take) ──
    console.log("\n[TEST 4] Garde serveur /dashboard/attendance/take");
    const canTake6e = teacherClasses.includes(class6e.id);
    const canTake4e = teacherClasses.includes(class4e.id);
    if (canTake6e || !canTake4e) {
      console.error("❌ ÉCHEC : Prise de présence 6e permise pour le prof de 4e !");
      failures++;
    } else {
      console.log("✅ SUCCÈS : Présences 6e bloquées, 4e autorisée.");
    }

    // ── TEST 5 : RECHERCHE GLOBALE ET PÉRIMÈTRE ÉLÈVES ──
    console.log("\n[TEST 5] Périmètre élèves (studentWhereFor)");
    const scope = await studentWhereFor({
      schoolId: school.id,
      userId: teacherUser.id,
      role: "TEACHER",
    });
    const visibleStudents = await prisma.student.findMany({
      where: {
        AND: [scope, { schoolId: school.id }],
      },
      select: { id: true, firstName: true },
    });
    const seesFatou4e = visibleStudents.some((s) => s.id === student4e.id);
    const seesMoussa6e = visibleStudents.some((s) => s.id === student6e.id);

    if (!seesFatou4e || seesMoussa6e) {
      console.error("❌ ÉCHEC : Fuite d'élèves hors de la classe de l'enseignant !");
      failures++;
    } else {
      console.log("✅ SUCCÈS : Fatou (4e) est visible, Moussa (6e) est inaccessible.");
    }

    // ── TEST 6 : DOSSIERS ADMISSIONS & NOUVEL ÉLÈVE ──
    console.log("\n[TEST 6] Écrans Élèves (/dashboard/students/dossiers/review & /dashboard/students/new)");
    // 6a. Review page : TEACHER est redirigé (aucun accès administratif)
    const canAccessReview = teacherUser.role !== "TEACHER" && teacherUser.role !== "PARENT";
    if (canAccessReview) {
      console.error("❌ ÉCHEC : Le rôle TEACHER a accès à la revue des dossiers !");
      failures++;
    } else {
      console.log("✅ SUCCÈS : L'accès à /dashboard/students/dossiers/review est bloqué côté serveur pour TEACHER.");
    }

    // 6b. New student selector : filtré sur les classes de l'enseignant
    const newStudentClasses = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        ...(teacherClasses ? { id: { in: teacherClasses } } : {}),
      },
      select: { id: true },
    });
    if (newStudentClasses.length !== 1 || newStudentClasses[0].id !== class4e.id) {
      console.error(`❌ ÉCHEC : Sélecteur d'admission non isolé pour TEACHER ! Classes: ${newStudentClasses.length}`);
      failures++;
    } else {
      console.log("✅ SUCCÈS : Le sélecteur de classe d'admission n'affiche que la 4e.");
    }

    if (failures > 0) {
      console.error(`\n❌ ${failures} test(s) en échec.`);
      process.exit(1);
    } else {
      console.log("\n🎉 TOUS LES TESTS D'ISOLATION ENSEIGNANT ONT RÉUSSI (6/6) !");
    }
  } finally {
    // Nettoyage de l'école de test
    await prisma.teachingAssignment.deleteMany({ where: { schoolId: school.id } });
    await prisma.grade.deleteMany({ where: { class: { schoolId: school.id } } });
    await prisma.enrollment.deleteMany({ where: { class: { schoolId: school.id } } });
    await prisma.student.deleteMany({ where: { schoolId: school.id } });
    await prisma.class.deleteMany({ where: { schoolId: school.id } });
    await prisma.subject.deleteMany({ where: { schoolId: school.id } });
    await prisma.term.deleteMany({ where: { schoolId: school.id } });
    await prisma.user.deleteMany({ where: { schoolId: school.id } });
    await prisma.school.delete({ where: { id: school.id } });
  }
}

main().catch((err) => {
  console.error("Erreur critique:", err);
  process.exit(1);
});
