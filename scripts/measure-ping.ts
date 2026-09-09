import { Pool } from "pg";

async function measurePing() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@"));
  console.log("DIRECT_URL:  ", process.env.DIRECT_URL?.replace(/:[^:@]+@/, ":***@"));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  const client = await pool.connect();
  // Warmup
  await client.query("SELECT 1");

  const runs: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await client.query("SELECT 1");
    const elapsed = performance.now() - start;
    runs.push(elapsed);
  }

  client.release();
  await pool.end();

  runs.sort((a, b) => a - b);
  const min = Math.round(runs[0]);
  const max = Math.round(runs[runs.length - 1]);
  const median = Math.round(runs[Math.floor(runs.length / 2)]);
  const avg = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length);

  console.log("\n=== MESURE DE LATENCE RÉSEAU (SELECT 1 - 20 runs) ===");
  console.log("Min    :", min, "ms");
  console.log("Médiane:", median, "ms");
  console.log("Moyenne:", avg, "ms");
  console.log("Max    :", max, "ms");
}

measurePing().catch(console.error);
