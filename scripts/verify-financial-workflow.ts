/**
 * Vérifie le workflow financier (LOT 11). LECTURE SEULE.
 *
 *   1. MACHINES     les deux circuits sont cohérents et calés sur l'enum Prisma ;
 *   2. PERMISSIONS  une seule matrice, séparation préparation / décision ;
 *   3. AUTORITÉ     aucune action n'accepte de schoolId ; requireActionContext partout ;
 *   4. ISOLATION    chaque appel Prisma porte un schoolId — comptage par APPEL ;
 *   5. PÉRIODES     agrégations bornées, borne de fin exclue, 5 granularités ;
 *   6. TRAÇABILITÉ  WorkflowTransition + AuditLog, jamais console.log seul ;
 *   7. VOCABULAIRE  aucun fichier ne redéclare la liste des statuts ;
 *   8. HONNÊTETÉ    aucun montant en dur, aucun repli financier inventé ;
 *   9. SCHÉMA       additif, colonnes exigées, pas de cascade introduite ;
 *  10. UI           primitives du socle, pas de couleur hors thème.
 *
 * ═══ ANALYSE STATIQUE : PROFONDEUR DE PARENTHÈSES, PAS DE REGEX FRAGILE ═══
 *
 * Les lots précédents ont produit onze faux résultats par regex mal calibrée —
 * une fenêtre de longueur fixe qui ne voyait que 4 requêtes sur 10, un `[\s\S]*?`
 * tronqué par un `/>` imbriqué, un docblock validant sa propre documentation.
 * Ici les arguments d'un appel Prisma sont extraits en comptant les parenthèses,
 * et les commentaires sont retirés avant toute inspection.
 *
 *   npm run script -- scripts/verify-financial-workflow.ts
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { hasAccess, ROLE_PERMISSIONS, ROLE_DENIALS, type RoleType } from "../src/lib/permissions";
import {
  WORKFLOWS, expenseWorkflow, financialStatementWorkflow,
  validateDefinition, canTransition, availableTransitions, FINANCE_REVIEW_PATH,
} from "../src/lib/workflow";
import {
  monthPeriod, dayPeriod, weekPeriod, customPeriod, termPeriod, periodFilter,
} from "../src/lib/period";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_ORDER } from "../src/lib/finance";
import { STATUS } from "../src/lib/status";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));

/** Retire les commentaires. Sans cela un docblock valide sa propre prose. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const raw = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => strip(raw(p));

const ROLES = Object.keys(ROLE_PERMISSIONS) as RoleType[];

const PREPARE_EXPENSES = "/dashboard/payments/expenses";
const PREPARE_STATEMENT = "/dashboard/payments/statement";

/** Fichiers du périmètre financier — le seul ensemble inspecté. */
const FINANCE_FILES = [
  "src/lib/finance.ts",
  "src/app/dashboard/payments/expenses/actions.ts",
  "src/app/dashboard/payments/expenses/page.tsx",
  "src/app/dashboard/payments/expenses/ExpensesClient.tsx",
  "src/app/dashboard/payments/statement/actions.ts",
  "src/app/dashboard/payments/statement/page.tsx",
  "src/app/dashboard/payments/statement/StatementClient.tsx",
  "src/app/dashboard/payments/review/page.tsx",
  "src/app/dashboard/payments/review/ReviewClient.tsx",
  "src/app/dashboard/payments/_finance/PeriodPicker.tsx",
  "src/app/dashboard/payments/_finance/HistoryTimeline.tsx",
  "src/app/dashboard/payments/page.tsx",
];

const ACTION_FILES = FINANCE_FILES.filter((f) => f.endsWith("actions.ts"));

/**
 * Extrait les arguments d'appels, en comptant les parenthèses.
 *
 * Le piège qu'évite ce parcours : un argument contient lui-même des parenthèses
 * (`{ in: [...] }`, une fonction fléchée, un `Math.max(...)`). Une regex non
 * gourmande s'arrête à la PREMIÈRE parenthèse fermante et ne voit qu'un fragment
 * — c'est exactement ainsi qu'un contrôle d'isolation a vu 4 requêtes sur 10.
 */
function callArgs(src: string, re: RegExp): { call: string; args: string }[] {
  const out: { call: string; args: string }[] = [];
  for (const m of src.matchAll(re)) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      i++;
    }
    out.push({ call: m[0], args: src.slice(m.index + m[0].length, i - 1) });
  }
  return out;
}

/** Signatures de fonctions exportées, avec leur liste de paramètres. */
function exportedSignatures(src: string): { name: string; params: string }[] {
  const out: { name: string; params: string }[] = [];
  const re = /export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\(/g;
  for (const m of src.matchAll(re)) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      i++;
    }
    out.push({ name: m[1], params: src.slice(m.index + m[0].length, i - 1) });
  }
  return out;
}

console.log(`\n=== WORKFLOW FINANCIER (LOT 11) ===\n`);

/* ═══════════════════════════ 1. MACHINES ═══════════════════════════ */

console.log(`[1] MACHINES D'ÉTAT`);
const financeMachines = [expenseWorkflow, financialStatementWorkflow];

