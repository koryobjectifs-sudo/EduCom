const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Connected to DB successfully.");

  // 1. Delete all Exeat / Transfert requirements
  const delExeat = await client.query(`
    DELETE FROM "DocumentRequirement" 
    WHERE label ILIKE '%transfert%' 
       OR label ILIKE '%exeat%' 
       OR "shortLabel" ILIKE '%transfert%' 
       OR "shortLabel" ILIKE '%exeat%'
  `);
  console.log(`Deleted ${delExeat.rowCount} exeat/transfert requirements.`);

  // 2. Delete duplicates keeping one row per (schoolId, cycle, label)
  const delDuplicates = await client.query(`
    WITH ranked AS (
      SELECT id, "schoolId", cycle, label,
             ROW_NUMBER() OVER(PARTITION BY "schoolId", cycle, label ORDER BY "createdAt" ASC, id ASC) as rn,
             FIRST_VALUE(id) OVER(PARTITION BY "schoolId", cycle, label ORDER BY "createdAt" ASC, id ASC) as primary_id
      FROM "DocumentRequirement"
    )
    DELETE FROM "DocumentRequirement"
    WHERE id IN (
      SELECT id FROM ranked WHERE rn > 1
    );
  `);
  console.log(`Deleted ${delDuplicates.rowCount} duplicate requirements.`);

  // 3. Check remaining
  const remaining = await client.query(`
    SELECT id, "schoolId", cycle, label, "shortLabel", source, required, position 
    FROM "DocumentRequirement" 
    ORDER BY "schoolId", cycle, position
  `);
  console.log(`Remaining total requirements count: ${remaining.rows.length}`);
  console.log(remaining.rows);

  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
