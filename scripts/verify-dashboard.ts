/**
 * Vérifie le tableau de bord (LOT 08). LECTURE SEULE.
 *
 *   1. HONNÊTETÉ   toute valeur affichée vient d'une requête ; zéro fiction ;
 *   2. ISOLATION   chaque requête filtre par schoolId ;
 *   3. WIDGETS     les widgets fictifs sont débranchés ;
 *   4. LIENS       aucun lien mort ;
 *   5. RÔLES       les blocs financiers sont réservés aux rôles concernés ;
 *   6. SOCLE       tokens et primitives uniquement ;
 *   7. ÉTATS       loading / empty / error ;
 *   8. RESPONSIVE  réorganisation réelle ;
 *   9. PERFORMANCE requêtes parallélisées, pas dupliquées.
 *
 *   npm run script -- scripts/verify-dashboard.ts
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

/** Tous les .tsx sous un dossier, récursivement. */
function walkAll(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walkAll(p, out);
    else if (e.endsWith(".tsx")) out.push(p);
  }
  return out;
}
import { hasAccess, ROLE_PERMISSIONS, type RoleType } from "../src/lib/permissions";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
const code = (p: string) =>
  readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PAGE = "src/app/dashboard/page.tsx";
const FILES = [PAGE, "src/components/dashboard/AttentionList.tsx", "src/components/dashboard/ActivityFeed.tsx"];
const all = FILES.map(code).join("\n");
const page = code(PAGE);

console.log(`\n=== TABLEAU DE BORD ===\n`);

// ---- 1. HONNÊTETÉ ----
console.log(`[1] AUCUNE DONNÉE FICTIVE`);
const fictions: [string, RegExp][] = [
  ["studentTarget (objectif inventé)", /studentTarget/],
  ["attendanceRate (aucune donnée de présence au schéma)", /attendanceRate/],
  ["filterData (table de simulation)", /filterData/],
  ["noms d'élèves inventés", /Jean D\.|Alice M\.|Samuel Gomis|Thea Senghor/],
  ["horodatages inventés", /Il y a 10 min|Il y a 2 heures|Hier/],
  ["compteurs en dur", /messages non lus|élèves absents/],
  ["mock / dummy / fake", /\bmock\b|\bdummy\b|\bfake\b/i],
];
for (const [label, re] of fictions) {
  console.log(`    ${ok(!re.test(all))} ${label}`);
}