for (const wf of financeMachines) {
  const errors = validateDefinition(wf);
  console.log(`\n    ${wf.name} — ${wf.states.length} états, ${wf.transitions.length} transitions`);
  console.log(`      ${ok(errors.length === 0)} définition cohérente${errors.length ? ` : ${errors.join(" ; ")}` : ""}`);
  console.log(`      ${ok((WORKFLOWS as Record<string, unknown>)[wf.name] === wf)} inscrite au registre WORKFLOWS`);

  // Le cycle minimal exigé par le lot, transition par transition.
  const has = (from: string, to: string) => wf.transitions.some((t) => t.from === from && t.to === to);
  console.log(`      ${ok(has("DRAFT", "SUBMITTED"))} DRAFT → SUBMITTED`);
  console.log(`      ${ok(has("SUBMITTED", "APPROVED"))} SUBMITTED → APPROVED`);
  console.log(`      ${ok(has("SUBMITTED", "RETURNED"))} SUBMITTED → RETURNED`);
  console.log(`      ${ok(has("RETURNED", "SUBMITTED"))} RETURNED → SUBMITTED (boucle de correction)`);
  console.log(`      ${ok(has("DRAFT", "CANCELLED"))} DRAFT → CANCELLED`);

  // Un préparateur ne retire pas une pièce des mains de la direction.
  console.log(`      ${ok(!has("SUBMITTED", "CANCELLED"))} SUBMITTED → CANCELLED absent (décision assumée)`);

  const ret = wf.transitions.find((t) => t.to === "RETURNED");
  console.log(`      ${ok(ret?.commentRequired === true)} le renvoi exige un motif`);
  console.log(`      ${ok(wf.terminal.includes("APPROVED") && wf.terminal.includes("CANCELLED"))} APPROVED et CANCELLED sont terminaux`);

  // Séparation des pouvoirs : préparation et décision sur deux chemins distincts.
  const prep = new Set(wf.transitions.filter((t) => t.to === "SUBMITTED" || t.to === "CANCELLED").map((t) => t.requiredPath));
  const dec = new Set(wf.transitions.filter((t) => t.to === "APPROVED" || t.to === "RETURNED").map((t) => t.requiredPath));
  console.log(`      ${ok(prep.size === 1 && dec.size === 1 && ![...prep][0].startsWith([...dec][0]))} préparation et décision sur deux chemins distincts`);
  console.log(`      ${ok([...dec][0] === FINANCE_REVIEW_PATH)} la décision passe par ${FINANCE_REVIEW_PATH}`);

  // Un chemin mort refuserait tout le monde en silence.
  for (const p of new Set(wf.transitions.map((t) => t.requiredPath))) {
    console.log(`      ${ok(existsSync(join("src/app", p.replace(/^\//, ""), "page.tsx")))} route réelle : ${p}`);
  }
}

// Calage sur l'énumération Prisma, relue dans le schéma.
console.log(`\n    Calage sur le schéma Prisma`);
const schema = raw("prisma/schema.prisma");
const enumBlock = schema.match(/enum FinanceWorkflowStatus \{([^}]*)\}/)?.[1] ?? "";
const enumStates = enumBlock.split("\n").map((l) => l.replace(/\/\/.*$/, "").trim()).filter(Boolean);
console.log(`      ${ok(enumStates.length === 5)} FinanceWorkflowStatus lue (${enumStates.length} valeurs)`);
for (const wf of financeMachines) {
  const same = [...wf.states].sort().join(",") === [...enumStates].sort().join(",");
  console.log(`      ${ok(same)} ${wf.name} : états déclarés == énumération Prisma`);
}
const catBlock = schema.match(/enum ExpenseCategory \{([^}]*)\}/)?.[1] ?? "";
const catValues = catBlock.split("\n").map((l) => l.replace(/\/\/.*$/, "").trim()).filter(Boolean);
console.log(`      ${ok([...catValues].sort().join(",") === [...EXPENSE_CATEGORY_ORDER].sort().join(","))} postes de dépense : code == schéma (${catValues.length})`);
console.log(`      ${ok(catValues.every((c) => Boolean(EXPENSE_CATEGORIES[c as never])))} chaque poste a un libellé français`);

/* ═══════════════════════ 2. PERMISSIONS ═══════════════════════ */

console.log(`\n[2] PERMISSIONS — UNE SEULE MATRICE`);

// Matrice attendue, rôle par rôle. C'est le cœur métier du lot.
const ATTENDU: Record<RoleType, { prepare: boolean; review: boolean }> = {
  OWNER:      { prepare: true,  review: true  },
  ADMIN:      { prepare: true,  review: true  },
  ACCOUNTANT: { prepare: true,  review: false },
  SECRETARY:  { prepare: false, review: false },
  TEACHER:    { prepare: false, review: false },
  ASSISTANT:  { prepare: false, review: false },
  PARENT:     { prepare: false, review: false },
};

for (const r of ROLES) {
  const prepE = hasAccess(r, PREPARE_EXPENSES);
  const prepS = hasAccess(r, PREPARE_STATEMENT);
  const rev = hasAccess(r, FINANCE_REVIEW_PATH);
  const exp = ATTENDU[r];
  const good = prepE === exp.prepare && prepS === exp.prepare && rev === exp.review;
  console.log(`    ${ok(good)} ${r.padEnd(11)} préparer=${prepE ? "oui" : "non"} examiner=${rev ? "oui" : "non"}`);
}

