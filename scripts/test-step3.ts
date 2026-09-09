import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function test() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const now = new Date();
  const d15 = new Date(now.getTime() - 15 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const res = await prisma.$queryRaw<Array<{
    total_count: number;
    total_billed: number;
    overdue_amount: number;
    overdue_families: number;
    overdue_15d_amount: number;
    overdue_15d_count: number;
    overdue_30d_amount: number;
    overdue_30d_count: number;
    overdue_critical_amount: number;
    overdue_critical_count: number;
    upcoming_amount: number;
    upcoming_count: number;
    next_due_date: Date | null;
  }>>`
    SELECT 
      COUNT(*)::int as total_count,
      COALESCE(SUM("totalAmount"), 0)::int as total_billed,
      COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" < ${now} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_amount,
      COUNT(DISTINCT CASE WHEN "status" != 'PAID' AND "dueDate" < ${now} THEN COALESCE("parentId", "studentId"::text) END)::int as overdue_families,
      COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${d15} AND "dueDate" < ${now} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_15d_amount,
      COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${d15} AND "dueDate" < ${now} THEN 1 END)::int as overdue_15d_count,
      COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${d30} AND "dueDate" < ${d15} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_30d_amount,
      COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${d30} AND "dueDate" < ${d15} THEN 1 END)::int as overdue_30d_count,
      COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" < ${d30} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_critical_amount,
      COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" < ${d30} THEN 1 END)::int as overdue_critical_count,
      COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${now} THEN "totalAmount" ELSE 0 END), 0)::int as upcoming_amount,
      COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${now} THEN 1 END)::int as upcoming_count,
      MIN(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${now} THEN "dueDate" END) as next_due_date
    FROM "Invoice"
    WHERE "schoolId" = ${schoolId}
  `;
  console.log("RAW_INVOICE_AGGREGATES:", res);

  // Test Payments aggregates:
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMonday = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const [paymentStats, paymentChannels] = await Promise.all([
    prisma.$queryRaw<Array<{
      total_collected: number;
      collections_today: number;
      collections_week: number;
    }>>`
      SELECT 
        COALESCE(SUM("amount"), 0)::int as total_collected,
        COALESCE(SUM(CASE WHEN "createdAt" >= ${startOfToday} THEN "amount" ELSE 0 END), 0)::int as collections_today,
        COALESCE(SUM(CASE WHEN "createdAt" >= ${startOfWeek} THEN "amount" ELSE 0 END), 0)::int as collections_week
      FROM "Payment"
      WHERE "schoolId" = ${schoolId}
    `,
    prisma.payment.groupBy({
      by: ["method"],
      where: { schoolId },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);
  console.log("PAYMENT_STATS:", paymentStats);
  console.log("PAYMENT_CHANNELS:", paymentChannels);

  // Test ReportCard groupBy
  const reportCards = await prisma.reportCard.groupBy({
    by: ["status"],
    where: { schoolId },
    _count: { id: true },
  });
  console.log("REPORT_CARDS_GROUPBY:", reportCards);

  // Test Student status groupBy
  const studentStatuses = await prisma.student.groupBy({
    by: ["status"],
    where: { schoolId, status: { in: ["PENDING", "GRADUATED", "INACTIVE"] } },
    _count: { id: true },
  });
  console.log("STUDENT_STATUSES_GROUPBY:", studentStatuses);

  // Test Grades aggregates:
  const term = await prisma.term.findFirst({ where: { schoolId }, orderBy: { createdAt: "desc" } });
  if (term) {
    const [gradeStatsByClass, overallStats, belowAvg] = await Promise.all([
      prisma.$queryRaw<Array<{
        classId: string;
        grades_count: number;
        weighted_sum: number;
        total_coef: number;
      }>>`
        SELECT 
          "classId",
          COUNT(*)::int as grades_count,
          COALESCE(SUM(("value" / "max") * 20 * CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as weighted_sum,
          COALESCE(SUM(CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as total_coef
        FROM "Grade"
        WHERE "termId" = ${term.id} AND "max" > 0 AND "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
        GROUP BY "classId"
      `,
      prisma.$queryRaw<Array<{
        overall_weighted_sum: number;
        overall_total_coef: number;
      }>>`
        SELECT 
          COALESCE(SUM(("value" / "max") * 20 * CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as overall_weighted_sum,
          COALESCE(SUM(CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as overall_total_coef
        FROM "Grade"
        WHERE "termId" = ${term.id} AND "max" > 0 AND "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
      `,
      prisma.$queryRaw<Array<{
        students_below_avg: number;
        total_evaluated_students: number;
      }>>`
        SELECT 
          COUNT(CASE WHEN avg_score < 10 THEN 1 END)::int as students_below_avg,
          COUNT(*)::int as total_evaluated_students
        FROM (
          SELECT "studentId",
            SUM(("value" / "max") * 20 * CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END) / 
            NULLIF(SUM(CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0) as avg_score
          FROM "Grade"
          WHERE "termId" = ${term.id} AND "max" > 0 AND "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
          GROUP BY "studentId"
        ) sub
      `,
    ]);
    console.log("GRADE_STATS_BY_CLASS:", gradeStatsByClass);
    console.log("OVERALL_GRADE_STATS:", overallStats);
    console.log("STUDENTS_BELOW_AVG:", belowAvg);
  }

  process.exit(0);
}
test().catch((err) => {
  console.error(err);
  process.exit(1);
});
