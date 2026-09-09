import { prisma } from '../src/lib/prisma';

async function verify() {
  const schoolId = 'c5e484f1-2e4d-44f9-a403-f68e4f54bec8';
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error('School not found');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const currentAcademicYear = school.activeAcademicYear || '2025-2026';

  console.log('=== 1. VÉRIFICATION DES 6 COMPTEURS (AVANT VS APRÈS) ===');

  // AVANT (Prisma ORM individuel)
  const [
    beforeSubmittedReportCards,
    beforeDocRequests,
    beforeDocsToReview,
    beforeTeachers,
    beforeDemoClasses,
    beforeNewStudents30d,
  ] = await Promise.all([
    prisma.reportCard.count({ where: { schoolId, status: 'SUBMITTED' } }),
    prisma.documentRequest.count({ where: { schoolId, status: 'PENDING' } }),
    prisma.schoolDocument.count({ where: { schoolId, status: 'REVIEW' } }),
    prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
    prisma.class.count({ where: { schoolId, isDemo: true } }),
    prisma.student.count({ where: { schoolId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  // APRÈS (SQL consolidé typé et paramétré)
  interface DashboardCountersRaw {
    submitted_report_cards: number;
    pending_doc_requests: number;
    docs_to_review: number;
    teachers_count: number;
    demo_classes_count: number;
    new_students_30d: number;
  }

  const [afterCounters] = await prisma.$queryRaw<DashboardCountersRaw[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "ReportCard" WHERE "schoolId" = ${schoolId} AND "status" = 'SUBMITTED') as submitted_report_cards,
      (SELECT COUNT(*)::int FROM "DocumentRequest" WHERE "schoolId" = ${schoolId} AND "status" = 'PENDING') as pending_doc_requests,
      (SELECT COUNT(*)::int FROM "SchoolDocument" WHERE "schoolId" = ${schoolId} AND "status" = 'REVIEW') as docs_to_review,
      (SELECT COUNT(*)::int FROM "User" WHERE "schoolId" = ${schoolId} AND "role" = 'TEACHER') as teachers_count,
      (SELECT COUNT(*)::int FROM "Class" WHERE "schoolId" = ${schoolId} AND "isDemo" = true) as demo_classes_count,
      (SELECT COUNT(*)::int FROM "Student" WHERE "schoolId" = ${schoolId} AND "createdAt" >= ${thirtyDaysAgo}) as new_students_30d
  `;

  console.log('1. Bulletins soumis       : Avant = ' + beforeSubmittedReportCards + ' | Après = ' + afterCounters.submitted_report_cards + ' -> ' + (beforeSubmittedReportCards === afterCounters.submitted_report_cards ? '✓ STRICTEMENT IDENTIQUE' : '❌ ERREUR'));
  console.log('2. Demandes documents     : Avant = ' + beforeDocRequests + ' | Après = ' + afterCounters.pending_doc_requests + ' -> ' + (beforeDocRequests === afterCounters.pending_doc_requests ? '✓ STRICTEMENT IDENTIQUE' : '❌ ERREUR'));
  console.log('3. Documents à réviser    : Avant = ' + beforeDocsToReview + ' | Après = ' + afterCounters.docs_to_review + ' -> ' + (beforeDocsToReview === afterCounters.docs_to_review ? '✓ STRICTEMENT IDENTIQUE' : '❌ ERREUR'));
  console.log('4. Enseignants            : Avant = ' + beforeTeachers + ' | Après = ' + afterCounters.teachers_count + ' -> ' + (beforeTeachers === afterCounters.teachers_count ? '✓ STRICTEMENT IDENTIQUE' : '❌ ERREUR'));
  console.log('5. Classes démo (isDemo)  : Avant = ' + beforeDemoClasses + ' | Après = ' + afterCounters.demo_classes_count + ' -> ' + (beforeDemoClasses === afterCounters.demo_classes_count ? '✓ STRICTEMENT IDENTIQUE' : '❌ ERREUR'));
  console.log('6. Nouveaux élèves 30j    : Avant = ' + beforeNewStudents30d + ' | Après = ' + afterCounters.new_students_30d + ' -> ' + (beforeNewStudents30d === afterCounters.new_students_30d ? '✓ STRICTEMENT IDENTIQUE' : '❌ ERREUR'));

  console.log('\n=== 2. VÉRIFICATION DE LA REQUÊTE CLASSES + OCCUPATION (AVANT VS APRÈS) ===');

  // AVANT (Prisma findMany)
  const beforeClasses = await prisma.class.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      cycle: true,
      teacherId: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: 'asc' },
  });

  // APRÈS (SQL brut sécurisé avec double filtre schoolId)
  interface ClassOccupancyRaw {
    id: string;
    name: string;
    cycle: string;
    teacherId: string | null;
    teacherFirstName: string | null;
    teacherLastName: string | null;
    studentCount: number;
  }

  const afterClasses = await prisma.$queryRaw<ClassOccupancyRaw[]>`
    SELECT 
      c."id",
      c."name",
      c."cycle"::text,
      c."teacherId",
      u."firstName" as "teacherFirstName",
      u."lastName" as "teacherLastName",
      COALESCE(e."studentCount", 0)::int as "studentCount"
    FROM "Class" c
    LEFT JOIN "User" u ON u."id" = c."teacherId" AND u."schoolId" = ${schoolId}
    LEFT JOIN (
      SELECT "classId", COUNT(*)::int as "studentCount"
      FROM "Enrollment"
      WHERE "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
      GROUP BY "classId"
    ) e ON e."classId" = c."id"
    WHERE c."schoolId" = ${schoolId}
    ORDER BY c."name" ASC
  `;

  console.log('Nombre de classes : Avant = ' + beforeClasses.length + ' | Après = ' + afterClasses.length);
  let allMatch = true;
  for (let i = 0; i < beforeClasses.length; i++) {
    const b = beforeClasses[i];
    const a = afterClasses[i];
    const teacherBefore = b.teacher ? `${b.teacher.firstName} ${b.teacher.lastName}` : null;
    const teacherAfter = a.teacherFirstName ? `${a.teacherFirstName} ${a.teacherLastName}` : null;
    const countBefore = b._count.enrollments;
    const countAfter = a.studentCount;

    if (b.id !== a.id || b.name !== a.name || teacherBefore !== teacherAfter || countBefore !== countAfter) {
      console.log(`Mismatch on class ${b.name}: Before (${countBefore}, ${teacherBefore}) vs After (${countAfter}, ${teacherAfter})`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log('✓ TOUTES LES CLASSES (' + beforeClasses.length + ') ONT DES EFFECTIFS ET TITULAIRES STRICTEMENT IDENTIQUES');
  }

  process.exit(0);
}

verify().catch(console.error);