// Les deux refus qui portent tout le sens du lot.
console.log(`    ${ok(!hasAccess("ACCOUNTANT", FINANCE_REVIEW_PATH))} le comptable n'approuve PAS son propre travail`);
console.log(`    ${ok(hasAccess("ACCOUNTANT", PREPARE_EXPENSES))} …mais il prépare et transmet`);
console.log(`    ${ok(hasAccess("PARENT", "/dashboard/payments"))} le parent garde l'accès à ses factures`);
console.log(`    ${ok(!hasAccess("PARENT", PREPARE_EXPENSES) && !hasAccess("PARENT", PREPARE_STATEMENT) && !hasAccess("PARENT", FINANCE_REVIEW_PATH))} …sans hériter de l'atelier financier par préfixe`);

// Effet réel sur les transitions, pas seulement sur les chemins.
console.log(`\n    Effet sur les transitions :`);
for (const r of ROLES) {
  const submit = canTransition(expenseWorkflow, "DRAFT", "SUBMITTED", r).allowed;
  const approve = canTransition(expenseWorkflow, "SUBMITTED", "APPROVED", r).allowed;
  const good = submit === ATTENDU[r].prepare && approve === ATTENDU[r].review;
  console.log(`      ${ok(good)} ${r.padEnd(11)} transmettre=${submit ? "oui" : "non"} approuver=${approve ? "oui" : "non"}`);
}
console.log(`    ${ok(availableTransitions(expenseWorkflow, "APPROVED", "OWNER").length === 0)} rien depuis APPROVED, même pour OWNER`);
console.log(`    ${ok(availableTransitions(expenseWorkflow, "CANCELLED", "OWNER").length === 0)} rien depuis CANCELLED, même pour OWNER`);
console.log(`    ${ok(!canTransition(expenseWorkflow, "DRAFT", "APPROVED", "OWNER").allowed)} aucun raccourci DRAFT → APPROVED`);

// Aucune matrice parallèle : ni rôle en dur, ni table de rôles ailleurs.
//
// ⚠️ UNE exception, introduite au lot 11.1 et volontaire : `finance.ts` compare
// `actor.role !== "PARENT"` pour décider de la RESTRICTION DE PORTÉE d'un parent
// sur ses propres factures. Ce n'est pas une règle d'accès — `hasAccess()` reste
// seul juge de qui entre où — mais une règle de *visibilité de données*, qui ne
// peut pas s'exprimer en chemin d'URL. Le contrôle exige donc que chaque mention
// soit une comparaison sur `actor.role` ; `verify-finance-security.ts` le
// revérifie mention par mention.
const roleLiteral = new RegExp(`["'](${ROLES.join("|")})["']`);
const SCOPE_EXCEPTION = "src/lib/finance.ts";

const citing = FINANCE_FILES.filter((f) => roleLiteral.test(code(f)));
const unexpected = citing.filter((f) => f !== SCOPE_EXCEPTION);
console.log(`    ${ok(unexpected.length === 0)} aucun fichier financier ne cite un rôle en dur${unexpected.length ? ` (${unexpected.join(", ")})` : ""}`);

const scopeMentions = [...code(SCOPE_EXCEPTION).matchAll(/(.{0,20})"(?:PARENT)"/g)];
const allScoped = scopeMentions.every(([, before]) => /actor\.role\s*[!=]==?\s*$/.test(before));
console.log(`    ${ok(scopeMentions.length > 0 && allScoped)} l'exception de finance.ts : ${scopeMentions.length} mentions, toutes des comparaisons actor.role`);
const otherRoles = new RegExp(`["'](${ROLES.filter((r) => r !== "PARENT").join("|")})["']`);
console.log(`    ${ok(!otherRoles.test(code(SCOPE_EXCEPTION)))} …et aucun AUTRE rôle n'y est cité`);
console.log(`    ${ok(ROLE_DENIALS.ACCOUNTANT?.includes(FINANCE_REVIEW_PATH) === true)} le refus est déclaré dans la matrice centrale`);

/* ═══════════════════ 3. AUTORITÉ DES ACTIONS ═══════════════════ */

console.log(`\n[3] AUTORITÉ — LE CLIENT NE FOURNIT JAMAIS L'ÉCOLE`);

