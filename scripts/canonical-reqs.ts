import { Client } from "pg";
import { config } from "dotenv";
config();

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to PostgreSQL");

  // Remove old duplicates
  await client.query(`
    DELETE FROM "DocumentRequirement" 
    WHERE label IN (
      'Extrait de naissance original (moins de 3 mois)',
      'Extrait de naissance (moins de 3 mois)',
      'Dossier scolaire ou livret de notes de l''année précédente'
    );
  `);

  // Set canonical shortLabels strictly
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Acte de naissance' 
    WHERE label = 'Extrait ou bulletin de naissance' OR label ILIKE '%état civil%';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Certif. préscolaire' 
    WHERE label = 'Certificat de scolarité préscolaire';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Fiche scolaire' 
    WHERE label = 'Fiche scolaire / certificat de scolarité' OR label = 'Fiche scolaire';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Demande d''inscr.' 
    WHERE label = 'Demande d''inscription';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Exeat' 
    WHERE label = 'Certificat de transfert (exeat)';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Relevé CFEE' 
    WHERE label = 'Relevé de notes CFEE';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Relevé BFEM' 
    WHERE label = 'Relevé de notes BFEM';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Bulletin N-1' 
    WHERE label = 'Bulletin de l''année précédente';

    UPDATE "DocumentRequirement" 
    SET "shortLabel" = 'Règlement' 
    WHERE label = 'Règlement intérieur signé';
  `);

  const finalReqs = await client.query(`
    SELECT DISTINCT label, "shortLabel", cycle, source, category, required, conditional 
    FROM "DocumentRequirement" 
    ORDER BY cycle, "shortLabel"
  `);
  console.log("Exigences actives canoniques :");
  console.table(finalReqs.rows);

  await client.end();
}

run().catch(console.error);
