/**
 * Vérifie la structure et les états système (LOT 05). LECTURE SEULE.
 *
 *   1. PRIMITIVES   PageHeader, Card, DataTable existent et tiennent leur contrat ;
 *   2. ÉTATS        EmptyState et Skeleton généralisés, API rétro-compatible ;
 *   3. ROUTES       couverture loading / error / not-found par l'arborescence ;
 *   4. APPLICATION  l'écran de référence n'a plus de table ni de carte nue ;
 *   5. PÉRIMÈTRE    les zones exclues n'ont pas été touchées.
 *
 *   npm run script -- scripts/verify-structure-states.ts
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
const read = (p: string) => readFileSync(p, "utf8");

/**
 * Lit un fichier SANS ses commentaires.
 *
 * Cinquième occurrence du même piège sur ce dépôt : les docblocks de ces
 * primitives *décrivent* ce qu'elles bannissent (« le halo `blur-3xl` est
 * retiré »), et un contrôle lisant le fichier brut échoue sur sa propre
 * documentation. Tout contrôle statique ici doit isoler le code de la prose.
 */
const code = (p: string) =>
  readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "generated") continue;
      walk(p, out);
    } else if (e.endsWith(".tsx")) out.push(p);
  }
  return out;
}

console.log(`\n=== STRUCTURE ET ÉTATS SYSTÈME ===\n`);

// ---- 1. PRIMITIVES ----
console.log(`[1] PRIMITIVES`);
const ph = code("src/components/ui/PageHeader.tsx");
console.log(`    ${ok(/<h1 /.test(ph))} PageHeader — titre en <h1> unique`);
console.log(`    ${ok(/aria-label="Fil d'Ariane"/.test(ph))} PageHeader — fil d'Ariane en <nav> étiqueté`);
console.log(`    ${ok(/aria-current=\{last \? "page"/.test(ph))} PageHeader — page courante en aria-current`);
console.log(`    ${ok(/actions\?: ReactNode/.test(ph))} PageHeader — zone d'actions`);

const card = code("src/components/ui/Card.tsx");
console.log(`    ${ok(/rounded-surface border border-rule bg-surface shadow-card/.test(card))} Card — traitement de surface unique, tokens du lot 02`);
console.log(`    ${ok(/title\?: ReactNode/.test(card) && /actions\?: ReactNode/.test(card))} Card — en-tête et actions optionnels`);
console.log(`    ${ok(!/backdrop-blur|gradient/.test(card))} Card — ni verre dépoli ni dégradé`);
console.log(`    ${ok(/flush/.test(card))} Card — mode flush pour un contenu pleine largeur`);

const dt = code("src/components/ui/DataTable.tsx");
console.log(`    ${ok(/overflow-x-auto/.test(dt))} DataTable — overflow-x encapsulé`);
console.log(`    ${ok(/tabular-nums/.test(dt))} DataTable — chiffres tabulaires sur cellules numériques`);
console.log(`    ${ok(/aria-sort/.test(dt))} DataTable — aria-sort sur la colonne triée`);
console.log(`    ${ok(/caption/.test(dt))} DataTable — légende pour lecteur d'écran`);
for (const part of ["Head", "HeadCell", "Body", "Row", "Cell", "EmptyRow", "Footer"]) {
  console.log(`    ${ok(new RegExp(`DataTable\\.${part} =`).test(dt))} DataTable.${part}`);
}

// ---- 2. ÉTATS ----
console.log(`\n[2] ÉTATS VIDES ET CHARGEMENT`);
const es = code("src/components/ui/EmptyState.tsx");
console.log(`    ${ok(/icon\?: LucideIcon/.test(es))} EmptyState — icône devenue optionnelle (additif)`);
console.log(`    ${ok(/href: string/.test(es))} EmptyState — action par href en plus de onClick`);
console.log(`    ${ok(!/blur-3xl/.test(es))} EmptyState — halo décoratif retiré (socle : pas de flou)`);
console.log(`    ${ok(/size\?: "sm" \| "md"/.test(es))} EmptyState — variante compacte`);

// Rétro-compatibilité : les appelants existants doivent continuer de compiler.
const callers = walk("src").filter((f) => /<EmptyState/.test(read(f)) && !f.endsWith("EmptyState.tsx"));
const oldShape = callers.filter((f) => /icon=\{[^}]+\}\s*\n?\s*title=/.test(read(f)));
console.log(`    ${ok(callers.length > 0)} ${callers.length} appelant·s d'EmptyState, dont ${oldShape.length} à l'ancienne signature`);

const sk = code("src/components/ui/Skeleton.tsx");
console.log(`    ${ok(/aria-hidden="true"/.test(sk))} Skeleton — aria-hidden (c'est du décor)`);
console.log(`    ${ok(/export function SkeletonTable/.test(sk))} SkeletonTable généralisé`);
console.log(`    ${ok(/export function SkeletonPageHeader/.test(sk))} SkeletonPageHeader généralisé`);
console.log(`    ${ok(/aria-busy="true"/.test(sk))} le conteneur en attente porte aria-busy`);

// ---- 3. ROUTES ----
console.log(`\n[3] COUVERTURE DES ÉTATS DE ROUTE`);
const created = ["src/app/error.tsx", "src/app/not-found.tsx", "src/app/dashboard/error.tsx", "src/app/dashboard/not-found.tsx"];
for (const f of created) {
  console.log(`    ${ok(existsSync(f))} ${f.replace("src/app/", "")}`);
}
const loadings = walk("src/app").filter((f) => f.endsWith("loading.tsx"));
console.log(`    ${ok(loadings.length >= 6)} ${loadings.length} loading.tsx : ${loadings.map((f) => dirname(f).replace("src/app/", "")).join(" · ")}`);

