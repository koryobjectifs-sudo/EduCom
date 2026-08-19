/**
 * Vérifie la sécurisation des server actions (LOT 01). LECTURE SEULE.
 *
 * Une server action est un point d'entrée HTTP appelable directement, sans
 * passer par l'écran qui l'invoque. Trois propriétés sont contrôlées :
 *
 *   1. GARDE       chaque action de mutation authentifie son appelant ;
 *   2. NON-CONFIANCE aucune signature n'accepte de `schoolId` venu du client ;
 *   3. RÉSOLUTION  plus aucune école résolue par `findFirst()` sans `orderBy`.
 *
 * Puis la matrice de rôles est déroulée sur `hasAccess()` pour montrer qui
 * passe réellement chaque garde — le contrôle d'autorisation réutilise cette
 * fonction, donc c'est elle qui fait foi.
 *
 *   npm run script -- scripts/verify-action-guards.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { hasAccess, RoleType, ROLE_PERMISSIONS } from "../src/lib/permissions";

const ROOT = "src";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "generated") continue;
      walk(p, out);
    } else if (e === "actions.ts") out.push(p);
  }
  return out;
}

// Actions pré-authentification par conception : l'appelant n'a pas encore de
// session. Elles sont exclues du contrôle de garde, mais pas de celui sur la
// provenance du schoolId.
const PREAUTH = new Set([
  "src/app/register/actions.ts",
  "src/app/invite/actions.ts",
  "src/app/login/actions.ts",
  "src/app/s/[id]/actions.ts",
]);

/**
 * Retire commentaires de bloc et de ligne.
 *
 * Indispensable : les docblocks de ces actions *décrivent* la faille corrigée
 * et citent donc `prisma.school.findFirst()` en toutes lettres. Scanner le
 * fichier brut ferait échouer le contrôle [3] sur sa propre documentation.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const files = walk(ROOT).sort();
let fail = 0;

console.log(`\n=== GARDES DES SERVER ACTIONS ===\n`);
console.log(`Fichiers d'actions trouvés : ${files.length}\n`);

// ---- 1. GARDE ----
console.log(`[1] GARDE — l'appelant est-il authentifié ?\n`);
for (const f of files) {
  const src = stripComments(readFileSync(f, "utf8"));
  const writes = /prisma\.\w+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/.test(src);
  const guarded = /requireActionContext|getUser\(\)/.test(src);
  const preauth = PREAUTH.has(f);

  let verdict: string;
  if (preauth) verdict = "PRÉ-AUTH (exclu)";
  else if (!writes) verdict = "OK    (aucune écriture)";
  else if (guarded) verdict = "OK    gardé";
  else { verdict = "ÉCHEC non gardé"; fail++; }

  console.log(`    ${verdict.padEnd(24)} ${f.replace("src/", "")}`);
}

// ---- 2. NON-CONFIANCE ----
console.log(`\n[2] NON-CONFIANCE — une signature accepte-t-elle un schoolId du client ?\n`);
let trustFail = 0;
for (const f of files) {
  const src = stripComments(readFileSync(f, "utf8"));
  // Signatures exportées : on cherche un paramètre nommé schoolId
  const sigs = src.match(/export\s+async\s+function\s+\w+\s*\(([\s\S]*?)\)\s*\{/g) || [];
  for (const sig of sigs) {
    const head = sig.slice(0, sig.indexOf("{"));
    if (/\bschoolId\s*[:?]/.test(head)) {
      const name = head.match(/function\s+(\w+)/)?.[1] ?? "?";
      console.log(`    ÉCHEC ${f.replace("src/", "")} → ${name}() accepte schoolId en argument`);
      trustFail++; fail++;
    }
  }
}
if (trustFail === 0) console.log(`    OK    aucune action n'accepte de schoolId depuis le client.`);

// ---- 3. RÉSOLUTION ----
console.log(`\n[3] RÉSOLUTION — école résolue par findFirst() sans orderBy ?\n`);
let resolveFail = 0;
for (const f of files) {
  const src = stripComments(readFileSync(f, "utf8"));
  const m = src.match(/prisma\.school\.findFirst\s*\(([^)]*)\)/g);
  if (m) {
    for (const call of m) {
      if (!/orderBy/.test(call)) {
        console.log(`    ÉCHEC ${f.replace("src/", "")} → ${call.replace(/\s+/g, " ").slice(0, 60)}`);
        resolveFail++; fail++;
      }
    }
  }
}
if (resolveFail === 0) console.log(`    OK    plus aucune résolution d'école par findFirst() non ordonné.`);

// ---- 4. MATRICE DE RÔLES ----
console.log(`\n[4] MATRICE DE RÔLES — qui franchit réellement chaque garde ?\n`);
const guards: [string, string][] = [
  ["updateSchoolSettings", "/dashboard/settings"],
  ["createStudent", "/dashboard/students"],
  ["submitDocumentRequest", "/dashboard/documents"],
  ["sendBulkWhatsAppMessages", "/dashboard/communications"],
  ["createSurvey", "/dashboard/communications"],
  ["completeOnboarding", "(authentification seule)"],
];
const roles = Object.keys(ROLE_PERMISSIONS) as RoleType[];

const w = 26;
console.log(`    ${"ACTION".padEnd(w)} ${roles.map(r => r.slice(0, 4).padEnd(5)).join("")}`);
for (const [action, path] of guards) {
  const cells = roles.map(r => {
    if (path.startsWith("(")) return "oui".padEnd(5);
    return (hasAccess(r, path) ? "oui" : "—").padEnd(5);
  });
  console.log(`    ${action.padEnd(w)} ${cells.join("")}`);
}
console.log(`\n    Légende : ${roles.map(r => `${r.slice(0, 4)}=${r}`).join("  ")}`);

// Contrôle ciblé : le trou constaté avant le lot 01
const parentBlocked = !hasAccess("PARENT", "/dashboard/settings");
console.log(`\n    ${parentBlocked ? "OK   " : "ÉCHEC"} PARENT ne peut plus écrire les paramètres de l'école`);
if (!parentBlocked) fail++;

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "toutes les propriétés vérifiées" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
