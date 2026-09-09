import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";
import { invoiceOverview } from "../src/lib/finance";

let queryLog: Array<{ query: string; duration: number }> = [];

// @ts-ignore
prisma.$on("query", (e: any) => {
  queryLog.push({ query: e.query, duration: e.duration });
});

async function measureSQL(name: string, fn: () => Promise<any>) {
  queryLog = [];
  const start = performance.now();
  await fn();
  const totalDuration = performance.now() - start;
  const queryCount = queryLog.length;
  const sqlDuration = queryLog.reduce((acc, q) => acc + (q.duration || 0), 0);

  return {
    route: name,
    queryCount,
    sqlDuration: Math.round(sqlDuration),
    totalDuration: Math.round(totalDuration),
    topQueries: [...queryLog].sort((a, b) => b.duration - a.duration).slice(0, 3),
  };
}

async function run() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8"; // SAINT JEAN PAUL INSTITUT (1000 élèves)
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });

  if (!school || !school.users[0]) throw new Error("School or admin user not found");
  const user = school.users[0];

  console.log(`\n========================================================`);
  console.log(`MESURE PRÉCISE DES REQUÊTES SQL — ÉCOLE : ${school.name} (1000 élèves)`);
  console.log(`========================================================\n`);

  const results: any[] = [];

  // 1. /dashboard
  results.push(
    await measureSQL("/dashboard", async () => {
      await getDirectorDashboardSnapshot(
        { schoolId: school.id, userId: user.id, role: user.role as any },
        { firstName: user.firstName, schoolName: school.name }
      );
    })
  );

  // 2. /dashboard/students (Année active 2026-2027)
  results.push(
    await measureSQL("/dashboard/students (2026-2027)", async () => {
      const annee = "2026-2027";
      await Promise.all([
        prisma.student.findMany({
          where: {
            schoolId,
            enrollments: { some: { academicYear: annee } },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            status: true,
            parent: { select: { firstName: true, lastName: true, phone: true } },
            enrollments: {
              where: { academicYear: annee },
              select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.class.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            cycle: true,
            teacherId: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { enrollments: true } },
          },
        }),
        prisma.user.findMany({
          where: { schoolId, role: "TEACHER" },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          orderBy: { firstName: "asc" },
        }),
        prisma.enrollment.groupBy({
          by: ["academicYear"],
          where: { class: { schoolId } },
          _count: { id: true },
        }),
      ]);
    })
  );

  // 2b. /dashboard/students (2025-2026 - 1000 élèves !)
  results.push(
    await measureSQL("/dashboard/students (2025-2026 - 1000 élèves)", async () => {
      const annee = "2025-2026";
      await Promise.all([
        prisma.student.findMany({
          where: {
            schoolId,
            enrollments: { some: { academicYear: annee } },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            status: true,
            parent: { select: { firstName: true, lastName: true, phone: true } },
            enrollments: {
              where: { academicYear: annee },
              select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.class.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            cycle: true,
            teacherId: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { enrollments: true } },
          },
        }),
        prisma.user.findMany({
          where: { schoolId, role: "TEACHER" },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          orderBy: { firstName: "asc" },
        }),
        prisma.enrollment.groupBy({
          by: ["academicYear"],
          where: { class: { schoolId } },
          _count: { id: true },
        }),
      ]);
    })
  );

  // 3. /dashboard/students?view=classes
  results.push(
    await measureSQL("/dashboard/students?view=classes", async () => {
      const annee = "2026-2027";
      await Promise.all([
        prisma.student.findMany({
          where: {
            schoolId,
            enrollments: { some: { academicYear: annee } },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            status: true,
            parent: { select: { firstName: true, lastName: true, phone: true } },
            enrollments: {
              where: { academicYear: annee },
              select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.class.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            cycle: true,
            teacherId: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { enrollments: true } },
          },
        }),
      ]);
    })
  );

  // 4. /dashboard/students/dossiers/review
  results.push(
    await measureSQL("/dashboard/students/dossiers/review", async () => {
      await Promise.all([
        prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true, cycle: true },
          orderBy: { name: "asc" },
        }),
        prisma.documentRequirement.findMany({
          where: { schoolId, active: true },
          orderBy: [{ position: "asc" }, { label: "asc" }],
        }),
        prisma.student.findMany({
          where: { schoolId },
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
            parent: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
            enrollments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                academicYear: true,
                class: { select: { id: true, name: true, cycle: true } },
              },
            },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        }),
        prisma.studentDocument.findMany({
          where: { schoolId, supersededAt: null },
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
    })
  );

  // 5. /dashboard/classes
  results.push(
    await measureSQL("/dashboard/classes", async () => {
      await Promise.all([
        prisma.class.findMany({
          where: { schoolId },
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
            enrollments: { where: { academicYear: "2026-2027" }, select: { id: true } },
            _count: { select: { grades: true } },
          },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          where: { schoolId, role: { in: ["TEACHER", "OWNER", "ADMIN"] } },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { lastName: "asc" },
        }),
      ]);
    })
  );

  // 6. /dashboard/grades
  results.push(
    await measureSQL("/dashboard/grades", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.evaluation.findMany({
        where: {
          schoolId,
          date: { gte: today },
        },
        select: {
          id: true,
          name: true,
          type: true,
          date: true,
          term: { select: { id: true, name: true } },
        },
        orderBy: { date: "asc" },
        take: 10,
      });
    })
  );

  // 7. /dashboard/payments
  results.push(
    await measureSQL("/dashboard/payments", async () => {
      await invoiceOverview({ userId: user.id, schoolId: school.id, role: user.role as any });
    })
  );

  console.table(
    results.map((r) => ({
      Route: r.route,
      "Nb Requêtes SQL": r.queryCount,
      "Temps SQL (ms)": r.sqlDuration,
      "Temps Traitement (ms)": r.totalDuration,
    }))
  );

  for (const r of results) {
    if (r.topQueries.length > 0) {
      console.log(`\n🔍 ${r.route} — Requête SQL la plus lente (${r.topQueries[0].duration} ms) :`);
      console.log(`   ${r.topQueries[0].query.slice(0, 200)}...`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