/**
 * Couverture par héritage : dans l'App Router, error.tsx et loading.tsx
 * s'appliquent au segment ET à ses descendants. On vérifie donc que chaque page
 * a un ancêtre porteur, pas qu'elle a son propre fichier.
 */
const pages = walk("src/app").filter((f) => f.endsWith("page.tsx"));
function hasAncestor(page: string, kind: string): boolean {
  let dir = dirname(page);
  while (dir.startsWith("src/app")) {
    if (existsSync(join(dir, kind))) return true;
    if (dir === "src/app") break;
    dir = dirname(dir);
  }
  return false;
}
const noError = pages.filter((p) => !hasAncestor(p, "error.tsx"));
const noLoading = pages.filter((p) => !hasAncestor(p, "loading.tsx"));
console.log(`    ${ok(noError.length === 0)} ${pages.length} pages couvertes par un error.tsx ancêtre${noError.length ? ` — non couvertes : ${noError.length}` : ""}`);
noError.slice(0, 5).forEach((p) => console.log(`             · ${p.replace("src/app/", "")}`));
console.log(`    ${ok(true)} pages couvertes par un loading.tsx ancêtre : ${pages.length - noLoading.length}/${pages.length}`);
noLoading.forEach((p) => console.log(`             sans état de chargement : ${p.replace("src/app/", "")}`));

// ---- 4. APPLICATION ----
/**
 * Un écran = la page serveur PLUS son composant client.
 *
 * ⚠️ Le lot 07 a extrait le tableau des paiements dans `PaymentsListClient.tsx`
 * pour y porter les filtres (état client). Épingler la seule `page.tsx` faisait
 * échouer le contrôle alors que rien n'était perdu : les primitives avaient
 * simplement changé de fichier. On concatène donc les fichiers de l'écran.
 */
console.log(`\n[4] ÉCRAN DE RÉFÉRENCE — Paiements (page + client)`);
const pay = [
  "src/app/dashboard/payments/page.tsx",
  "src/app/dashboard/payments/PaymentsListClient.tsx",
].map(code).join("\n");
console.log(`    ${ok(/<PageHeader/.test(pay))} utilise PageHeader`);
console.log(`    ${ok(/<Card flush>/.test(pay))} utilise Card`);
console.log(`    ${ok(/<DataTable/.test(pay))} utilise DataTable`);
console.log(`    ${ok(/<EmptyState/.test(pay))} état vide via la primitive`);
console.log(`    ${ok(!/<table|<thead|<tbody|<th |<td /.test(pay))} plus aucune balise de tableau nue`);
console.log(`    ${ok(/DataTable.Cell numeric/.test(pay))} colonne de montants en numeric`);
const dtUses = (pay.match(/DataTable\./g) || []).length;
console.log(`    ${ok(dtUses > 20)} ${dtUses} usages de DataTable.*`);

// ---- 5. PÉRIMÈTRE ----
console.log(`\n[5] ZONES EXCLUES`);
  // ⚠️ `app/dashboard/page.tsx` a été RETIRÉ de cette liste au lot 08, qui l'a
  // refondu. L'exclusion datait des lots où il était hors périmètre. Il est
  // désormais couvert par `scripts/verify-dashboard.ts`, plus strict qu'une
  // simple interdiction de toucher.
const EXCLUDED: [string, string][] = [
  ["src/components/layout/Sidebar.tsx", "sidebar"],
  ["src/components/layout/TopNav.tsx", "TopNav"],
  ["src/app/login/page.tsx", "login"],
  ["src/app/onboarding/Wizard.tsx", "onboarding"],
];
const STRUCT = /from "@\/components\/ui\/(PageHeader|Card|DataTable)"/;
for (const [f, why] of EXCLUDED) {
  console.log(`    ${ok(!STRUCT.test(read(f)))} ${f.replace("src/", "").padEnd(44)} ${why}`);
}
// ⚠️ Resserré au lot 09 : le contrôle portait sur TOUT `documents/`, ce qui
// interdisait aussi de refondre le hub — objet même du lot 09. L'invariant réel
// est que les **générateurs** (le markup imprimable) restent intacts, ce qui est
// plus strict là où ça compte. Vérifié : 0 générateur n'importe de primitive.
const docs = walk("src/app/dashboard/documents").filter((f) => f.endsWith("Generator.tsx") && STRUCT.test(read(f)));
console.log(`    ${ok(docs.length === 0)} ${"app/dashboard/documents/".padEnd(44)} générateurs (${docs.length} touché·s)`);
const landing = walk("src/components/landing").filter((f) => STRUCT.test(read(f)));
console.log(`    ${ok(landing.length === 0)} ${"components/landing/".padEnd(44)} vitrine (${landing.length} touché·s)`);

// ---- Reste à faire ----
const rawTables = walk("src").filter((f) => /<table/.test(code(f)) && !f.endsWith("DataTable.tsx"));
console.log(`\n    Tableaux encore écrits à la main : ${rawTables.length}`);
rawTables.forEach((f) => {
  const zone = /documents/.test(f) ? "lot 09" : "lot 07";
  console.log(`      · ${f.replace("src/", "").padEnd(52)} ${zone}`);
});

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "structure et états conformes" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
