import { prisma } from "../src/lib/prisma";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";
import { invoiceOverview } from "../src/lib/finance";

interface QueryEntry {
  query: string;
  duration: number;
}

const dashboardQueries: QueryEntry[] = [];
const paymentQueries: QueryEntry[] = [];
let currentLog: QueryEntry[] = dashboardQueries;

// @ts-ignore
prisma.$on("query", (e: any) => {
  currentLog.push({ query: e.query, duration: e.duration });
});

async function run() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });
  if (!school || !school.users[0]) throw new Error("Not found");
  const user = school.users[0];

  currentLog = dashboardQueries;
  await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role as any },
    { firstName: user.firstName, schoolName: school.name }
  );

  currentLog = paymentQueries;
  await invoiceOverview({ schoolId, userId: user.id, role: user.role as any });

  console.log(`\n======================================================`);
  console.log(`LISTE BRUTE DES ${dashboardQueries.length} REQUÊTES DE /dashboard`);
  console.log(`======================================================`);
  dashboardQueries.forEach((q, i) => {
    console.log(`[#${i + 1}] (${Math.round(q.duration)}ms) ${q.query}`);
  });

  console.log(`\n======================================================`);
  console.log(`LISTE BRUTE DES ${paymentQueries.length} REQUÊTES DE /dashboard/payments`);
  console.log(`======================================================`);
  paymentQueries.forEach((q, i) => {
    console.log(`[#${i + 1}] (${Math.round(q.duration)}ms) ${q.query}`);
  });

  process.exit(0);
}

run().catch(console.error);
