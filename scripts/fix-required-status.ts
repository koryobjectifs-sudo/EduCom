import { Client } from "pg";
import { config } from "dotenv";
config();

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to PostgreSQL");

  // Ensure official core requirements are strictly marked required = true across all schools
  await client.query(`
    UPDATE "DocumentRequirement" 
    SET "required" = true 
    WHERE label IN (
      'Extrait ou bulletin de naissance',
      'Acte d''état civil (bulletin, extrait ou jugement)',
      'Acte d''état civil',
      'Fiche scolaire / certificat de scolarité',
      'Fiche scolaire',
      'Demande d''inscription',
      'Certificat de scolarité préscolaire',
      'Certificat de transfert (exeat)'
    );

    UPDATE "DocumentRequirement" 
    SET "required" = false 
    WHERE label IN (
      'Bulletin de l''année précédente',
      'Relevé de notes CFEE',
      'Relevé de notes BFEM',
      'Règlement intérieur signé'
    );
  `);

  console.log("Updated requirements 'required' status.");
  await client.end();
}

run().catch(console.error);
