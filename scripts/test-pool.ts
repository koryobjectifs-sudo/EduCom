import { Pool } from "pg";

async function testParallel(maxConn: number) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: maxConn,
  });

  const start = performance.now();
  await Promise.all([
    pool.query("SELECT 1"),
    pool.query("SELECT 2"),
    pool.query("SELECT 3"),
    pool.query("SELECT 4"),
    pool.query("SELECT 5"),
    pool.query("SELECT 6"),
    pool.query("SELECT 7"),
    pool.query("SELECT 8"),
  ]);
  const total = Math.round(performance.now() - start);
  await pool.end();
  console.log(`Pool max=${maxConn} -> 8 requêtes parallèles en : ${total}ms`);
  return total;
}

async function run() {
  await testParallel(1);
  await testParallel(8);
  process.exit(0);
}

run().catch(console.error);
