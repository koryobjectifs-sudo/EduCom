/**
 * Vérifie les cinq écrans opérationnels (LOT 07). LECTURE SEULE.
 *
 *   1. ISOLATION     chaque écran filtre par schoolId ;
 *   2. PRIMITIVES    chaque écran passe par le socle (lots 02-05) ;
 *   3. SOCLE RESPECTÉ ni verre dépoli, ni dégradé, ni emoji, ni palette locale ;
 *   4. ÉTATS         vide / chargement / erreur couverts ;
 *   5. ACCESSIBILITÉ boutons icône-seule étiquetés, champs labellisés ;
 *   6. RESPONSIVE    adaptation réelle, pas seulement une largeur réduite ;
 *   7. PÉRIMÈTRE     documents, dashboard, landing, login intacts ;
 *   8. HONNÊTETÉ     aucune donnée fictive, aucun contrôle sans handler.
 *
 *   npm run script -- scripts/verify-operational-screens.ts
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
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

/** Un écran = tous les fichiers qui le composent. */
const SCREENS: { name: string; files: string[] }[] = [
  { name: "Élèves", files: [
    "src/app/dashboard/students/page.tsx",
    "src/app/dashboard/students/StudentListClient.tsx",
  ]},
  { name: "Paiements", files: [
    "src/app/dashboard/payments/page.tsx",
    "src/app/dashboard/payments/PaymentsListClient.tsx",
  ]},
  { name: "Classes", files: [
    "src/app/dashboard/classes/page.tsx",
    "src/app/dashboard/classes/ClassListClient.tsx",
  ]},
  { name: "Équipe", files: [
    "src/app/dashboard/team/page.tsx",
    "src/app/dashboard/team/TeamForms.tsx",
    "src/app/dashboard/team/TeamCreateForm.tsx",
    "src/app/dashboard/team/TeamInviteForm.tsx",
    "src/app/dashboard/team/InviteLink.tsx",
  ]},
  { name: "Communications", files: [
    "src/app/dashboard/communications/page.tsx",
    "src/app/dashboard/communications/ClientPage.tsx",
    "src/app/dashboard/communications/inbox/InboxClient.tsx",
    "src/app/dashboard/communications/surveys/page.tsx",
  ]},
];

const src = (files: string[]) => files.filter(existsSync).map(code).join("\n");

console.log(`\n=== ÉCRANS OPÉRATIONNELS ===\n`);

// ---- 1. ISOLATION ----
console.log(`[1] ISOLATION PAR ÉTABLISSEMENT`);
for (const { name, files } of SCREENS) {
  const servers = files.filter((f) => f.endsWith("page.tsx"));
  for (const f of servers) {
    const c = code(f);
    const queries = (c.match(/prisma\.\w+\.(findMany|count|aggregate)/g) ?? []).length;
    const filtered = /schoolId/.test(c);
    const pass = queries === 0 || filtered;
    console.log(`    ${ok(pass)} ${name.padEnd(15)} ${f.replace("src/app/dashboard/", "")} — ${queries} requête(s)${pass ? "" : " SANS schoolId"}`);
  }
}

// ---- 2. PRIMITIVES ----
console.log(`\n[2] PRIMITIVES DU SOCLE`);
for (const { name, files } of SCREENS) {
  const c = src(files);
  const used = ["PageHeader", "Card", "Button", "Field", "DataTable", "EmptyState", "Badge", "Modal"]
    .filter((p) => new RegExp(`from "@/components/ui/${p}"`).test(c));
  // Chaque écran doit passer par au moins Card + Button, et par PageHeader côté page
  const hasHeader = /from "@\/components\/ui\/PageHeader"/.test(c);
  const hasSurface = /from "@\/components\/ui\/Card"/.test(c);
  console.log(`    ${ok(hasHeader && hasSurface)} ${name.padEnd(15)} ${used.join(" · ")}`);
}

