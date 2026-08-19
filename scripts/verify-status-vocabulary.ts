/**
 * Vérifie le vocabulaire d'état (LOT 03). LECTURE SEULE.
 *
 * Quatre propriétés :
 *   1. COUVERTURE   chaque valeur des enums Prisma a un libellé français ;
 *   2. EXIGÉS       les 9 statuts demandés au lot sont présents ;
 *   3. TEXTE SEUL   aucun état n'est représenté par la couleur seule ;
 *   4. MIGRATION    les sites migrés n'ont plus de traduction locale, et les
 *                   zones interdites par le lot n'ont pas été touchées.
 *
 *   npm run script -- scripts/verify-status-vocabulary.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { STATUS, describeStatus, statusLabel, type StatusDomain } from "../src/lib/status";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));

/** Enums Prisma pertinents, lus depuis le schéma — pas recopiés. */
function readEnums(): Record<string, string[]> {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const out: Record<string, string[]> = {};
  for (const m of schema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    out[m[1]] = m[2]
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, "").trim())
      .filter((l) => /^[A-Z_]+$/.test(l));
  }
  return out;
}

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

console.log(`\n=== VOCABULAIRE D'ÉTAT ===\n`);

// ---- 1. COUVERTURE ----
const enums = readEnums();
const mapping: [string, StatusDomain][] = [
  ["StudentStatus", "student"],
  ["InvoiceStatus", "invoice"],
  ["ReportCardStatus", "reportCard"],
  ["MessageStatus", "message"],
];

console.log(`[1] COUVERTURE DES ENUMS PRISMA\n`);
for (const [enumName, domain] of mapping) {
  const values = enums[enumName] ?? [];
  const table = STATUS[domain] as Record<string, unknown>;
  const missing = values.filter((v) => !(v in table));
  console.log(`    ${ok(missing.length === 0 && values.length > 0)} ${enumName.padEnd(18)} ${values.length} valeurs${missing.length ? ` — MANQUANTES : ${missing.join(", ")}` : " toutes couvertes"}`);
  for (const v of values) {
    const d = describeStatus(domain, v);
    console.log(`             ${v.padEnd(12)} → « ${d.label} »  [${d.variant}]${d.hint ? `  · ${d.hint}` : ""}`);
  }
}

// ---- 2. STATUTS EXIGÉS PAR LE LOT ----
console.log(`\n[2] LES 9 STATUTS EXIGÉS`);
const required = ["PAID", "PENDING", "OVERDUE", "ENROLLED", "DRAFT", "SUBMITTED", "VALIDATED", "RETURNED", "PRINTED"];
for (const r of required) {
  const domains = (Object.keys(STATUS) as StatusDomain[]).filter((d) => r in (STATUS[d] as object));
  const found = domains.length > 0;
  const labels = domains.map((d) => `${d}:« ${statusLabel(d, r)} »`).join("  ");
  console.log(`    ${ok(found)} ${r.padEnd(11)} ${found ? labels : "ABSENT"}`);
}

// ---- 3. AUCUN ÉTAT PORTÉ PAR LA COULEUR SEULE ----
console.log(`\n[3] LE TEXTE PORTE TOUJOURS L'INFORMATION`);
let labelled = 0, unlabelled: string[] = [];
for (const domain of Object.keys(STATUS) as StatusDomain[]) {
  for (const [value, desc] of Object.entries(STATUS[domain] as Record<string, { label: string }>)) {
    if (desc.label && desc.label.trim().length > 0) labelled++;
    else unlabelled.push(`${domain}.${value}`);
  }
}
console.log(`    ${ok(unlabelled.length === 0)} ${labelled} descripteurs, tous porteurs d'un libellé${unlabelled.length ? ` — sans libellé : ${unlabelled.join(", ")}` : ""}`);

const badge = readFileSync("src/components/ui/Badge.tsx", "utf8");
console.log(`    ${ok(/children:\s*ReactNode;/.test(badge))} Badge exige \`children\` — impossible de rendre une pastille sans texte`);
console.log(`    ${ok(/aria-hidden="true"/.test(badge))} la puce colorée est \`aria-hidden\` : décorative, jamais porteuse`);
const dotOnly = /\{dot &&[^}]*\}\s*<\/span>/.test(badge);
console.log(`    ${ok(!dotOnly)} la puce n'est jamais rendue sans le libellé qui la suit`);

// Un statut inconnu reste lisible plutôt que de disparaître
const unknown = describeStatus("invoice", "UNE_VALEUR_INEDITE");
console.log(`    ${ok(unknown.label === "UNE_VALEUR_INEDITE")} statut inconnu → libellé = valeur brute, rien ne disparaît`);
const nullish = describeStatus("student", null);
console.log(`    ${ok(nullish.label === "—")} statut absent → « — », pas de pastille vide`);

