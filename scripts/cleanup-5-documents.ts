import { Client } from "pg";
import { config } from "dotenv";
config();

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to PostgreSQL");

  // 1. Les 5 documents à supprimer définitivement
  const labelsToDelete = [
    "%quitus%",
    "%radiation%",
    "%tuteur%",
    "%photo%",
    "%autoris%",
    "%renseignement%",
    "%vaccin%",
    "%Test - Extrait%",
  ];

  console.log("Suppression des 5 types de pièces facultatives/internes...");
  
  for (const pattern of labelsToDelete) {
    // Delete student documents tied to these requirements first
    await client.query(`
      DELETE FROM "StudentDocument" 
      WHERE "requirementId" IN (
        SELECT id FROM "DocumentRequirement" WHERE label ILIKE $1
      )
    `, [pattern]);

    // Delete the document requirements themselves
    const res = await client.query(`
      DELETE FROM "DocumentRequirement" 
      WHERE label ILIKE $1
    `, [pattern]);
    
    console.log(`Deleted requirements matching ${pattern}: ${res.rowCount}`);
  }

  // 2. Nettoyage et normalisation stricte des shortLabels restants
  console.log("Normalisation des shortLabels restants...");

  // Acte de naissance
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Acte de naissance' 
    WHERE label ILIKE '%naissance%' OR label ILIKE '%état civil%';
  `);

  // Certificat de scolarité préscolaire
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Certif. préscolaire' 
    WHERE label ILIKE '%préscolaire%';
  `);

  // Fiche scolaire
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Fiche scolaire' 
    WHERE label ILIKE '%fiche scolaire%' OR label ILIKE '%certificat de scolarité%';
  `);

  // Demande d'inscription
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Demande d''inscr.' 
    WHERE label ILIKE '%demande d''inscription%';
  `);

  // Exeat / Transfert
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Exeat (Transfert)' 
    WHERE label ILIKE '%transfert%' OR label ILIKE '%exeat%';
  `);

  // Relevé CFEE
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Relevé CFEE' 
    WHERE label ILIKE '%cfee%';
  `);

  // Relevé BFEM
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Relevé BFEM' 
    WHERE label ILIKE '%bfem%';
  `);

  // Bulletin N-1
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Bulletin N-1' 
    WHERE (label ILIKE '%bulletin%' AND label NOT ILIKE '%naissance%') OR label ILIKE '%livret%';
  `);

  // Règlement intérieur
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Règlement' 
    WHERE label ILIKE '%règlement%';
  `);

  // 3. Afficher l'état final des exigences
  const finalReqs = await client.query(`
    SELECT DISTINCT label, "shortLabel", cycle, source, category, required, conditional 
    FROM "DocumentRequirement" 
    ORDER BY cycle, "shortLabel"
  `);
  console.log("Exigences actives restantes :");
  console.table(finalReqs.rows);

  await client.end();
}

run().catch(console.error);
