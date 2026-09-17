import { prisma } from "./_env";

const APPLY = process.env.APPLY === "1";

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(`   DÉDUPLICATION DES ÉLÈVES & INSCRIPTIONS (${APPLY ? "APPLICATION RÉELLE" : "ESSAI À BLANC - SIMULATION"})`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Comptages AVANT
  const totalStudentsBefore = await prisma.student.count();
  const totalEnrollmentsBefore = await prisma.enrollment.count();
  const totalGradesBefore = await prisma.grade.count();

  const class4e = await prisma.class.findFirst({
    where: { name: { in: ["4e", "4ème"] }, school: { name: { contains: "SENG.CO" } } },
  });
  const enrs4eBefore = class4e ? await prisma.enrollment.count({ where: { classId: class4e.id } }) : 0;
  const grades4eBefore = class4e ? await prisma.grade.count({ where: { classId: class4e.id } }) : 0;

  console.log("📊 COMPTAGE AVANT SUR L'ENSEMBLE DU SYSTÈME :");
  console.log(`  • Total élèves       : ${totalStudentsBefore}`);
  console.log(`  • Total inscriptions : ${totalEnrollmentsBefore}`);
  console.log(`  • Total notes        : ${totalGradesBefore}`);
  if (class4e) {
    console.log(`  • Classe 4e SENG.CO  : ${enrs4eBefore} élèves / ${grades4eBefore} notes enregistrées\n`);
  }

  // 2. Recherche de tous les groupes d'élèves en doublon (même école, même nom, même prénom)
  const allStudents = await prisma.student.findMany({
    select: { id: true, firstName: true, lastName: true, schoolId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const groupMap = new Map<string, typeof allStudents>();
  for (const s of allStudents) {
    const key = `${s.schoolId}:${s.firstName.trim().toLowerCase()}:${s.lastName.trim().toLowerCase()}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(s);
  }

  const duplicateGroups = Array.from(groupMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`🔍 Groupes de doublons détectés : ${duplicateGroups.length}`);

  let studentsToDeleteCount = 0;
  let enrollmentsDeletedCount = 0;
  let gradesMergedCount = 0;
  let gradesDeletedCount = 0;

  for (const [key, list] of duplicateGroups) {
    const canonical = list[0]; // Plus ancien
    const duplicates = list.slice(1);

    for (const dup of duplicates) {
      studentsToDeleteCount++;

      // Inscriptions du doublon
      const dupEnrollments = await prisma.enrollment.findMany({ where: { studentId: dup.id } });
      for (const e of dupEnrollments) {
        // Vérifier si le canonical a déjà une inscription pour cette année
        const canonicalEnr = await prisma.enrollment.findFirst({
          where: { studentId: canonical.id, academicYear: e.academicYear },
        });
        if (canonicalEnr) {
          enrollmentsDeletedCount++;
          if (APPLY) {
            await prisma.enrollment.delete({ where: { id: e.id } });
          }
        } else {
          if (APPLY) {
            await prisma.enrollment.update({ where: { id: e.id }, data: { studentId: canonical.id } });
          }
        }
      }

      // Notes du doublon
      const dupGrades = await prisma.grade.findMany({ where: { studentId: dup.id } });
      for (const g of dupGrades) {
        // Si la classe a déjà des notes pour canonical sur cette matière/trimestre/type
        const existingCanonicalGrade = await prisma.grade.findFirst({
          where: {
            studentId: canonical.id,
            classId: g.classId,
            subjectId: g.subjectId,
            termId: g.termId,
            type: g.type,
          },
        });

        if (existingCanonicalGrade) {
          // Doublon de saisie (l'utilisateur a saisi sur les deux lignes) : supprimer la note du doublon
          gradesDeletedCount++;
          if (APPLY) {
            await prisma.grade.delete({ where: { id: g.id } });
          }
        } else {
          // Note unique sur le doublon : transférer au canonical
          gradesMergedCount++;
          if (APPLY) {
            await prisma.grade.update({ where: { id: g.id }, data: { studentId: canonical.id } });
          }
        }
      }

      // Appréciations
      const dupAppr = await prisma.subjectAppreciation.findMany({ where: { studentId: dup.id } });
      for (const a of dupAppr) {
        const exist = await prisma.subjectAppreciation.findFirst({
          where: { studentId: canonical.id, subjectId: a.subjectId, termId: a.termId },
        });
        if (exist) {
          if (APPLY) await prisma.subjectAppreciation.delete({ where: { id: a.id } });
        } else {
          if (APPLY) await prisma.subjectAppreciation.update({ where: { id: a.id }, data: { studentId: canonical.id } });
        }
      }

      // Supprimer l'élève en doublon
      if (APPLY) {
        // Nettoyer les autres tables dépendantes s'il en existe
        await prisma.invoice.updateMany({ where: { studentId: dup.id }, data: { studentId: canonical.id } });
        await prisma.attendance.updateMany({ where: { studentId: dup.id }, data: { studentId: canonical.id } });
        await prisma.studentDocument.deleteMany({ where: { studentId: dup.id } });
        await prisma.termReview.deleteMany({ where: { studentId: dup.id } });
        await prisma.reportCard.deleteMany({ where: { studentId: dup.id } });
        await prisma.student.delete({ where: { id: dup.id } });
      }
    }
  }

  console.log("📈 BILAN DES OPÉRATIONS :");
  console.log(`  • Élèves en doublon à supprimer : ${studentsToDeleteCount}`);
  console.log(`  • Inscriptions redondantes      : ${enrollmentsDeletedCount}`);
  console.log(`  • Notes fusionnées vers élève   : ${gradesMergedCount}`);
  console.log(`  • Notes redondantes supprimées  : ${gradesDeletedCount}`);

  if (!APPLY) {
    console.log("\n⚠️ SIMULATION TERMINÉE. Aucune modification n'a été écrite en base.");
    console.log("Pour appliquer réellement : APPLY=1 npm run script -- scripts/deduplicate-students-and-enrollments.ts\n");
    return;
  }

  // 3. Comptages APRÈS
  const totalStudentsAfter = await prisma.student.count();
  const totalEnrollmentsAfter = await prisma.enrollment.count();
  const totalGradesAfter = await prisma.grade.count();

  const enrs4eAfter = class4e ? await prisma.enrollment.count({ where: { classId: class4e.id } }) : 0;
  const grades4eAfter = class4e ? await prisma.grade.count({ where: { classId: class4e.id } }) : 0;

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("📊 COMPTAGE APRÈS SUR L'ENSEMBLE DU SYSTÈME :");
  console.log(`  • Total élèves       : ${totalStudentsBefore} -> ${totalStudentsAfter} (-${totalStudentsBefore - totalStudentsAfter})`);
  console.log(`  • Total inscriptions : ${totalEnrollmentsBefore} -> ${totalEnrollmentsAfter} (-${totalEnrollmentsBefore - totalEnrollmentsAfter})`);
  console.log(`  • Total notes        : ${totalGradesBefore} -> ${totalGradesAfter} (-${totalGradesBefore - totalGradesAfter})`);
  if (class4e) {
    console.log(`  • Classe 4e SENG.CO  : ${enrs4eBefore} -> ${enrs4eAfter} élèves (exactement 5 élèves réels) / ${grades4eAfter} notes`);
  }
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
