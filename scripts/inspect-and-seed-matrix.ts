import { Client } from "pg";
import { config } from "dotenv";
config();

type MatrixRow = {
  label: string;
  shortLabel: string;
  category: string;
  source: "OFFICIEL" | "ETABLISSEMENT";
  maternelle: { required: boolean; conditional?: string } | null;
  elementaire: { required: boolean; conditional?: string } | null;
  college: { required: boolean; conditional?: string } | null;
  lycee: { required: boolean; conditional?: string } | null;
};

const OFFICIAL_MATRIX: MatrixRow[] = [
  {
    label: "Extrait ou bulletin de naissance",
    shortLabel: "Acte de naissance",
    category: "IDENTITE",
    source: "OFFICIEL",
    maternelle: { required: true },
    elementaire: { required: true },
    college: { required: true },
    lycee: { required: true },
  },
  {
    label: "Certificat de scolarité préscolaire",
    shortLabel: "Certif. préscolaire",
    category: "SCOLARITE",
    source: "OFFICIEL",
    maternelle: null,
    elementaire: { required: true, conditional: "age < 6 in CI" },
    college: null,
    lycee: null,
  },
  {
    label: "Fiche scolaire / certificat de scolarité",
    shortLabel: "Fiche scolaire",
    category: "SCOLARITE",
    source: "OFFICIEL",
    maternelle: null,
    elementaire: { required: true },
    college: { required: true },
    lycee: { required: true },
  },
  {
    label: "Demande d'inscription",
    shortLabel: "Demande d'inscr.",
    category: "INSCRIPTION",
    source: "OFFICIEL",
    maternelle: null,
    elementaire: null,
    college: null,
    lycee: { required: true },
  },
  {
    label: "Certificat de transfert (exeat)",
    shortLabel: "Exeat / Transfert",
    category: "TRANSFERT",
    source: "OFFICIEL",
    maternelle: { required: true, conditional: "transfert" },
    elementaire: { required: true, conditional: "transfert" },
    college: { required: true, conditional: "transfert" },
    lycee: { required: true, conditional: "transfert" },
  },
  {
    label: "Relevé de notes CFEE",
    shortLabel: "Relevé CFEE",
    category: "EXAMENS",
    source: "ETABLISSEMENT",
    maternelle: null,
    elementaire: null,
    college: { required: false },
    lycee: null,
  },
  {
    label: "Relevé de notes BFEM",
    shortLabel: "Relevé BFEM",
    category: "EXAMENS",
    source: "ETABLISSEMENT",
    maternelle: null,
    elementaire: null,
    college: null,
    lycee: { required: false },
  },
  {
    label: "Bulletin de l'année précédente",
    shortLabel: "Bulletin N-1",
    category: "SCOLARITE",
    source: "ETABLISSEMENT",
    maternelle: null,
    elementaire: { required: false },
    college: { required: false },
    lycee: { required: false },
  },
  {
    label: "Photos d'identité",
    shortLabel: "Photos d'identité",
    category: "IDENTITE",
    source: "ETABLISSEMENT",
    maternelle: { required: false },
    elementaire: { required: false },
    college: { required: false },
    lycee: { required: false },
  },
  {
    label: "Fiche de renseignements signée",
    shortLabel: "Fiche de rens.",
    category: "INSCRIPTION",
    source: "ETABLISSEMENT",
    maternelle: { required: false },
    elementaire: { required: false },
    college: { required: false },
    lycee: { required: false },
  },
  {
    label: "Pièce d'identité du tuteur",
    shortLabel: "CNI Tuteur",
    category: "IDENTITE",
    source: "ETABLISSEMENT",
    maternelle: { required: false },
    elementaire: { required: false },
    college: { required: false },
    lycee: { required: false },
  },
  {
    label: "Personnes autorisées à récupérer l'enfant",
    shortLabel: "Personnes aut.",
    category: "INSCRIPTION",
    source: "ETABLISSEMENT",
    maternelle: { required: true },
    elementaire: { required: false },
    college: null,
    lycee: null,
  },
  {
    label: "Règlement intérieur signé",
    shortLabel: "Règlement",
    category: "INSCRIPTION",
    source: "ETABLISSEMENT",
    maternelle: { required: false },
    elementaire: { required: false },
    college: { required: false },
    lycee: { required: false },
  },
];

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to PostgreSQL");

  // 1. Get schools with their active cycles
  const schoolsRes = await client.query(`SELECT id, name FROM "School"`);
  const classesRes = await client.query(`SELECT DISTINCT "schoolId", cycle FROM "Class" WHERE cycle IS NOT NULL`);
  
  const cyclesBySchool = new Map<string, Set<string>>();
  for (const c of classesRes.rows) {
    if (!cyclesBySchool.has(c.schoolId)) {
      cyclesBySchool.set(c.schoolId, new Set());
    }
    cyclesBySchool.get(c.schoolId)!.add(c.cycle);
  }

  // 2. Build rows to insert in bulk
  const rowsToInsert: any[] = [];
  const defaultCycles = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE"];

  for (const school of schoolsRes.rows) {
    const schoolCycles = Array.from(cyclesBySchool.get(school.id) || defaultCycles);

    for (const row of OFFICIAL_MATRIX) {
      for (const cycle of schoolCycles) {
        let cycleConfig: { required: boolean; conditional?: string } | null = null;
        if (cycle === "MATERNELLE") cycleConfig = row.maternelle;
        else if (cycle === "ELEMENTAIRE") cycleConfig = row.elementaire;
        else if (cycle === "COLLEGE") cycleConfig = row.college;
        else if (cycle === "LYCEE") cycleConfig = row.lycee;

        if (!cycleConfig) continue;

        rowsToInsert.push({
          schoolId: school.id,
          label: row.label,
          shortLabel: row.shortLabel,
          cycle,
          category: row.category,
          source: row.source,
          required: cycleConfig.required,
          conditional: cycleConfig.conditional || null,
        });
      }
    }
  }

  console.log(`Prepared ${rowsToInsert.length} requirement rows to batch insert.`);

  // 3. Batch chunk insert
  const chunkSize = 200;
  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const valuePlaceholders: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const r of chunk) {
      valuePlaceholders.push(`(gen_random_uuid(), $${idx}, $${idx+1}, $${idx+2}, $${idx+3}::"EducationalCycle", $${idx+4}::"DocCategory", $${idx+5}::"RequirementSource", $${idx+6}, $${idx+7}, true, false, 0, NOW(), NOW())`);
      values.push(r.schoolId, r.label, r.shortLabel, r.cycle, r.category, r.source, r.required, r.conditional);
      idx += 8;
    }

    const query = `
      INSERT INTO "DocumentRequirement" (id, "schoolId", label, "shortLabel", cycle, category, source, required, conditional, active, pinned, position, "createdAt", "updatedAt")
      VALUES ${valuePlaceholders.join(", ")}
      ON CONFLICT DO NOTHING;
    `;

    await client.query(query, values);
  }

  // 4. Update shortLabel for all existing requirements to match exact shortLabels
  console.log("Updating short labels across all existing records...");
  await client.query(`
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Acte de naissance' WHERE label ILIKE '%naissance%' OR label ILIKE '%état civil%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Certif. préscolaire' WHERE label ILIKE '%préscolaire%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Fiche scolaire' WHERE label ILIKE '%fiche scolaire%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Demande d''inscr.' WHERE label ILIKE '%demande d''inscription%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Exeat / Transfert' WHERE label ILIKE '%transfert%' OR label ILIKE '%quitus%' OR label ILIKE '%radiation%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Relevé CFEE' WHERE label ILIKE '%cfee%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Relevé BFEM' WHERE label ILIKE '%bfem%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Bulletin N-1' WHERE label ILIKE '%bulletin%' OR label ILIKE '%livret%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Photos d''identité' WHERE label ILIKE '%photo%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Fiche de rens.' WHERE label ILIKE '%renseignement%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'CNI Tuteur' WHERE label ILIKE '%tuteur%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Personnes aut.' WHERE label ILIKE '%autoris%';
    UPDATE "DocumentRequirement" SET "shortLabel" = 'Règlement' WHERE label ILIKE '%règlement%';
  `);

  console.log("✅ Batch seed completed successfully!");
  await client.end();
}

run().catch(console.error);
