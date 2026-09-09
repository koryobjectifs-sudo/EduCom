import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";
import { invoiceOverview } from "../src/lib/finance";

async function measureForPoolMax(maxConnections: number) {
  const rawUrl = process.env.DATABASE_URL!.replace(/connection_limit=\d+/, `connection_limit=${maxConnections}`);
  const pool = new Pool({
    connectionString: rawUrl,
    max: maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
  });

  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await client.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });
  if (!school || !school.users[0]) throw new Error("Not found");
  const user = school.users[0];

  // Warmup run
  try {
    await client.school.findFirst({ select: { id: true } });
  } catch {}

  // Run 3 iterations and take median
  const dashboardTimes: number[] = [];
  const paymentTimes: number[] = [];

  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await getDirectorDashboardSnapshot(
      { schoolId, userId: user.id, role: user.role as any },
      { firstName: user.firstName, schoolName: school.name }
    );
    dashboardTimes.push(Math.round(performance.now() - t0));

    const t1 = performance.now();
    await invoiceOverview({ schoolId, userId: user.id, role: user.role as any });
    paymentTimes.push(Math.round(performance.now() - t1));
  }

  await client.$disconnect();
  await pool.end();

  dashboardTimes.sort((a, b) => a - b);
  paymentTimes.sort((a, b) => a - b);

  return {
    maxConnections,
    dashboardMedianMs: dashboardTimes[1],
    dashboardAllMs: dashboardTimes,
    paymentMedianMs: paymentTimes[1],
    paymentAllMs: paymentTimes,
  };
}

async function run() {
  console.log("=== BENCHMARK CONNECTION_LIMIT (1 vs 5 vs 10) ===");
  for (const limit of [1, 5, 10]) {
    const res = await measureForPoolMax(limit);
    console.log(`\nconnection_limit=${res.maxConnections} :`);
    console.log(`  - /dashboard          : ${res.dashboardMedianMs} ms (runs: ${res.dashboardAllMs.join(", ")})`);
    console.log(`  - /dashboard/payments : ${res.paymentMedianMs} ms (runs: ${res.paymentAllMs.join(", ")})`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
