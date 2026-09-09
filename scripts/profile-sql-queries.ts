import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDirectorDashboardData } from "../src/lib/dashboard-director";
import { loadStudentsData } from "../src/app/dashboard/students/data";
import { loadDossiersReview } from "../src/app/dashboard/students/dossiers/review/data";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

let queryLog: Array<{ query: string; duration: number }> = [];

const prisma = new PrismaClient({
  adapter,
  log: [{ emit: "event", level: "query" }],
});

// @ts-ignore
prisma.$on("query", (e: any) => {
  queryLog.push({ query: e.query, duration: e.duration });
});

async function profileRoute(name: string, fn: () => Promise<any>) {
  queryLog = [];
  const start = performance.now();
  await fn();
  const totalDuration = performance.now() - start;

  const queryCount = queryLog.length;
  const sqlDuration = queryLog.reduce((acc, q) => acc + (q.duration || 0), 0);

  console.log(`\n========================================`);
  console.log(`PROFILING : ${name}`);
  console.log(`- Nombre de requêtes SQL : ${queryCount}`);
  console.log(`- Durée SQL cumulée       : ${Math.round(sqlDuration)}ms`);
  console.log(`- Durée totale exécution  : ${Math.round(totalDuration)}ms`);
  
  if (queryLog.length > 0) {
    console.log(`- Top requêtes les plus lentes :`);
    const sorted = [...queryLog].sort((a, b) => b.duration - a.duration);
    for (const q of sorted.slice(0, 3)) {
      console.log(`    [${q.duration}ms] ${q.query.slice(0, 140)}...`);
    }
  }

  return {
    route: name,
    queryCount,
    sqlDuration: Math.round(sqlDuration),
    totalDuration: Math.round(totalDuration),
  };
}

async function run() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { take: 1 } },
  });

  if (!school || !school.users[0]) throw new Error("School not found");
  const user = school.users[0];

  const summary: any[] = [];

  // 1. /dashboard
  summary.push(
    await profileRoute("/dashboard", async () => {
      await getDirectorDashboardData({
        userId: user.id,
        schoolId: school.id,
        role: "OWNER",
      });
    })
  );

  // 2. /dashboard/students (liste globale 2026-2027)
  summary.push(
    await profileRoute("/dashboard/students (2026-2027)", async () => {
      // Direct query emulation with school context
      await prisma.student.findMany({
        where: { schoolId: school.id, enrollments: { some: { academicYear: "2026-2027" } } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          status: true,
          parent: { select: { firstName: true, lastName: true, phone: true } },
          enrollments: {
            where: { academicYear: "2026-2027" },
            select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
          },
        },
      });
      await prisma.class.findMany({ where: { schoolId: school.id } });
      await prisma.enrollment.groupBy({ by: ["academicYear"], where: { class: { schoolId: school.id } }, _count: { id: true } });
    })
  );

  // 2b. /dashboard/students (archive 2025-2026 - 1000 élèves !)
  summary.push(
    await profileRoute("/dashboard/students (2025-2026 - 1000 élèves)", async () => {
      await prisma.student.findMany({
        where: { schoolId: school.id, enrollments: { some: { academicYear: "2025-2026" } } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          status: true,
          parent: { select: { firstName: true, lastName: true, phone: true } },
          enrollments: {
            where: { academicYear: "2025-2026" },
            select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
          },
        },
      });
      await prisma.class.findMany({ where: { schoolId: school.id } });
      await prisma.enrollment.groupBy({ by: ["academicYear"], where: { class: { schoolId: school.id } }, _count: { id: true } });
    })
  );

  // 3. /dashboard/students/dossiers/review (Examen des admissions)
  summary.push(
    await profileRoute("/dashboard/students/dossiers/review", async () => {
      await prisma.student.findMany({
        where: { schoolId: school.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          kindOverride: true,
          enrollments: { select: { academicYear: true, class: { select: { cycle: true } } } },
          documents: { select: { id: true, requirementId: true, status: true } },
        },
      });
      await prisma.documentRequirement.findMany({ where: { schoolId: school.id } });
    })
  );

  // 4. /dashboard/classes
  summary.push(
    await profileRoute("/dashboard/classes", async () => {
      await prisma.class.findMany({
        where: { schoolId: school.id },
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          enrollments: { where: { academicYear: "2026-2027" }, select: { id: true } },
          _count: { select: { grades: true } },
        },
      });
      await prisma.user.findMany({ where: { schoolId: school.id, role: { in: ["TEACHER", "OWNER", "ADMIN"] } } });
    })
  );

  // 5. /dashboard/grades
  summary.push(
    await profileRoute("/dashboard/grades", async () => {
      await prisma.class.findMany({
        where: { schoolId: school.id },
        include: { teacher: true, _count: { select: { enrollments: true, grades: true } } },
      });
      await prisma.term.findMany({ where: { schoolId: school.id }, include: { evaluations: true } });
    })
  );

  // 6. /dashboard/payments
  summary.push(
    await profileRoute("/dashboard/payments", async () => {
      await prisma.payment.findMany({
        where: { schoolId: school.id },
        include: { invoice: { include: { student: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      await prisma.invoice.findMany({
        where: { schoolId: school.id },
        take: 50,
      });
    })
  );

  console.log("\n\n=== SYNTHÈSE DES MESURES SQL (SAINT JEAN PAUL INSTITUT - 1000 ÉLÈVES) ===");
  console.table(summary);

  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