// ---- 3. SOCLE RESPECTÉ ----
console.log(`\n[3] RÈGLES DU SOCLE`);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
for (const { name, files } of SCREENS) {
  const c = src(files);
  const glass = (c.match(/backdrop-blur/g) ?? []).length;
  const grad = (c.match(/bg-gradient-to-/g) ?? []).length;
  const emoji = EMOJI.test(c);
  // Familles de couleur hors palette (le socle n'admet que les tokens)
  const rogue = [...new Set(c.match(/\b(?:bg|text|border|ring)-(?:gray|zinc|neutral|stone|indigo|violet|purple|fuchsia|pink|rose|cyan|sky|teal|lime|orange|yellow)-\d{2,3}\b/g) ?? [])];
  const hex = [...new Set(c.match(/#[0-9a-fA-F]{6}\b/g) ?? [])];
  const pass = glass === 0 && grad === 0 && !emoji && rogue.length === 0 && hex.length === 0;
  console.log(`    ${ok(pass)} ${name.padEnd(15)} verre ${glass} · dégradés ${grad} · emoji ${emoji ? "oui" : "non"} · hors-palette ${rogue.length} · hex ${hex.length}`);
  if (rogue.length) console.log(`             ${rogue.slice(0, 6).join(", ")}`);
  if (hex.length) console.log(`             ${hex.slice(0, 6).join(", ")}`);
}

// ---- 4. ÉTATS ----
console.log(`\n[4] ÉTATS SYSTÈME`);
for (const { name, files } of SCREENS) {
  const c = src(files);
  const hasEmpty = /<EmptyState/.test(c);
  console.log(`    ${ok(hasEmpty)} ${name.padEnd(15)} état vide via la primitive`);
}
const routes = ["students", "payments", "classes", "team"];
for (const r of routes) {
  console.log(`    ${ok(existsSync(`src/app/dashboard/${r}/loading.tsx`))} loading.tsx — ${r}`);
}
console.log(`    ${ok(existsSync("src/app/dashboard/error.tsx"))} error.tsx couvre tout le dashboard (héritage App Router)`);

// ---- 5. ACCESSIBILITÉ ----
console.log(`\n[5] ACCESSIBILITÉ`);
for (const { name, files } of SCREENS) {
  const c = src(files);
  /**
   * Balises <Button …/> complètes, en tenant compte des accolades.
   *
   * ⚠️ Un regex naïf `[\s\S]*?\/>` s'arrête au PREMIER `/>` — or il y en a un
   * à l'intérieur de `icon={<Trash2 … />}`. Le contrôle tronquait donc l'élément
   * avant d'atteindre son `aria-label` et signalait des faux positifs sur des
   * boutons correctement étiquetés. On avance en suivant la profondeur
   * d'accolades pour trouver la vraie fin de balise.
   */
  const iconButtons: string[] = [];
  for (const m of c.matchAll(/<Button\b/g)) {
    let i = m.index! + 7, depth = 0;
    while (i < c.length) {
      const ch = c[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (depth === 0 && ch === "/" && c[i + 1] === ">") { i += 2; break; }
      else if (depth === 0 && ch === ">") { i += 1; break; }
      i++;
    }
    const tag = c.slice(m.index!, i);
    // Icône seule : porte `icon=` et se ferme sur lui-même (pas de children).
    if (/icon=/.test(tag) && tag.endsWith("/>")) iconButtons.push(tag);
  }
  const unlabelled = iconButtons.filter((b) => !/aria-label/.test(b));
  console.log(`    ${ok(unlabelled.length === 0)} ${name.padEnd(15)} ${iconButtons.length} bouton(s) icône-seule, ${unlabelled.length} sans aria-label`);
  // Champs natifs restants hors hidden/file/radio/checkbox
  const natives = [...c.matchAll(/<(input|select|textarea)\b([^>]*)>/g)]
    .filter((m) => !/type="(hidden|file|radio|checkbox)"/.test(m[2]));
  const noLabel = natives.filter((m) => !/aria-label|id=/.test(m[2]));
  console.log(`    ${ok(noLabel.length === 0)} ${name.padEnd(15)} ${natives.length} champ(s) natif(s), ${noLabel.length} sans label ni aria-label`);
}

// ---- 6. RESPONSIVE ----
console.log(`\n[6] RESPONSIVE`);
for (const { name, files } of SCREENS) {
  const c = src(files);
  const bp = (c.match(/\b(sm|md|lg|xl):/g) ?? []).length;
  // Adaptation réelle : au moins un repli de contenu, pas qu'une largeur
  const adapts = /hidden (sm|md|lg):table-cell|(sm|md|lg):hidden|flex-col .*(sm|md|lg):flex-row/.test(c);
  console.log(`    ${ok(bp > 0 && adapts)} ${name.padEnd(15)} ${bp} classe(s) responsive, repli de contenu ${adapts ? "présent" : "ABSENT"}`);
}

// ---- 7. PÉRIMÈTRE ----
console.log(`\n[7] ZONES HORS PÉRIMÈTRE — doivent être intactes`);
const generators = walk("src/app/dashboard/documents").filter((f) => f.endsWith("Generator.tsx"));
const touched = generators.filter((f) => /from "@\/components\/ui\/(PageHeader|Card|DataTable)"/.test(code(f)));
console.log(`    ${ok(touched.length === 0)} ${generators.length} générateur(s) de documents, ${touched.length} touché(s)`);
for (const [f, why] of [
  ["src/app/login/page.tsx", "login"],
  ["src/app/onboarding/Wizard.tsx", "onboarding"],
] as const) {
  console.log(`    ${ok(!/from "@\/components\/ui\/(PageHeader|DataTable)"/.test(code(f)))} ${f.replace("src/", "").padEnd(34)} ${why}`);
}
const landing = walk("src/components/landing").filter((f) => /from "@\/components\/ui\//.test(code(f)));
console.log(`    ${ok(landing.length === 0)} vitrine intacte (${landing.length} fichier(s) touché(s))`);

// ---- 8. HONNÊTETÉ ----
console.log(`\n[8] AUCUNE DONNÉE FICTIVE, AUCUN CONTRÔLE MORT`);
const allScreens = src(SCREENS.flatMap((s) => s.files));
console.log(`    ${ok(!/educom\.app/.test(allScreens))} plus de domaine fictif « educom.app »`);
console.log(`    ${ok(!/Jean D\.|Alice M\.|Lorem|ipsum/.test(allScreens))} aucun nom ni texte de remplissage`);
// Un <button> sans onClick/type=submit est décoratif
const deadButtons = [...allScreens.matchAll(/<button\b(?:(?!>)[\s\S])*?>/g)]
  .filter((m) => !/onClick|type="submit"/.test(m[0]));
console.log(`    ${ok(deadButtons.length === 0)} ${deadButtons.length} <button> sans handler ni submit`);
// L'envoi WhatsApp ne doit jamais reprendre un téléphone du client (lot 01)
const comms = code("src/app/dashboard/communications/ClientPage.tsx");
console.log(`    ${ok(!/phone:\s*parent\.phone/.test(comms))} l'envoi ne transmet plus de téléphone depuis le client`);
const commsAction = code("src/app/dashboard/communications/actions.ts");
console.log(`    ${ok(/phoneById|role: "PARENT"/.test(commsAction))} les numéros sont résolus côté serveur`);

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "cinq écrans conformes" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