for (const f of ACTION_FILES) {
  const src = code(f);
  const sigs = exportedSignatures(src);
  const withSchool = sigs.filter((s) => /\bschoolId\b/.test(s.params));
  const withUser = sigs.filter((s) => /\buserId\b/.test(s.params));
  console.log(`    ${ok(sigs.length > 0 && withSchool.length === 0)} ${f.replace("src/app/dashboard/payments/", "")} — ${sigs.length} action·s, 0 schoolId en paramètre`);
  console.log(`    ${ok(withUser.length === 0)} ${" ".repeat(f.replace("src/app/dashboard/payments/", "").length)}   0 userId en paramètre`);

  // L'état de départ ne doit pas non plus venir du client : le recevoir
  // permettrait de rejouer une transition depuis un état périmé.
  const fromParam = sigs.filter((s) => /\bfrom\s*:/.test(s.params));
  console.log(`    ${ok(fromParam.length === 0)} ${" ".repeat(f.replace("src/app/dashboard/payments/", "").length)}   0 état « from » en paramètre`);

  console.log(`    ${ok(/requireActionContext\(/.test(src))} ${" ".repeat(f.replace("src/app/dashboard/payments/", "").length)}   requireActionContext() utilisé`);
  console.log(`    ${ok(/"use server"/.test(raw(f)))} ${" ".repeat(f.replace("src/app/dashboard/payments/", "").length)}   marqué "use server"`);
}

// `finance.ts` est le seul point de lecture : sa signature doit être aussi stricte.
const financeSigs = exportedSignatures(code("src/lib/finance.ts"));
const financeLeaks = financeSigs.filter((s) => /\bschoolId\b/.test(s.params));
console.log(`    ${ok(financeSigs.length > 0 && financeLeaks.length === 0)} finance.ts — ${financeSigs.length} fonctions exportées, aucune n'accepte de schoolId`);
console.log(`    ${ok(financeSigs.filter((s) => /actor:\s*ActorContext/.test(s.params)).length >= 6)} …et les lectures exigent un ActorContext`);

