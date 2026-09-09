import { Client } from "pg";
import { OFFICIAL_REQUIREMENTS_BY_CYCLE } from "../src/lib/officialRequirements";

const SHORT_LABELS: Record<string, string> = {
  "Extrait ou bulletin de naissance": "Naissance",
  "Acte d'état civil (bulletin, extrait ou jugement)": "État civil",
  "Acte d'état civil": "État civil",
  "Certificat de scolarité préscolaire": "Scol. présc.",
  "Fiche scolaire / certificat de scolarité": "Fiche scol.",
  "Fiche scolaire": "Fiche scol.",
  "Demande d'inscription": "Demande inscr.",
  "Certificat de transfert (exeat)": "Exeat",
  "Relevé de notes CFEE": "Relevé CFEE",
  "Relevé de notes BFEM": "Relevé BFEM",
  "Bulletin de l'année précédente": "Bulletin N-1",
  "Photos d'identité": "Photos",
  "Fiche de renseignements signée": "Fiche rens.",
  "Pièce d'identité du tuteur": "CNI Tuteur",
  "Personnes autorisées à récupérer l'enfant": "Personnes aut.",
  "Règlement intérieur signé": "Règlement",
};

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Aucune variable DIRECT_URL ou DATABASE_URL trouvée.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log(" Connected to PostgreSQL");

  try {
    // 1. Add columns safely
    console.log("🛠️ Adding columns...");
    await client.query(`
      ALTER TABLE "DocumentRequirement" ADD COLUMN IF NOT EXISTS "shortLabel" TEXT;
      ALTER TABLE "StudentDocument" ADD COLUMN IF NOT EXISTS "uploadedByRole" TEXT;
    `);
    console.log("✅ Columns added successfully.");

    // 2. Fix unrealistic birth years for students with 2026 birth dates
    console.log("🛠️ Correcting student birth years...");
    const studentsRes = await client.query(`
      SELECT s.id, s."dateOfBirth", c.name as class_name, c.cycle
      FROM "Student" s
      LEFT JOIN "Enrollment" e ON e."studentId" = s.id
      LEFT JOIN "Class" c ON c.id = e."classId"
      WHERE s."dateOfBirth" >= '2025-01-01'
    `);

    console.log(`Found ${studentsRes.rows.length} students with birth year >= 2025`);

    for (const row of studentsRes.rows) {
      const dob = new Date(row.dateOfBirth);
      const className = (row.class_name || "").toUpperCase();
      let targetYear = 2017; // Default 9 ans

      if (className.includes("TPS") || className.includes("PS")) targetYear = 2023; // 3 ans
      else if (className.includes("MS")) targetYear = 2022; // 4 ans
      else if (className.includes("GS")) targetYear = 2021; // 5 ans
      else if (className.includes("CI")) targetYear = 2020; // 6 ans (some 5)
      else if (className.includes("CP")) targetYear = 2019; // 7 ans
      else if (className.includes("CE1")) targetYear = 2018; // 8 ans
      else if (className.includes("CE2")) targetYear = 2017; // 9 ans
      else if (className.includes("CM1")) targetYear = 2016; // 10 ans
      else if (className.includes("CM2")) targetYear = 2015; // 11 ans
      else if (className.includes("6")) targetYear = 2014; // 12 ans
      else if (className.includes("5")) targetYear = 2013; // 13 ans
      else if (className.includes("4")) targetYear = 2012; // 14 ans
      else if (className.includes("3")) targetYear = 2011; // 15 ans
      else if (className.includes("2NDE") || className.includes("SECONDE")) targetYear = 2010; // 16 ans
      else if (className.includes("1ERE") || className.includes("PREMIERE")) targetYear = 2009; // 17 ans
      else if (className.includes("TLE") || className.includes("TERMINALE")) targetYear = 2008; // 18 ans

      dob.setFullYear(targetYear);

      await client.query(`UPDATE "Student" SET "dateOfBirth" = $1 WHERE id = $2`, [dob.toISOString(), row.id]);
    }
    console.log("✅ Student birth dates updated.");

    // 3. Update / Seed DocumentRequirement shortLabel & requirements for existing schools
    const schoolsRes = await client.query(`SELECT id FROM "School"`);
    for (const school of schoolsRes.rows) {
      const schoolId = school.id;
      
      // Update short labels on existing requirements
      const existingReqs = await client.query(`SELECT id, label FROM "DocumentRequirement" WHERE "schoolId" = $1`, [schoolId]);
      for (const req of existingReqs.rows) {
        const short = SHORT_LABELS[req.label] || req.label.slice(0, 14);
        await client.query(`UPDATE "DocumentRequirement" SET "shortLabel" = $1 WHERE id = $2`, [short, req.id]);
      }
    }
    console.log("✅ Requirements short labels updated.");

  } finally {
    await client.end();
  }
}

main().catch(console.error);
