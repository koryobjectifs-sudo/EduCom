/**
 * GARDE D'INTÉGRITÉ DU CYCLE SCOLAIRE (Prisma EducationalCycle)
 *
 * Échoue si une valeur de cycle hors enum Prisma apparaît dans le code
 * ou si des vocabulaires parallèles (COLLEGE, LYCEE, MATERNELLE) sont réintroduits
 * dans les formulaires, sélecteurs ou configurations de cycles.
 *
 * Exécution :
 *   npm run script -- scripts/verify-cycle-guards.ts
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
  } else {
    failures++;
    console.error(`  ❌ ÉCHEC: ${msg}`);
  }
}

console.log("\n═════════════ GARDE D'INTÉGRITÉ DU CYCLE SCOLAIRE ═════════════\n");

// 1. Lire les valeurs officielles de EducationalCycle depuis prisma/schema.prisma
const schemaContent = readFileSync("prisma/schema.prisma", "utf8");
const enumMatch = schemaContent.match(/enum\s+EducationalCycle\s*\{([\s\S]*?)\}/);
if (!enumMatch) {
  console.error("❌ Impossible de trouver l'enum EducationalCycle dans prisma/schema.prisma");
  process.exit(1);
}

const officialCycles = enumMatch[1]
  .split("\n")
  .map((l) => l.replace(/\/\/.*$/, "").trim())
  .filter((l) => /^[A-Z_]+$/.test(l));

console.log(`[1] Valeurs officielles EducationalCycle (${officialCycles.length}) :`, officialCycles.join(", "));
assert(officialCycles.includes("MOYEN"), "EducationalCycle contient MOYEN");
assert(officialCycles.includes("SECONDAIRE"), "EducationalCycle contient SECONDAIRE");
assert(officialCycles.includes("ELEMENTAIRE"), "EducationalCycle contient ELEMENTAIRE");
assert(officialCycles.includes("PRESCOLAIRE"), "EducationalCycle contient PRESCOLAIRE");
assert(!officialCycles.includes("COLLEGE"), "EducationalCycle ne contient PAS COLLEGE");
assert(!officialCycles.includes("LYCEE"), "EducationalCycle ne contient PAS LYCEE");
assert(!officialCycles.includes("MATERNELLE"), "EducationalCycle ne contient PAS MATERNELLE");

// 2. Vérifier les formulaires de création et sélection de classe
console.log("\n[2] Vérification des sélecteurs de cycle dans les formulaires UI :");

const newClassForm = readFileSync("src/app/dashboard/classes/new/form.tsx", "utf8");
assert(
  !newClassForm.includes('value="COLLEGE"') &&
  !newClassForm.includes('value="LYCEE"') &&
  !newClassForm.includes('value="MATERNELLE"'),
  "classes/new/form.tsx ne soumet aucune valeur hors enum (COLLEGE/LYCEE/MATERNELLE)"
);
assert(
  newClassForm.includes('value="MOYEN"') &&
  newClassForm.includes('value="SECONDAIRE"'),
  "classes/new/form.tsx contient MOYEN et SECONDAIRE"
);

const studentsUnifiedClient = readFileSync("src/app/dashboard/students/StudentsUnifiedClient.tsx", "utf8");
assert(
  !studentsUnifiedClient.includes('value="COLLEGE"') &&
  !studentsUnifiedClient.includes('value="LYCEE"') &&
  !studentsUnifiedClient.includes('value="MATERNELLE"'),
  "StudentsUnifiedClient.tsx ne soumet aucune valeur hors enum (COLLEGE/LYCEE/MATERNELLE)"
);

// 3. Vérifier CYCLES_CONFIG dans ClassListClient.tsx
console.log("\n[3] Vérification de CYCLES_CONFIG dans ClassListClient.tsx :");
const classListClient = readFileSync("src/app/dashboard/classes/ClassListClient.tsx", "utf8");
for (const cycleId of ["PRESCOLAIRE", "ELEMENTAIRE", "MOYEN", "SECONDAIRE", "AUTRE"]) {
  assert(
    classListClient.includes(`id: "${cycleId}"`),
    `CYCLES_CONFIG contient l'id officiel "${cycleId}"`
  );
}
assert(
  !classListClient.includes('id: "COLLEGE"') &&
  !classListClient.includes('id: "LYCEE"') &&
  !classListClient.includes('id: "MATERNELLE"'),
  "CYCLES_CONFIG ne contient aucun identifiant hors enum"
);

// 4. Scanner récursivement tout src/ pour interdire les affectations directes 'cycle: "COLLEGE"' ou 'cycle: "LYCEE"'
console.log("\n[4] Scan exhaustif de src/ contre les assignations de cycle hors enum :");

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== "dist") {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allSrcFiles = walkDir("src");
const forbiddenCyclePatterns = [
  /cycle:\s*["']COLLEGE["']/i,
  /cycle:\s*["']LYCEE["']/i,
  /cycle:\s*["']MATERNELLE["']/i,
  /cycle\s*===\s*["']COLLEGE["'](?!\s*\|\|\s*cycle)/i,
  /<option[^>]*value=["']COLLEGE["']/i,
  /<option[^>]*value=["']LYCEE["']/i,
  /<option[^>]*value=["']MATERNELLE["']/i,
];

let forbiddenFound = 0;
for (const filePath of allSrcFiles) {
  const content = readFileSync(filePath, "utf8");
  for (const pattern of forbiddenCyclePatterns) {
    if (pattern.test(content)) {
      // Ignorer les fonctions de normalisation d'anciens alias (ex: normalizeCycleId, deduceCycleAndSerie)
      if (filePath.includes("import/utils.ts") || filePath.includes("normalizeCycleId")) continue;
      console.error(`  ❌ Motif interdit détecté dans ${filePath}: ${pattern}`);
      forbiddenFound++;
    }
  }
}

assert(forbiddenFound === 0, `Scan src/ : ${forbiddenFound} violation(s) trouvée(s)`);

console.log("\n═══════════════════════════════════════════════════════════════");
if (failures > 0) {
  console.error(`❌ ÉCHEC : ${failures} assertion(s) non respectée(s).\n`);
  process.exit(1);
} else {
  console.log("✅ SUCCÈS : Tous les tests de garde du cycle scolaire ont réussi.\n");
  process.exit(0);
}
