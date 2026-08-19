/**
 * Vérifie la zone Documents (LOT 09). LECTURE SEULE.
 *
 *   1. INTÉGRITÉ IMPRESSION  le markup imprimable des 7 générateurs est intact ;
 *   2. CATALOGUE             le hub liste tous les générateurs présents ;
 *   3. ISOLATION             chaque page filtre par schoolId ;
 *   4. PERMISSIONS           via hasAccess(), sans table parallèle ;
 *   5. DONNÉES FICTIVES      aucun nom, domaine ni contact inventé ;
 *   6. SOCLE                 tokens et primitives sur la zone APPLICATION ;
 *   7. ÉDITION               les zones éditables sont signalées, sans toucher au print ;
 *   8. ÉTATS                 vide / chargement / erreur.
 *
 *   npm run script -- scripts/verify-documents.ts
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { hasAccess, ROLE_PERMISSIONS, type RoleType } from "../src/lib/permissions";
import { DOCUMENT_KINDS } from "../src/lib/documents";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
const raw = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  raw(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const DOCS = "src/app/dashboard/documents";
const GENERATORS = readdirSync(DOCS)
  .filter((d) => statSync(join(DOCS, d)).isDirectory() && existsSync(join(DOCS, d, "Generator.tsx")));

console.log(`\n=== ZONE DOCUMENTS ===\n`);

/**
 * Relevé de référence des styles d'impression et des zones éditables.
 *
 * ⚠️ **Piège de mesure, à ne pas reproduire.** Le premier relevé avait été pris
 * avec `grep -c`, qui compte les LIGNES contenant le motif, tandis que ce script
 * compte les OCCURRENCES. Une ligne portant trois classes `print:` valait 1 d'un
 * côté et 3 de l'autre : les sept générateurs sont alors apparus « en
 * régression », dont cinq que le lot 09 n'a jamais ouverts. Vérifié par les
 * dates de modification : seuls `receipt` et `invoice` ont été touchés.
 *
 * Les valeurs ci-dessous sont donc en **occurrences**, la même unité que le
 * contrôle. Un relevé et son contrôle doivent mesurer la même chose.
 *
 * Le lot 09 n'a modifié dans ces deux fichiers que des replis de données
 * fictives — aucune classe `print:`, aucun `contentEditable`, aucun
 * `execCommand` ajouté ni retiré.
 */
const PRINT_BASELINE: Record<string, { print: number; ce: number; exec: number }> = {
  certificate:   { print: 19, ce: 7,  exec: 8 },
  reminder:      { print: 24, ce: 0,  exec: 0 },
  "info-sheet":  { print: 15, ce: 10, exec: 8 },
  receipt:       { print: 15, ce: 3,  exec: 8 },
  invoice:       { print: 15, ce: 14, exec: 8 },
  "report-card": { print: 23, ce: 10, exec: 0 },
  timetable:     { print: 16, ce: 3,  exec: 8 },
};

// ---- 1. INTÉGRITÉ IMPRESSION ----
console.log(`[1] INTÉGRITÉ DU DOCUMENT IMPRIMABLE`);
console.log(`    ${GENERATORS.length} générateur(s) trouvé(s)\n`);
for (const g of GENERATORS) {
  const src = raw(join(DOCS, g, "Generator.tsx"));
  const now = {
    print: (src.match(/print:/g) ?? []).length,
    ce: (src.match(/contentEditable/g) ?? []).length,
    exec: (src.match(/execCommand/g) ?? []).length,
  };
  const base = PRINT_BASELINE[g];
  if (!base) {
    console.log(`    ÉCHEC ${g} — absent du relevé de référence`);
    fail++;
    continue;
  }
  const same = now.print === base.print && now.ce === base.ce && now.exec === base.exec;
  console.log(`    ${ok(same)} ${g.padEnd(14)} print:${now.print}/${base.print}  éditable:${now.ce}/${base.ce}  execCommand:${now.exec}/${base.exec}`);
}

// Le document doit porter un format A4 et les contrôles doivent disparaître
console.log(``);
for (const g of GENERATORS) {
  const src = raw(join(DOCS, g, "Generator.tsx"));
  const a4 = /210mm/.test(src);
  const hides = /print:hidden/.test(src);
  console.log(`    ${ok(a4 && hides)} ${g.padEnd(14)} format A4 ${a4 ? "oui" : "NON"} · contrôles masqués à l'impression ${hides ? "oui" : "NON"}`);
}

