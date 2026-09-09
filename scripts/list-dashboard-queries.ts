import { prisma } from "../src/lib/prisma";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";

const queries: any[] = [];
// @ts-ignore
prisma.$on("query", (e: any) => {
  queries.push(e);
});

async function run() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });
  if (!school || !school.users[0]) throw new Error("Not found");
  const user = school.users[0];

  await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role as any },
    { firstName: user.firstName, schoolName: school.name }
  );

  console.log(`\nREQUÊTES RESTANTES SUR /dashboard (${queries.length}) :`);
  queries.forEach((q, i) => {
    console.log(`${i + 1}. [${Math.round(q.duration)}ms] ${q.query.slice(0, 160)}`);
  });
  process.exit(0);
}

run().catch(console.error);
