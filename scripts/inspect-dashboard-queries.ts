import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";

interface QueryEntry {
  query: string;
  duration: number;
}
const queries: QueryEntry[] = [];
// @ts-ignore
prisma.$on("query", (e: any) => {
  queries.push({ query: e.query, duration: e.duration });
});

async function run() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });
  if (!school || !school.users[0]) throw new Error("Not found");
  const user = school.users[0];

  queries.length = 0;
  const start = performance.now();
  await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role as any },
    { firstName: user.firstName, schoolName: school.name }
  );
  const wallClock = Math.round(performance.now() - start);

  console.log(`\n========================================`);
  console.log(`LISTE DES ${queries.length} REQUÊTES SUR /dashboard (Temps total: ${wallClock}ms)`);
  console.log(`========================================`);
  
  queries.forEach((q, i) => {
    console.log(`\n#${i + 1} (${Math.round(q.duration)}ms) : ${q.query.slice(0, 160)}...`);
  });

  process.exit(0);
}
run().catch(console.error);