/** Chaque valeur affichée doit provenir d'une variable, pas d'un littéral. */
const literals = [...page.matchAll(/value=\{?"(\d+)"/g)].map((m) => m[1]);
console.log(`    ${ok(literals.length === 0)} aucun KPI à valeur littérale${literals.length ? ` (${literals.join(", ")})` : ""}`);

// ---- 2. ISOLATION ----
console.log(`\n[2] ISOLATION PAR ÉTABLISSEMENT`);
/**
 * Extraction des appels Prisma avec leur bloc d'arguments ÉQUILIBRÉ.
 *
 * ⚠️ Une fenêtre de longueur fixe (`[\s\S]{0,220}`) ne voyait que 4 des 10
 * requêtes : les `select` imbriqués dépassent la fenêtre, et les requêtes
 * suivantes étaient avalées. On suit la profondeur de parenthèses pour délimiter
 * exactement chaque appel — sinon le contrôle d'isolation passe en silence sur
 * une requête non filtrée.
 */
const queries: { name: string; args: string }[] = [];
for (const m of page.matchAll(/prisma\.(\w+)\.(findMany|count|findFirst|findUnique|aggregate)\(/g)) {
  let i = m.index! + m[0].length, depth = 0;
  while (i < page.length) {
    const ch = page[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") { depth--; if (depth === 0) break; }
    i++;
  }
  queries.push({ name: `prisma.${m[1]}.${m[2]}`, args: page.slice(m.index! + m[0].length, i + 1) });
}
console.log(`    ${queries.length} requête(s) détectée(s)`);
let unfiltered = 0;
for (const q of queries) {
  const filtered = /schoolId/.test(q.args);
  if (!filtered) unfiltered++;
  console.log(`      ${ok(filtered)} ${q.name}`);
}
console.log(`    ${ok(unfiltered === 0)} ${queries.length - unfiltered}/${queries.length} filtrée(s) par schoolId`);
console.log(`    ${ok(/requireSchoolContext/.test(page))} le schoolId vient de requireSchoolContext(), pas d'un optional chaining`);
console.log(`    ${ok(!/schoolId: dbUser\?\./.test(page))} pas de \`dbUser?.schoolId\` (Prisma ignorerait un undefined)`);

// ---- 3. WIDGETS FICTIFS DÉBRANCHÉS ----
console.log(`\n[3] WIDGETS FICTIFS DÉBRANCHÉS`);
const mounted = (name: string) =>
  readdirSync("src/app/dashboard").some((f) => f.endsWith(".tsx") && new RegExp(`<${name}\\b`).test(code(join("src/app/dashboard", f))));
for (const w of ["TodoListWidget", "ActivityFeedWidget", "SchoolHealthWidget", "AlertsWidget", "RecentInvoicesWidget"]) {
  console.log(`    ${ok(!mounted(w))} ${w} n'est plus monté`);
}
console.log(`    ${ok(/<AttentionList/.test(page))} AttentionList monté (remplace AlertsWidget)`);
console.log(`    ${ok(/<ActivityFeed\b/.test(page))} ActivityFeed monté (remplace ActivityFeedWidget)`);

// ---- 4. LIENS ----
console.log(`\n[4] LIENS`);
const hrefs = [...new Set([...all.matchAll(/href: "([^"]+)"|href="([^"]+)"/g)].map((m) => m[1] ?? m[2]))]
  .filter((h) => h.startsWith("/"));
let dead = 0;
for (const h of hrefs) {
  const seg = h.replace(/^\//, "").split("?")[0];
  const exists = existsSync(join("src/app", seg, "page.tsx")) || h === "/";
  if (!exists) dead++;
  console.log(`      ${ok(exists)} ${h}`);
}
console.log(`    ${ok(dead === 0)} ${hrefs.length} lien(s), ${dead} mort(s)`);
console.log(`    ${ok(!/href: "\/payments"|href="\/payments"|href="\/admissions"/.test(all))} plus de lien sans préfixe /dashboard`);

// ---- 5. RÔLES ----
console.log(`\n[5] PORTÉE PAR RÔLE`);
console.log(`    ${ok(/hasAccess\(role, "\/dashboard\/payments"\)/.test(page))} les blocs financiers passent par hasAccess()`);
console.log(`    ${ok(!/ROLE_PERMISSIONS\s*=/.test(page))} aucune table de permissions locale`);
const ROLES = Object.keys(ROLE_PERMISSIONS) as RoleType[];
console.log(`\n    ${"RÔLE".padEnd(12)}${"accueil".padEnd(10)}${"finances".padEnd(11)}${"élèves".padEnd(9)}validation`);
for (const r of ROLES) {
  const home = hasAccess(r, "/dashboard");
  const money = hasAccess(r, "/dashboard/payments");
  const students = hasAccess(r, "/dashboard/students");
  const valid = hasAccess(r, "/dashboard/documents/validation");
  console.log(`    ${r.padEnd(12)}${(home ? "oui" : "—").padEnd(10)}${(money ? "oui" : "—").padEnd(11)}${(students ? "oui" : "—").padEnd(9)}${valid ? "oui" : "—"}`);
}
// Un enseignant ne doit pas lire le chiffre d'affaires
console.log(`\n    ${ok(!hasAccess("TEACHER", "/dashboard/payments"))} TEACHER ne voit pas les blocs financiers`);
console.log(`    ${ok(!hasAccess("PARENT", "/dashboard"))} PARENT n'accède pas à l'accueil`);

// ---- 6. SOCLE ----
console.log(`\n[6] RÈGLES DU SOCLE`);
const glass = (all.match(/backdrop-blur/g) ?? []).length;
const grad = (all.match(/bg-gradient-to-/g) ?? []).length;
const hex = [...new Set(all.match(/#[0-9a-fA-F]{6}\b/g) ?? [])];
const rogue = [...new Set(all.match(/\b(?:bg|text|border|ring|stroke)-(?:gray|zinc|neutral|stone|indigo|violet|purple|fuchsia|pink|rose|cyan|sky|teal|lime|orange|yellow|emerald|green|red|blue|amber|slate)-\d{2,3}\b/g) ?? [])];
console.log(`    ${ok(glass === 0)} verre dépoli : ${glass}`);
console.log(`    ${ok(grad === 0)} dégradés : ${grad}`);
console.log(`    ${ok(hex.length === 0)} hex en dur : ${hex.length}${hex.length ? ` (${hex.join(", ")})` : ""}`);
console.log(`    ${ok(rogue.length === 0)} couleurs hors palette : ${rogue.length}${rogue.length ? ` (${rogue.slice(0, 5).join(", ")})` : ""}`);
console.log(`    ${ok(!/rounded-\[|rounded-3xl/.test(all))} pas de rayon arbitraire ni excessif`);
for (const p of ["PageHeader", "Card", "DataTable", "Badge", "EmptyState"]) {
  console.log(`    ${ok(new RegExp(`from "@/components/ui/${p}"`).test(all))} primitive ${p}`);
}
console.log(`    ${ok(!/Personnaliser/.test(page))} bouton « Personnaliser » sans handler retiré`);
console.log(`    ${ok(!/Bonjour, <span|"Admin"/.test(page))} « Bonjour, Admin » en dur supprimé`);
console.log(`    ${ok(/user\.firstName/.test(page))} le prénom vient de l'utilisateur connecté`);

// ---- 7. ÉTATS ----
console.log(`\n[7] ÉTATS SYSTÈME`);
console.log(`    ${ok(existsSync("src/app/dashboard/loading.tsx"))} loading.tsx présent`);
const load = code("src/app/dashboard/loading.tsx");
console.log(`    ${ok(!/rounded-\[32px\]/.test(load))} squelette aligné sur la nouvelle mise en page`);
console.log(`    ${ok(/aria-busy/.test(load))} squelette annoncé par aria-busy`);
console.log(`    ${ok(existsSync("src/app/dashboard/error.tsx"))} error.tsx couvre le segment`);
const empties = (all.match(/<EmptyState/g) ?? []).length;
console.log(`    ${ok(empties >= 3)} ${empties} état(s) vide(s) via la primitive`);

// ---- 8. RESPONSIVE ----
console.log(`\n[8] RESPONSIVE`);
console.log(`    ${ok(/grid-cols-2 .*lg:grid-cols-4/.test(page))} KPI : 2 colonnes en mobile, 4 en desktop`);
console.log(`    ${ok(/lg:order-|order-first/.test(page))} réorganisation réelle des sections (pas qu'un rétrécissement)`);
console.log(`    ${ok(/hidden sm:table-cell/.test(page))} colonne repliée sur petit écran`);
console.log(`    ${ok(/overflow-x-auto/.test(code("src/components/ui/DataTable.tsx")))} défilement horizontal encapsulé dans le tableau`);

// ---- 9. PERFORMANCE ----
console.log(`\n[9] PERFORMANCE`);
console.log(`    ${ok(/Promise\.all\(/.test(page))} requêtes parallélisées`);
const invoiceQueries = (page.match(/prisma\.invoice\.findMany/g) ?? []).length;
console.log(`    ${ok(invoiceQueries === 1)} factures lues une seule fois (${invoiceQueries}), servant totaux, retards et tableau`);
console.log(`    ${ok(!/recharts/.test(all))} aucune bibliothèque de graphique chargée (aucun graphique nécessaire ici)`);
const takes = (page.match(/take: \d+/g) ?? []).length;
console.log(`    ${ok(takes >= 3)} ${takes} requête(s) bornée(s) par \`take\``);

// ---- 10. FRONTIÈRE RSC ----
/**
 * Garde de non-régression pour le bug du lot 08.
 *
 * `DataTable` est un module `"use client"`. Ses propriétés statiques
 * (`DataTable.Head`…) ne traversent PAS la frontière serveur/client : depuis un
 * composant serveur elles valent `undefined`, et React lève « Element type is
 * invalid ». Reproduit et vérifié : notation pointée en composant serveur →
 * HTTP 500 ; exports nommés → HTTP 200.
 *
 * ⚠️ `tsc` ne détecte pas ce cas : le typage est valide, la panne est au
 * runtime. Ce contrôle est donc le seul filet automatique.
 */
console.log(`\n[10] FRONTIÈRE RSC — notation pointée depuis un composant serveur`);
const CLIENT_DOTTED = ["DataTable"];
let rscViolations = 0;
for (const f of walkAll("src/app")) {
  const raw = readFileSync(f, "utf8");
  const isClient = /^\s*"use client"/.test(raw);
  if (isClient) continue;
  const c = code(f);
  for (const comp of CLIENT_DOTTED) {
    const hits = (c.match(new RegExp(`<${comp}\\.\\w+`, "g")) ?? []).length;
    if (hits > 0) {
      rscViolations += hits;
      console.log(`    ÉCHEC ${f.replace("src/", "")} — ${hits} usage(s) de <${comp}.X> en composant SERVEUR`);
      fail++;
    }
  }
}
console.log(`    ${ok(rscViolations === 0)} aucun composant serveur n'utilise la notation pointée`);
const dtSrc = code("src/components/ui/DataTable.tsx");
for (const n of ["TableHead", "TableHeadCell", "TableBody", "TableRow", "TableCell", "TableEmptyRow"]) {
  console.log(`    ${ok(new RegExp(`as ${n}\\b`).test(dtSrc))} export nommé ${n} disponible`);
}

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "tableau de bord conforme" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
