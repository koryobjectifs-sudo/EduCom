const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT "schoolId", "cycle", "label", COUNT(*)
    FROM "DocumentRequirement"
    GROUP BY "schoolId", "cycle", "label"
    HAVING COUNT(*) > 1;
  `);
  console.log('--- RESULTAT REQUETE DOUBLONS ---');
  console.log('LIGNES RETOURNEES:', res.rowCount);
  console.log('DONNEES:', JSON.stringify(res.rows, null, 2));

  if (res.rowCount > 0) {
    const diffs = await client.query(`
      SELECT dr."schoolId", dr."cycle", dr."label", dr."required", dr."source", dr."order"
      FROM "DocumentRequirement" dr
      INNER JOIN (
        SELECT "schoolId", "cycle", "label"
        FROM "DocumentRequirement"
        GROUP BY "schoolId", "cycle", "label"
        HAVING COUNT(*) > 1
      ) dup ON dr."schoolId" = dup."schoolId" AND dr."cycle" = dup."cycle" AND dr."label" = dup."label"
      ORDER BY dr."schoolId", dr."cycle", dr."label", dr."createdAt" ASC;
    `);
    console.log('--- DETAILS DES DOUBLONS AVEC CHAMPS ---');
    console.log(JSON.stringify(diffs.rows, null, 2));
  }
  await client.end();
}

main().catch(console.error);
