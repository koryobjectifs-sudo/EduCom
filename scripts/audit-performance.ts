import { prisma } from "../src/lib/prisma";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";
import { loadStudentsData } from "../src/app/dashboard/students/data";
import { invoiceOverview } from "../src/lib/finance";
import {
  configurationReadiness,
  programmeByClass,
  schoolCalendar,
} from "../src/lib/pedagogy";
import { recentPlanningChanges } from "../src/lib/planningNotice";
import { studentWhereFor } from "../src/lib/studentScope";
import { currentAcademicYear } from "../src/lib/studentFile";

// Global query tracker
let queryLog: { query: string; duration: number }[] = [];
let isTracking = false;

// Attach event listener if supported on prisma
try {
  (prisma as any).$on?.("query", (e: any) => {
    if (isTracking) {
      queryLog.push({ query: e.query, duration: e.duration });
    }
  });
} catch (e) {
  // Ignored if not event-based
}

async function runBenchmark() {
  console.log("===============================================================");
  console.log("📊 AUDIT DES PERFORMANCES DU DASHBOARD EDUCOM — PHASE 1");
  console.log("===============================================================\n");

  // Pick target school and user
  const school = await prisma.school.findFirst({
    where: { onboardingCompleted: true },
    include: { users: true },
    orderBy: { createdAt: "desc" },
  });

  if (!school) {
    console.error("Aucune école trouvée pour l'audit.");
    process.exit(1);
  }

  const user = school.users.find((u) => u.role === "ADMIN" || u.role === "OWNER") || school.users[0];
  const actor = { schoolId: school.id, userId: user.id, role: user.role };
  const identity = { firstName: user.firstName, schoolName: school.name };

  console.log(`Établissement cible : ${school.name} (ID: ${school.id})`);
  console.log(`Utilisateur acteur : ${user.firstName} ${user.lastName} (${user.role})\n`);

  const results: {
    route: string;
    queryCount: number;
    sqlDurationMs: number;
    totalDurationMs: number;
    queries: { query: string; duration: number }[];
  }[] = [];

  async function profile(name: string, fn: () => Promise<any>) {
    queryLog = [];
    isTracking = true;
    const start = performance.now();
    await fn();
    const end = performance.now();
    isTracking = false;

    const totalDurationMs = Math.round((end - start) * 100) / 100;
    const sqlDurationMs = Math.round(queryLog.reduce((sum, q) => sum + q.duration, 0) * 100) / 100;
    const queryCount = queryLog.length;

    results.push({
      route: name,
      queryCount,
      sqlDurationMs,
      totalDurationMs,
      queries: [...queryLog],
    });

    console.log(`Route: ${name}`);
    console.log(`  - Nb requêtes SQL : ${queryCount}`);
    console.log(`  - Durée totale SQL : ${sqlDurationMs} ms`);
    console.log(`  - Temps serveur total : ${totalDurationMs} ms`);
    if (queryLog.length > 0) {
      console.log(`  - Requêtes les plus lentes :`);
      const sorted = [...queryLog].sort((a, b) => b.duration - a.duration).slice(0, 3);
      for (const q of sorted) {
        console.log(`      * [${q.duration}ms] ${q.query.slice(0, 120)}...`);
      }
    }
    console.log("");
  }

  // 1. /dashboard
  await profile("/dashboard", async () => {
    return getDirectorDashboardSnapshot(actor as any, identity);
  });

  // 2. /dashboard/students
  await profile("/dashboard/students", async () => {
    const scope = await studentWhereFor(actor as any);
    const annee = currentAcademicYear();
    return Promise.all([
      prisma.student.findMany({
        where: { AND: [scope, { schoolId: school.id }] },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          status: true,
          parent: { select: { firstName: true, lastName: true, phone: true } },
          enrollments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              academicYear: true,
              classId: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.class.findMany({
        where: { schoolId: school.id },
        include: { teacher: true, _count: { select: { enrollments: true } } },
      }),
      prisma.user.findMany({ where: { schoolId: school.id, role: "TEACHER" }, orderBy: { firstName: "asc" } }),
      prisma.enrollment.findMany({
        where: { class: { schoolId: school.id } },
        distinct: ["academicYear"],
        select: { academicYear: true },
      }),
    ]);
  });

  // 3. /dashboard/students/dossiers/review
  await profile("/dashboard/students/dossiers/review", async () => {
    const scope = await studentWhereFor(actor as any);
    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    });
    const allConfiguredRequirements = await prisma.documentRequirement.findMany({
      where: { schoolId: school.id, active: true },
      orderBy: [{ position: "asc" }, { label: "asc" }],
    });
    const [students, allStudentDocs] = await Promise.all([
      prisma.student.findMany({
        where: { AND: [scope, { schoolId: school.id }] },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          status: true,
          kindOverride: true,
          createdAt: true,
          emergencyContact: true,
          emergencyPhone: true,
          parent: { select: { id: true, firstName: true, lastName: true, phone: true } },
          enrollments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              academicYear: true,
              class: { select: { id: true, name: true, cycle: true } },
            },
          },
        },
      }),
      prisma.studentDocument.findMany({
        where: { schoolId: school.id, supersededAt: null },
        select: {
          id: true,
          studentId: true,
          requirementId: true,
          status: true,
          fileName: true,
          storagePath: true,
          reviewNote: true,
          updatedAt: true,
        },
      }),
    ]);
    return { classes, allConfiguredRequirements, students, allStudentDocs };
  });

  // 4. /dashboard/grades
  await profile("/dashboard/grades", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.evaluation.findMany({
      where: {
        schoolId: school.id,
        date: { gte: today },
      },
      include: { term: true },
      orderBy: { date: "asc" },
      take: 10,
    });
  });

  // 5. /dashboard/payments
  await profile("/dashboard/payments", async () => {
    return invoiceOverview(actor as any);
  });

  // 6. /dashboard/settings/pedagogie
  await profile("/dashboard/settings/pedagogie", async () => {
    const [
      rawClasses,
      termRows,
      subjects,
      teachers,
      assignments,
      gradeCountsRaw,
      notices,
    ] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId: school.id },
        select: {
          id: true,
          name: true,
          cycle: true,
          teacherId: true,
          teacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { enrollments: true } },
          subjects: {
            select: {
              subjectId: true,
              coefficient: true,
              subject: { select: { name: true, parent: { select: { name: true } } } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.term.findMany({
        where: { schoolId: school.id },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          evaluations: {
            select: { id: true, name: true, type: true, date: true },
            orderBy: [{ date: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.subject.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true, parentId: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { schoolId: school.id, role: { in: ["TEACHER", "OWNER", "ADMIN"] } },
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.teachingAssignment.findMany({
        where: { schoolId: school.id },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.grade.groupBy({
        by: ["classId", "subjectId"],
        where: { class: { schoolId: school.id } },
        _count: { _all: true },
      }),
      recentPlanningChanges(actor as any),
    ]);

    const gradeCounts = new Map(gradeCountsRaw.map((c) => [`${c.classId}|${c.subjectId}`, c._count._all]));

    return Promise.all([
      programmeByClass(actor as any, rawClasses, gradeCounts),
      schoolCalendar(actor as any, new Date(), termRows),
      configurationReadiness(actor as any, {
        classes: rawClasses,
        terms: termRows,
        assignments,
        teachersCount: teachers.filter((t) => t.role === "TEACHER").length,
      }),
    ]);
  });

  console.log("===============================================================");
  console.log("📊 TABLEAU RÉCAPITULATIF (PHASE 1)");
  console.log("===============================================================");
  console.table(
    results.map((r) => ({
      Route: r.route,
      "Nb Requêtes SQL": r.queryCount,
      "Temps SQL (ms)": r.sqlDurationMs,
      "Temps Total Serveur (ms)": r.totalDurationMs,
    }))
  );
}

runBenchmark().catch(console.error);