// Le même code dans deux domaines ne donne pas le même libellé
const draftInvoice = statusLabel("invoice", "DRAFT");
const draftReport = statusLabel("reportCard", "DRAFT");
console.log(`    ${ok(draftInvoice !== draftReport)} DRAFT distingué par domaine : facture « ${draftInvoice} » ≠ bulletin « ${draftReport} »`);

// ---- 4. MIGRATION ----
console.log(`\n[4] MIGRATION DES SITES`);
/**
 * Sites migrés. Un site peut être un écran réparti sur plusieurs fichiers :
 * le lot 07 a déplacé le tableau des paiements dans son composant client.
 */
const MIGRATED = [
  "src/app/dashboard/payments/PaymentsListClient.tsx",
  "src/app/dashboard/students/StudentListClient.tsx",
  "src/app/dashboard/students/[id]/page.tsx",
  "src/app/dashboard/classes/[id]/page.tsx",
  "src/app/dashboard/grades/StudentEntryTab.tsx",
];
// Signature d'une traduction locale : un ternaire qui compare un statut à une
// chaîne littérale ET produit un LIBELLÉ.
//
// La négation en tête est indispensable : sans elle, un ternaire de classes CSS
// (`status === "OVERDUE" ? "border-error ..." : ...`) était compté comme une
// traduction. On exclut donc les chaînes qui commencent par un utilitaire
// Tailwind — ce sont du style, pas du texte affiché.
const LOCAL_TRANSLATION =
  /===\s*"(PAID|OVERDUE|ENROLLED|PENDING|SUBMITTED|VALIDATED|APPROVED|RETURNED|DRAFT)"\s*\?\s*"(?!(?:bg|text|border|ring|from|to|via|shadow|hover|outline|divide|fill|stroke)-)[A-ZÉÀÈa-zéèà]/;

for (const f of MIGRATED) {
  const src = readFileSync(f, "utf8");
  const usesPrimitive = /StatusBadge|statusLabel|describeStatus/.test(src);
  const stillLocal = LOCAL_TRANSLATION.test(src);
  const hasToLowerCase = /status\.toLowerCase\(\)/.test(src);
  const pass = usesPrimitive && !stillLocal && !hasToLowerCase;
  console.log(`    ${ok(pass)} ${f.replace("src/app/dashboard/", "")}`);
  if (!usesPrimitive) console.log(`             n'utilise pas la primitive`);
  if (stillLocal) console.log(`             traduction locale résiduelle`);
  if (hasToLowerCase) console.log(`             repli status.toLowerCase() résiduel`);
}

// ---- Zones que le lot interdit de toucher ----
console.log(`\n    Zones hors périmètre du lot 03 — doivent rester intactes :`);
  // ⚠️ `app/dashboard/page.tsx` a été RETIRÉ de cette liste au lot 08, qui l'a
  // refondu. L'exclusion datait des lots où il était hors périmètre. Il est
  // désormais couvert par `scripts/verify-dashboard.ts`, plus strict qu'une
  // simple interdiction de toucher.
const FORBIDDEN = [
  "src/components/dashboard/RecentInvoicesWidget.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/app/login/page.tsx",
  "src/app/onboarding/Wizard.tsx",
];
for (const f of FORBIDDEN) {
  const src = readFileSync(f, "utf8");
  // Chercher l'IMPORT de la primitive, pas l'identifiant : plusieurs fichiers
  // définissent déjà un `StatusBadge` local (ex. documents/validation), et le
  // simple nom produisait un faux positif.
  const touched = /from "@\/components\/ui\/Badge"|from "@\/lib\/status"/.test(src);
  console.log(`      ${ok(!touched)} ${f.replace("src/", "")}${touched ? " — MODIFIÉ alors qu'interdit" : ""}`);
}
// ⚠️ Resserré au lot 09 : le contrôle portait sur TOUT `documents/`, ce qui
// interdisait aussi de refondre le hub — objet même du lot 09. L'invariant réel
// est que les **générateurs** (le markup imprimable) restent intacts, ce qui est
// plus strict là où ça compte. Vérifié : 0 générateur n'importe de primitive.
const docs = walk("src/app/dashboard/documents").filter((f) => f.endsWith("Generator.tsx") && /from "@\/components\/ui\/Badge"|from "@\/lib\/status"/.test(readFileSync(f, "utf8")));
console.log(`      ${ok(docs.length === 0)} app/dashboard/documents/ (${docs.length} fichier·s touché·s)`);

// ---- Traductions locales restantes ailleurs (information, pas échec) ----
const remaining = walk("src").filter((f) => LOCAL_TRANSLATION.test(readFileSync(f, "utf8")));
console.log(`\n    Traductions locales encore en place ailleurs (lots 07-09) : ${remaining.length}`);
remaining.forEach((f) => console.log(`      · ${f.replace("src/", "")}`));

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "vocabulaire d'état conforme" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