// Gardes de page : masquer un lien ne suffit pas.
for (const p of ["expenses", "statement", "review"]) {
  const src = code(`src/app/dashboard/payments/${p}/page.tsx`);
  const guarded = /hasAccess\(/.test(src) && /redirect\(/.test(src);
  console.log(`    ${ok(guarded)} ${p.padEnd(9)} garde SERVEUR (hasAccess + redirect)`);
}

/* ═══════════════════ 4. ISOLATION MULTI-ÉTABLISSEMENT ═══════════════ */

console.log(`\n[4] ISOLATION — CHAQUE APPEL PRISMA, UN PAR UN`);

const PRISMA_CALL = /prisma\.(\w+)\.(findMany|findFirst|findUnique|count|aggregate|groupBy|create|createMany|update|updateMany|delete|deleteMany|upsert)\(/g;

let totalCalls = 0;
let leaks: string[] = [];
for (const f of FINANCE_FILES) {
  const src = code(f);
  const calls = callArgs(src, PRISMA_CALL);
  totalCalls += calls.length;
  for (const c of calls) {
    // Un `schoolId` doit apparaître dans les arguments, quelle qu'en soit la
    // forme (`schoolId`, `schoolId: ctx.schoolId`, `...school`).
    //
    // ⚠️ `where: scope` compte aussi, et c'est le motif le PLUS strict : `scope`
    // est produit par `invoiceScope(actor)`, qui pose toujours le `schoolId` et y
    // ajoute la restriction parent. Un appelant ne peut pas l'oublier, alors
    // qu'il peut oublier une propriété écrite à la main. Contrôlé juste après :
    // aucun `scope` ne provient d'ailleurs que d'`invoiceScope()`.
    const partitioned =
      /schoolId/.test(c.args) || /\.\.\.school\b/.test(c.args) ||
      /where:\s*scope\b/.test(c.args) || /\.\.\.scope\b/.test(c.args);
    if (!partitioned) leaks.push(`${f} → ${c.call}`);
  }
}
console.log(`    ${ok(totalCalls > 0 && leaks.length === 0)} ${totalCalls} appels Prisma inspectés, ${leaks.length} sans schoolId`);
for (const l of leaks) console.log(`          ↳ ${l}`);

// Contrepartie de la tolérance `where: scope` : tout `scope` doit venir
// d'`invoiceScope()`. Sans ce contrôle, il suffirait de nommer une variable
// `scope` pour échapper à l'inspection ci-dessus.
const scopeUsers = FINANCE_FILES.filter((f) => /where:\s*scope\b/.test(code(f)));
const scopeSources = scopeUsers.filter((f) => /const\s+scope\s*=\s*invoiceScope\(/.test(code(f)));
console.log(`    ${ok(scopeUsers.length === scopeSources.length)} ${scopeUsers.length} usage·s de « where: scope », tous issus d'invoiceScope()`);

// Les agrégats sont le cas dangereux : un total se lit comme le sien.
const aggregates = FINANCE_FILES.flatMap((f) =>
  callArgs(code(f), /prisma\.(\w+)\.(aggregate|groupBy|count)\(/g).map((c) => ({ f, c })),
);
const aggLeaks = aggregates.filter(({ c }) => !/schoolId/.test(c.args) && !/\.\.\.school\b/.test(c.args));
console.log(`    ${ok(aggregates.length > 0 && aggLeaks.length === 0)} ${aggregates.length} agrégations, toutes partitionnées`);

// Les lectures d'objet unique doivent l'être aussi : connaître un id ne doit
// pas suffire. C'est le point de vigilance signalé par le lot 10.
const singles = callArgs(code("src/lib/finance.ts"), /prisma\.(\w+)\.findFirst\(/g);
console.log(`    ${ok(singles.every((c) => /schoolId:\s*actor\.schoolId/.test(c.args)))} ${singles.length} lectures par identifiant, toutes bornées à l'école de l'acteur`);

// Les écritures aussi portent le schoolId dans leur `where`.
const updates = ACTION_FILES.flatMap((f) => callArgs(code(f), /prisma\.(\w+)\.update\(/g));
console.log(`    ${ok(updates.length > 0 && updates.every((c) => /where:\s*\{[^}]*schoolId/.test(c.args)))} ${updates.length} écritures, toutes avec schoolId dans le where`);

/* ═══════════════════════ 5. PÉRIODES ═══════════════════════ */

console.log(`\n[5] PÉRIODES`);
const ref = new Date(2026, 7, 17, 14, 30);

const kinds = [dayPeriod(ref), weekPeriod(ref), monthPeriod(ref), customPeriod(ref, ref)];
console.log(`    ${ok(new Set(kinds.map((k) => k.kind)).size === 4)} jour, semaine, mois et personnalisée produisent 4 granularités distinctes`);
console.log(`    ${ok(kinds.every((k) => k.to > k.from && Boolean(k.label)))} chaque période a des bornes ordonnées et un libellé`);
console.log(`    ${ok(termPeriod({ name: "T1", startDate: null, endDate: null }) === null)} trimestre sans dates → null, jamais de bornes inventées`);

const m = monthPeriod(ref);
const f = periodFilter(m, "spentAt") as Record<string, { gte: Date; lt: Date }>;
console.log(`    ${ok("lt" in f.spentAt && !("lte" in f.spentAt))} periodFilter produit « lt » — borne de fin exclue`);

// Le code financier ne doit pas recalculer ses propres bornes.
const financeSrc = code("src/lib/finance.ts");
console.log(`    ${ok(/periodFilter\(/.test(financeSrc))} finance.ts filtre via periodFilter()`);
console.log(`    ${ok(!/getTime\(\)\s*-\s*\d+\s*\*/.test(financeSrc))} …sans arithmétique de date maison`);
console.log(`    ${ok(/periodTo:\s*\{\s*gt:/.test(financeSrc))} chevauchement et verrou respectent la borne exclue (gt, pas gte)`);

// Le mois ne doit pas être codé en dur : les cinq granularités sont atteignables.
const resolveBody = financeSrc.slice(financeSrc.indexOf("export async function resolvePeriod"));
for (const k of ["day", "week", "month", "term", "custom"]) {
  console.log(`    ${ok(new RegExp(`"${k}"`).test(resolveBody))} granularité « ${k} » atteignable depuis l'URL`);
}

// Les bornes ne viennent jamais du client.
const picker = code("src/app/dashboard/payments/_finance/PeriodPicker.tsx");
console.log(`    ${ok(!/periodFrom|periodTo|monthPeriod|customPeriod\(/.test(picker))} le sélecteur ne calcule aucune borne (résolution serveur)`);

// L'instantané est figé : sinon un état approuvé changerait après coup.
const stActions = code("src/app/dashboard/payments/statement/actions.ts");
console.log(`    ${ok(/collectedTotal:\s*snap\.collected/.test(stActions))} les totaux sont figés à la soumission`);
console.log(`    ${ok(stActions.indexOf("financeSnapshot(") < stActions.indexOf("runTransition("))} …calculés AVANT la transition, dans la même action`);

/* ═══════════════════════ 6. TRAÇABILITÉ ═══════════════════════ */

console.log(`\n[6] TRAÇABILITÉ`);
for (const f of ACTION_FILES) {
  const src = code(f);
  const short = f.replace("src/app/dashboard/payments/", "");
  console.log(`    ${ok(/runTransition\(/.test(src))} ${short.padEnd(22)} transitions centralisées par runTransition()`);
  console.log(`    ${ok(/recordAudit\(/.test(src))} ${short.padEnd(22)} créations/modifications tracées par recordAudit()`);
  // Une transition écrite à la main contournerait l'historique.
  const directStatus = callArgs(src, /prisma\.(expense|financialStatement)\.update\(/g)
    .filter((c) => /status:/.test(c.args) && !/runTransition/.test(src.slice(Math.max(0, src.indexOf(c.args) - 400), src.indexOf(c.args))));
  console.log(`    ${ok(directStatus.length === 0)} ${short.padEnd(22)} aucun changement d'état hors du moteur`);
}
console.log(`    ${ok(/workflowTransition\.create/.test(code("src/lib/workflowHistory.ts")))} WorkflowTransition est bien écrite`);
console.log(`    ${ok(/auditLog\.create/.test(code("src/lib/audit.ts")))} AuditLog est bien écrite`);

// L'historique doit être affiché, pas seulement enregistré.
const timeline = code("src/app/dashboard/payments/_finance/HistoryTimeline.tsx");
for (const info of ["actorRole", "fromState", "toState", "comment", "createdAt", "actorId"]) {
  console.log(`    ${ok(new RegExp(`\\b${info}\\b`).test(timeline))} l'historique affiche « ${info} »`);
}
console.log(`    ${ok(/transitionHistory\(|recentTransitions\(/.test(code("src/app/dashboard/payments/statement/page.tsx") + code("src/app/dashboard/payments/review/page.tsx")))} les écrans lisent réellement l'historique`);
console.log(`    ${ok(/recentAudit\(/.test(code("src/app/dashboard/payments/review/page.tsx")))} le journal d'activité est exposé à la direction`);

/* ═══════════════════════ 7. VOCABULAIRE ═══════════════════════ */

console.log(`\n[7] VOCABULAIRE D'ÉTAT`);
const ALL_STATES = ["DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "CANCELLED"];

// ⚠️ Le vrai risque n'est PAS qu'un fichier cite un statut : une action doit
// nommer l'état qu'elle vise, et `finance.ts` filtre légitimement sur
// `["SUBMITTED", "APPROVED"]`. Chercher les 5 noms n'importe où dans un fichier
// donnait donc quatre faux échecs.
//
// Le risque réel est qu'un fichier REDÉCLARE la liste — un tableau parallèle qui
// divergera de l'énumération Prisma. Le contrôle n'inspecte donc que les
// littéraux de tableau, extraits par profondeur de crochets.
function arrayLiterals(src: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "[") continue;
    let depth = 1;
    let j = i + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === "[") depth++;
      else if (src[j] === "]") depth--;
      j++;
    }
    out.push(src.slice(i, j));
  }
  return out;
}

const redeclaring = FINANCE_FILES.filter((file) =>
  arrayLiterals(code(file)).some((lit) => ALL_STATES.every((s) => lit.includes(`"${s}"`))),
);
console.log(`    ${ok(redeclaring.length === 0)} aucun tableau ne redéclare les 5 statuts${redeclaring.length ? ` (${redeclaring.join(", ")})` : ""}`);
console.log(`    ${ok(Object.keys(STATUS.expense).length === 5 && Object.keys(STATUS.financialStatement).length === 5)} les deux domaines de status.ts sont complets`);

// Libellés distincts : c'est la raison d'être du cloisonnement par domaine.
const differing = ALL_STATES.filter(
  (s) => (STATUS.expense as Record<string, { label: string }>)[s].label !==
         (STATUS.financialStatement as Record<string, { label: string }>)[s].label,
);
console.log(`    ${ok(differing.length >= 3)} ${differing.length}/5 libellés diffèrent entre dépense et état — le cloisonnement sert`);
console.log(`    ${ok(Object.values(STATUS.expense).every((d) => d.label.length > 0))} aucun statut sans libellé français`);

// La couleur ne porte jamais l'information seule : `StatusBadge` tire son
// libellé de `status.ts`, donc il ne peut être muet QUE s'il lui manque un
// `domain` ou un `status`. C'est cela qu'on vérifie.
//
// (La version précédente cherchait `StatusBadge…>` suivi de `<` : sur une balise
// auto-fermante `… />`, elle attrapait le `>` du `/>` puis le `<` de la balise
// fermante suivante — quatre pastilles correctes déclarées muettes.)
const badges = [...FINANCE_FILES.flatMap((f) => [...code(f).matchAll(/<StatusBadge\b[^>]*\/>/g)].map((m) => ({ f, tag: m[0] })))];
const mute = badges.filter(({ tag }) => !/domain=/.test(tag) || !/status=/.test(tag));
console.log(`    ${ok(badges.length > 0 && mute.length === 0)} ${badges.length} pastilles, toutes avec domaine et statut (donc un libellé)`);

/* ═══════════════════════ 8. HONNÊTETÉ DES CHIFFRES ═══════════════════ */

console.log(`\n[8] HONNÊTETÉ DES CHIFFRES`);

// Le contrôle porte sur l'objet retourné par financeSnapshot : chaque champ doit
// venir d'une variable calculée, jamais d'un littéral.
const snapStart = financeSrc.indexOf("export async function financeSnapshot");
const returnStart = financeSrc.indexOf("return {", snapStart);
const returnBlock = financeSrc.slice(returnStart, financeSrc.indexOf("\n}", returnStart));
const literalInReturn = /:\s*\d+(?![.\w])/.test(returnBlock.replace(/balance:\s*collected - approved\.amount/, ""));
console.log(`    ${ok(!literalInReturn)} aucun champ de l'instantané n'est un nombre en dur`);
console.log(`    ${ok(/collected:\s*byMethod\.reduce|collected,/.test(returnBlock))} « encaissé » vient des Payment agrégés`);
console.log(`    ${ok(/balance:\s*collected\s*-\s*approved\.amount/.test(returnBlock))} le solde n'est QUE encaissé − dépenses approuvées`);

// Les recettes se comptent sur Payment, pas sur Invoice : les deux divergeaient.
const payAgg = callArgs(financeSrc, /prisma\.payment\.groupBy\(/g);
console.log(`    ${ok(payAgg.length >= 1 && payAgg.some((c) => /_sum:\s*\{\s*amount/.test(c.args)))} les recettes agrègent Payment.amount`);
console.log(`    ${ok(!/status:\s*"PAID"/.test(financeSrc))} …et jamais le montant des factures marquées payées`);

// Seul l'approuvé entre dans un total de dépenses.
console.log(`    ${ok(/COUNTED_EXPENSE[\s\S]{0,40}=\s*"APPROVED"/.test(financeSrc))} seules les dépenses APPROVED comptent`);
console.log(`    ${ok(/expenseSubmitted|expenseOpen/.test(financeSrc))} l'en-attente et le non-transmis sont comptés SÉPARÉMENT`);

// Le retard est dérivé de la date, car rien n'écrit jamais OVERDUE.
console.log(`    ${ok(/dueDate\s*<\s*now/.test(financeSrc))} le retard est dérivé de dueDate, pas du statut OVERDUE`);

// Aucun montant en dur dans les écrans.
const moneyLiteral = /\b\d{4,}\b/;
const suspicious: string[] = [];
for (const file of FINANCE_FILES) {
  for (const line of code(file).split("\n")) {
    if (!moneyLiteral.test(line)) continue;
    // Contextes légitimes : longueurs de champ, tailles, millisecondes, années.
    if (/maxLength|slice\(|take|rows=|864e5|length|width|height|\d{4}-\d{2}|z-\d|2000\)/.test(line)) continue;
    suspicious.push(`${file}: ${line.trim().slice(0, 80)}`);
  }
}
console.log(`    ${ok(suspicious.length === 0)} aucun montant en dur dans les écrans financiers`);
for (const s of suspicious) console.log(`          ↳ ${s}`);

// Aucun repli inventé du type `?? 500` sur une valeur d'argent.
const fallback = FINANCE_FILES.filter((file) => /\?\?\s*[1-9]\d{2,}/.test(code(file)));
console.log(`    ${ok(fallback.length === 0)} aucun repli financier inventé (?? <montant>)`);

/* ═══════════════════════ 9. SCHÉMA ═══════════════════════ */

console.log(`\n[9] SCHÉMA`);
const expBlock = schema.match(/model Expense \{([\s\S]*?)\n\}/)?.[1] ?? "";
const stBlock = schema.match(/model FinancialStatement \{([\s\S]*?)\n\}/)?.[1] ?? "";
console.log(`    ${ok(expBlock.length > 0 && stBlock.length > 0)} les deux modèles existent`);

// Les informations exigées par le lot, champ par champ.
for (const fld of ["amount", "spentAt", "label", "category", "payee", "receiptRef", "status", "createdById", "createdAt", "updatedAt", "schoolId"]) {
  console.log(`    ${ok(new RegExp(`^\\s*${fld}\\s`, "m").test(expBlock))} Expense.${fld}`);
}
for (const fld of ["periodKind", "periodFrom", "periodTo", "periodLabel", "status", "collectedTotal", "expenseTotal", "receivableTotal", "balance", "schoolId"]) {
  console.log(`    ${ok(new RegExp(`^\\s*${fld}\\s`, "m").test(stBlock))} FinancialStatement.${fld}`);
}

// La date de dépense est distincte de la date de saisie.
console.log(`    ${ok(/spentAt\s+DateTime\s*$/m.test(expBlock) && /createdAt\s+DateTime/.test(expBlock))} spentAt (dépense) ≠ createdAt (saisie)`);
// L'instantané doit pouvoir être vide tant que l'état est brouillon.
console.log(`    ${ok(/collectedTotal\s+Float\?/.test(stBlock))} les totaux figés sont nullables (brouillon = pas d'instantané)`);
// Aucune cascade nouvelle en dehors du rattachement à l'école.
const cascades = (expBlock + stBlock).match(/onDelete:\s*(\w+)/g) ?? [];
console.log(`    ${ok(cascades.every((c) => c.includes("Cascade")) && cascades.length === 2)} un seul onDelete par modèle, vers School (${cascades.length})`);
console.log(`    ${ok(!/Expense\[\]|FinancialStatement\[\]/.test(schema.match(/model Student \{[\s\S]*?\n\}/)?.[0] ?? ""))} aucune relation ajoutée aux modèles élèves`);

// Les modèles d'avant le lot doivent tous survivre.
const MODELS_AVANT_LOT_11 = [
  "Invitation", "WaitlistEntry", "DocumentRequest", "School", "User", "AuditLog",
  "WorkflowTransition", "Student", "Class", "Enrollment", "Invoice", "InvoiceItem",
  "Payment", "Survey", "SurveyResponse", "Message", "WebhookEvent", "Subject",
  "ClassSubject", "TeachingAssignment", "Term", "Evaluation", "ReportCard", "Grade",
];
const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((x) => x[1]);
const gone = MODELS_AVANT_LOT_11.filter((x) => !models.includes(x));
console.log(`    ${ok(gone.length === 0)} les ${MODELS_AVANT_LOT_11.length} modèles d'avant le lot sont présents${gone.length ? ` (manquants : ${gone.join(", ")})` : ""}`);
// ⚠️ Mis à jour au lot 12.1 — même raison qu'au-dessus : `=== longueur + 2`
// figeait le schéma au lot 11 et faisait échouer tout lot ultérieur. Ce qui
// devait être garanti, c'est que le lot 11 a bien ajouté SES deux modèles sans
// en supprimer aucun, pas que le schéma ne grandirait plus jamais.
const ajoutsLot11 = models.includes("Expense") && models.includes("FinancialStatement");
console.log(`    ${ok(ajoutsLot11 && gone.length === 0)} les 2 modèles du lot 11 sont présents, aucun modèle antérieur perdu (schéma : ${models.length} modèles)`);

// Les colonnes de Payment et Invoice ne doivent pas avoir bougé.
const payBlock = schema.match(/model Payment \{([\s\S]*?)\n\}/)?.[1] ?? "";
console.log(`    ${ok(/amount\s+Float/.test(payBlock) && /method\s+PaymentMethod/.test(payBlock))} Payment inchangé (seul un index ajouté)`);
console.log(`    ${ok(/@@index\(\[schoolId, createdAt\]\)/.test(payBlock))} …index [schoolId, createdAt] pour les recettes par période`);

/* ═══════════════════════ 10. INTERFACE ═══════════════════════ */

console.log(`\n[10] INTERFACE`);
const UI_PRIMITIVES = ["PageHeader", "Card", "DataTable", "StatusBadge", "Button", "EmptyState"];
const uiFiles = FINANCE_FILES.filter((f) => f.endsWith(".tsx"));
for (const p of UI_PRIMITIVES) {
  const used = uiFiles.some((f) => new RegExp(`\\b${p}\\b`).test(code(f)));
  console.log(`    ${ok(used)} ${p} utilisé`);
}
console.log(`    ${ok(uiFiles.some((f) => /Modal/.test(code(f))))} Modal utilisé`);
console.log(`    ${ok(uiFiles.some((f) => /Input|Select|Textarea/.test(code(f))))} champs du socle utilisés`);

// Interdits du socle (lot 02).
for (const [nom, re] of [
  ["couleur hexadécimale en dur", /#[0-9a-fA-F]{6}\b/],
  ["dégradé décoratif", /bg-gradient-to-/],
  ["flou de type glassmorphism", /backdrop-blur|blur-3xl/],
] as const) {
  const guilty = uiFiles.filter((f) => re.test(code(f)));
  console.log(`    ${ok(guilty.length === 0)} aucun ${nom}${guilty.length ? ` (${guilty.join(", ")})` : ""}`);
}

/**
 * Isole une balise JSX complète, en comptant les accolades.
 *
 * ⚠️ **Ne PAS utiliser `[^>]*` ici.** Une prop comme `icon={<Plus … />}` contient
 * un `>` imbriqué : la classe négative s'y arrête et rend un fragment tronqué,
 * qui paraît auto-fermant alors que la balise a des enfants. Ce piège exact a
 * produit quatre faux échecs d'accessibilité au lot 07, et il vient d'en produire
 * dix ici avant cette correction.
 *
 * La balise se termine au premier `>` rencontré à profondeur d'accolades nulle.
 */
function jsxTags(src: string, tagName: string): { tag: string; selfClosing: boolean }[] {
  const out: { tag: string; selfClosing: boolean }[] = [];
  const re = new RegExp(`<${tagName}\\b`, "g");
  for (const m of src.matchAll(re)) {
    let depth = 0;
    let i = m.index + m[0].length;
    while (i < src.length) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
      i++;
    }
    const tag = src.slice(m.index, i + 1);
    out.push({ tag, selfClosing: /\/\s*>$/.test(tag) });
  }
  return out;
}

const buttons = uiFiles.flatMap((f) => jsxTags(code(f), "Button").map((b) => ({ f, ...b })));
const iconOnly = buttons.filter((b) => b.selfClosing);
const silent = iconOnly.filter((b) => !/aria-label=/.test(b.tag));
console.log(`    ${ok(buttons.length > 0 && silent.length === 0)} ${buttons.length} boutons, dont ${iconOnly.length} sans enfant — tous avec aria-label`);
for (const s of silent) console.log(`          ↳ ${s.f}: ${s.tag.replace(/\s+/g, " ").slice(0, 80)}`);

// Responsive : les grilles doivent avoir un point de rupture.
const grids = uiFiles.filter((f) => /grid-cols-1/.test(code(f)));
console.log(`    ${ok(grids.every((f) => /(sm|md|lg|xl):grid-cols-/.test(code(f))))} les grilles ont un point de rupture (${grids.length} fichiers)`);
console.log(`    ${ok(uiFiles.some((f) => /overflow-x-auto/.test(code(f))) || /overflow-x-auto/.test(code("src/components/ui/DataTable.tsx")))} les tableaux larges défilent horizontalement`);

// États système.
for (const p of ["expenses", "statement", "review"]) {
  console.log(`    ${ok(existsSync(`src/app/dashboard/payments/${p}/loading.tsx`))} ${p.padEnd(9)} a son état de chargement`);
}
console.log(`    ${ok(existsSync("src/app/dashboard/error.tsx"))} la frontière d'erreur du tableau de bord couvre ces segments`);
console.log(`    ${ok(uiFiles.some((f) => /EmptyState/.test(code(f))))} l'état vide est traité`);

/* ═══════════════════════ verdict ═══════════════════════ */

console.log(`\n${fail === 0 ? "✅ WORKFLOW FINANCIER VÉRIFIÉ" : `❌ ${fail} CONTRÔLE·S EN ÉCHEC`}\n`);
process.exit(fail === 0 ? 0 : 1);
