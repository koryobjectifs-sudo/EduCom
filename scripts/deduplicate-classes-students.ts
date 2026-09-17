import { prisma } from "./_env";

const APPLY = process.env.APPLY === "1";

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(`   DÉDUPLICATION DES ÉLÈVES & INSCRIPTIONS (${APPLY ? "APPLICATION RÉELLE" : "ESSAI À BLANC - SIMULATION"})`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Comptages AVANT sur l'ensemble du système
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

  // 2. Récupérer toutes les inscriptions pour analyse groupée
  const allEnrollments = await prisma.enrollment.findMany({
    include: {
      student: { select: { id: true, firstName: true, lastName: true, createdAt: true } },
      class: { select: { id: true, name: true, schoolId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const groupMap = new Map<string, typeof allEnrollments>();
  for (const e of allEnrollments) {
    const key = `${e.classId}:${e.academicYear}:${e.student.firstName.trim().toLowerCase()}:${e.student.lastName.trim().toLowerCase()}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(e);
  }

  const duplicateGroups = Array.from(groupMap.entries()).filter(([_, l]) => l.length > 1);
  console.log(`🔍 Groupes d'élèves en doublon dans la même classe : ${duplicateGroups.length}`);

  const dupEnrollmentIdsToDelete: string[] = [];
  const dupStudentIdsToDelete: string[] = [];
  const dupGradeIdsToDelete: string[] = [];
  const gradesToReassign: { id: string; targetStudentId: string }[] = [];
  const dupApprIdsToDelete: string[] = [];
  const apprsToReassign: { id: string; targetStudentId: string }[] = [];

  // Pré-charger toutes les notes et appréciations des étudiants concernés en 2 requêtes globales (Batching)
  const allInvolvedStudentIds = new Set<string>();
  for (const [_, list] of duplicateGroups) {
    for (const e of list) allInvolvedStudentIds.add(e.student.id);
  }

  const [allGradesDb, allApprsDb] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId: { in: Array.from(allInvolvedStudentIds) } },
      select: { id: true, studentId: true, classId: true, subjectId: true, termId: true, type: true },
    }),
    prisma.subjectAppreciation.findMany({
      where: { studentId: { in: Array.from(allInvolvedStudentIds) } },
      select: { id: true, studentId: true, subjectId: true, termId: true },
    }),
  ]);

  for (const [key, list] of duplicateGroups) {
    const canonical = list[0]; // premier inscrit
    const duplicates = list.slice(1);
    const canonicalStudentId = canonical.student.id;

    for (const dup of duplicates) {
      const dupStudentId = dup.student.id;
      dupEnrollmentIdsToDelete.push(dup.id);

      if (canonicalStudentId === dupStudentId) continue;
      dupStudentIdsToDelete.push(dupStudentId);

      // Traitement des notes en mémoire
      const canonicalGrades = allGradesDb.filter((g) => g.studentId === canonicalStudentId);
      const dupGrades = allGradesDb.filter((g) => g.studentId === dupStudentId);

      for (const g of dupGrades) {
        const alreadyExistsOnCanonical = canonicalGrades.some(
          (cg) =>
            cg.classId === g.classId &&
            cg.subjectId === g.subjectId &&
            cg.termId === g.termId &&
            cg.type === g.type,
        );
        if (alreadyExistsOnCanonical) {
          dupGradeIdsToDelete.push(g.id);
        } else {
          gradesToReassign.push({ id: g.id, targetStudentId: canonicalStudentId });
          canonicalGrades.push({ ...g, studentId: canonicalStudentId });
        }
      }

      // Traitement des appréciations en mémoire
      const canonicalApprs = allApprsDb.filter((a) => a.studentId === canonicalStudentId);
      const dupApprs = allApprsDb.filter((a) => a.studentId === dupStudentId);

      for (const a of dupApprs) {
        const alreadyExistsOnCanonical = canonicalApprs.some(
          (ca) => ca.subjectId === a.subjectId && ca.termId === a.termId,
        );
        if (alreadyExistsOnCanonical) {
          dupApprIdsToDelete.push(a.id);
        } else {
          apprsToReassign.push({ id: a.id, targetStudentId: canonicalStudentId });
          canonicalApprs.push({ ...a, studentId: canonicalStudentId });
        }
      }
    }
  }

  console.log("\n📈 BILAN DES OPÉRATIONS :");
  console.log(`  • Inscriptions redondantes à supprimer : ${dupEnrollmentIdsToDelete.length}`);
  console.log(`  • Fiches élèves doublon à supprimer    : ${dupStudentIdsToDelete.length}`);
  console.log(`  • Notes redondantes à supprimer        : ${dupGradeIdsToDelete.length}`);
  console.log(`  • Notes uniques à transférer au réel   : ${gradesToReassign.length}`);

  if (!APPLY) {
    console.log("\n⚠️ SIMULATION TERMINÉE. Aucune modification n'a été écrite en base.");
    console.log("Pour appliquer réellement : APPLY=1 npm run script -- scripts/deduplicate-classes-students.ts\n");
    return;
  }

  // 3. Application en base par batching
  console.log("\n▶ Application des suppressions et transferts par batching...");

  if (dupGradeIdsToDelete.length > 0) {
    await prisma.grade.deleteMany({ where: { id: { in: dupGradeIdsToDelete } } });
  }

  for (const item of gradesToReassign) {
    await prisma.grade.update({ where: { id: item.id }, data: { studentId: item.targetStudentId } });
  }

  if (dupApprIdsToDelete.length > 0) {
    await prisma.subjectAppreciation.deleteMany({ where: { id: { in: dupApprIdsToDelete } } });
  }

  for (const item of apprsToReassign) {
    await prisma.subjectAppreciation.update({ where: { id: item.id }, data: { studentId: item.targetStudentId } });
  }

  if (dupEnrollmentIdsToDelete.length > 0) {
    await prisma.enrollment.deleteMany({ where: { id: { in: dupEnrollmentIdsToDelete } } });
  }

  if (dupStudentIdsToDelete.length > 0) {
    // Nettoyer cascades annexes
    await prisma.studentDocument.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.reportCard.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.termReview.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.attendance.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.invoice.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.grade.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: dupStudentIdsToDelete } } });
    await prisma.student.deleteMany({ where: { id: { in: dupStudentIdsToDelete } } });
  }

  // 4. Comptages APRÈS
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
    console.log(`  • Classe 4e SENG.CO  : ${enrs4eBefore} -> ${enrs4eAfter} élèves (exactement 5 élèves réels) / ${grades4eAfter} notes enregistrées`);
  }
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