// ---- 2. CATALOGUE ----
console.log(`\n[2] CATALOGUE DU HUB`);
const catalogued = DOCUMENT_KINDS.map((d) => d.slug).sort();
const present = [...GENERATORS].sort();
const missing = present.filter((g) => !catalogued.includes(g));
const ghosts = catalogued.filter((c) => !present.includes(c));
console.log(`    ${ok(missing.length === 0)} tous les générateurs sont listés${missing.length ? ` — MANQUANTS : ${missing.join(", ")}` : ` (${present.length})`}`);
console.log(`    ${ok(ghosts.length === 0)} aucun modèle listé sans générateur${ghosts.length ? ` — FANTÔMES : ${ghosts.join(", ")}` : ""}`);
const hub = code(join(DOCS, "page.tsx"));
console.log(`    ${ok(/DOCUMENT_KINDS/.test(hub))} le hub lit le catalogue, il ne redéclare pas la liste`);
console.log(`    ${ok(!/Options d'impression/.test(hub))} bouton « Options d'impression » factice retiré`);
console.log(`    ${ok(/documentRequest\.findMany/.test(hub))} les modèles demandés sont réellement lus`);

// ---- 3. ISOLATION ----
console.log(`\n[3] ISOLATION PAR ÉTABLISSEMENT`);
const pages = readdirSync(DOCS, { recursive: true } as never) as string[];
const serverPages = (pages as string[])
  .filter((f) => typeof f === "string" && f.endsWith("page.tsx"))
  .map((f) => join(DOCS, f));
for (const f of serverPages) {
  const c = code(f);
  const queries = (c.match(/prisma\.\w+\.(findMany|count|findFirst|findUnique)/g) ?? []).length;
  const filtered = /schoolId/.test(c);
  const pass = queries === 0 || filtered;
  console.log(`    ${ok(pass)} ${f.replace(DOCS + "/", "").padEnd(34)} ${queries} requête(s)${pass ? "" : " SANS schoolId"}`);
}
const actions = code(join(DOCS, "actions.ts"));
console.log(`    ${ok(/requireActionContext/.test(actions))} actions.ts passe par requireActionContext()`);
console.log(`    ${ok(!/schoolId\s*[:,]/.test(actions.split("export")[0]))} aucun schoolId accepté depuis le client`);

// ---- 4. PERMISSIONS ----
console.log(`\n[4] PERMISSIONS`);
const validation = code(join(DOCS, "validation/page.tsx"));
const impression = code(join(DOCS, "validation/impression/page.tsx"));
console.log(`    ${ok(/hasAccess\(/.test(validation))} validation/page.tsx utilise hasAccess()`);
console.log(`    ${ok(/hasAccess\(/.test(impression))} validation/impression/page.tsx utilise hasAccess()`);
console.log(`    ${ok(!/const ALLOWED/.test(validation) && !/const ALLOWED/.test(impression))} aucune table de rôles locale`);
const ROLES = Object.keys(ROLE_PERMISSIONS) as RoleType[];
console.log(`\n    ${"RÔLE".padEnd(12)}${"documents".padEnd(12)}validation`);
for (const r of ROLES) {
  const d = hasAccess(r, "/dashboard/documents");
  const v = hasAccess(r, "/dashboard/documents/validation");
  console.log(`    ${r.padEnd(12)}${(d ? "oui" : "—").padEnd(12)}${v ? "oui" : "—"}`);
}
console.log(`\n    ${ok(hasAccess("PARENT", "/dashboard/documents") && !hasAccess("PARENT", "/dashboard/documents/validation"))} PARENT accède aux documents mais PAS à la validation`);
console.log(`    ${ok(!hasAccess("TEACHER", "/dashboard/documents/validation"))} TEACHER ne relit pas son propre travail`);

// ---- 5. DONNÉES FICTIVES ----
console.log(`\n[5] DONNÉES FICTIVES`);
const allDocs = (pages as string[])
  .filter((f) => typeof f === "string" && f.endsWith(".tsx"))
  .map((f) => join(DOCS, f));
const joined = allDocs.map(code).join("\n");
const fictions: [string, RegExp][] = [
  ["nom d'école fictif « EduCom Excellence »", /EduCom Excellence/],
  ["domaine fictif « educom.app »", /educom\.app/],
  ["adresse fictive « 123 Avenue »", /123 Avenue/],
  ["téléphone fictif « +221 77 123 45 67 »", /\+221 77 123 45 67/],
  ["email fictif « contact@educom.sn »", /contact@educom\.sn/],
  ["promesse de contact non tenue", /Nous vous contacterons/],
  ["serveur d'impression inexistant", /serveur d'impression/],
];
for (const [label, re] of fictions) {
  console.log(`    ${ok(!re.test(joined))} ${label}`);
}
// Année scolaire codée en dur : constat, pas échec — c'est une donnée métier
// absente du schéma, à traiter quand un modèle d'année scolaire existera.
const years = [...new Set(joined.match(/20\d\d[-–]20\d\d/g) ?? [])];
console.log(`    INFO  année scolaire codée en dur : ${years.length ? years.join(", ") : "aucune"}`);

// ---- 6. SOCLE (zone APPLICATION uniquement) ----
console.log(`\n[6] SOCLE — zone application`);
const appZone = [join(DOCS, "page.tsx"), join(DOCS, "drafts/DraftsList.tsx"), join(DOCS, "RequestDocumentDialog.tsx")];
for (const f of appZone) {
  const c = code(f);
  const glass = (c.match(/backdrop-blur/g) ?? []).length;
  const grad = (c.match(/bg-gradient-to-/g) ?? []).length;
  const hex = [...new Set(c.match(/#[0-9a-fA-F]{6}\b/g) ?? [])];
  const rogue = [...new Set(c.match(/\b(?:bg|text|border|hover:bg|hover:text)-(?:gray|zinc|indigo|violet|purple|pink|rose|cyan|sky|teal|lime|orange|yellow|emerald|green|red|blue|amber)-\d{2,3}\b/g) ?? [])];
  const pass = glass === 0 && grad === 0 && hex.length === 0 && rogue.length === 0;
  console.log(`    ${ok(pass)} ${f.replace(DOCS + "/", "").padEnd(26)} verre ${glass} · dégradés ${grad} · hex ${hex.length} · hors-palette ${rogue.length}`);
  if (rogue.length) console.log(`             ${rogue.slice(0, 6).join(", ")}`);
}
console.log(`    ${ok(/from "@\/components\/ui\/PageHeader"/.test(hub))} hub : PageHeader`);
console.log(`    ${ok(/from "@\/components\/ui\/Card"/.test(hub))} hub : Card`);
console.log(`    ${ok(/from "@\/components\/ui\/Modal"/.test(code(join(DOCS, "RequestDocumentDialog.tsx"))))} demande de modèle : Modal du lot 04`);

// ---- 7. ÉDITION ----
console.log(`\n[7] ZONES ÉDITABLES`);
const css = raw("src/app/globals.css");
const screenBlock = css.slice(css.indexOf("@media screen"), css.indexOf("@media print"));
console.log(`    ${ok(/\[contenteditable\]/.test(screenBlock))} indication déclarée dans @media screen`);
console.log(`    ${ok(!/\[contenteditable\]/.test(css.slice(css.indexOf("@media print"))))} AUCUNE règle contenteditable dans @media print`);
console.log(`    ${ok(/text-decoration: underline dotted/.test(screenBlock))} soulignement pointillé au repos`);
console.log(`    ${ok(/:hover/.test(screenBlock) && /:focus/.test(screenBlock))} états survol et focus distincts`);
// Aucun générateur ne doit avoir été édité pour cela
const editedForAffordance = GENERATORS.filter((g) => /doc-editable|editable-hint/.test(raw(join(DOCS, g, "Generator.tsx"))));
console.log(`    ${ok(editedForAffordance.length === 0)} aucun markup de générateur modifié pour l'indication (${editedForAffordance.length})`);

// ---- 8. ÉTATS ----
console.log(`\n[8] ÉTATS SYSTÈME`);
console.log(`    ${ok(/<EmptyState/.test(hub))} hub : état vide via la primitive`);
console.log(`    ${ok(existsSync("src/app/dashboard/error.tsx"))} error.tsx couvre la zone (héritage App Router)`);
console.log(`    ${ok(existsSync("src/app/dashboard/loading.tsx"))} loading.tsx couvre la zone`);

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "zone Documents conforme" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
