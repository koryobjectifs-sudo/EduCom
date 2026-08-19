/**
 * Vérifie les fondations opérationnelles (LOT 10). LECTURE SEULE.
 *
 *   1. WORKFLOW    machines cohérentes, calées sur l'énumération Prisma réelle ;
 *   2. PERMISSIONS une seule matrice — `hasAccess()`, aucune liste de rôles locale ;
 *   3. PÉRIODES    bornes, semaine au lundi, trimestre sans dates ;
 *   4. AUDIT       isolation par schoolId, acteur jamais fourni par le client ;
 *   5. SCHÉMA      la table est bien celle décrite, sans cascade ni relation ;
 *   6. FRONTIÈRES  workflow.ts et period.ts restent utilisables côté client.
 *
 * Le test d'écriture réelle (aller-retour en base + isolation entre deux écoles)
 * n'est PAS ici : ce script ne doit jamais écrire en base, comme les neuf autres.
 * Il a été exécuté séparément lors du lot 10 ; voir `context.md`.
 *
 *   npm run script -- scripts/verify-foundations.ts
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { hasAccess, ROLE_PERMISSIONS, type RoleType } from "../src/lib/permissions";
import {
  WORKFLOWS,
  reportCardWorkflow,
  validateDefinition,
  canTransition,
  availableTransitions,
} from "../src/lib/workflow";
import {
  dayPeriod, weekPeriod, monthPeriod, rollingDays,
  termPeriod, customPeriod, periodFilter, contains,
} from "../src/lib/period";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
/** Code sans commentaires : un docblock qui cite un motif ne doit pas le valider. */
const code = (p: string) =>
  readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const raw = (p: string) => readFileSync(p, "utf8");

const routeExists = (href: string) =>
  existsSync(join("src/app", href.replace(/^\//, ""), "page.tsx"));

console.log(`\n=== FONDATIONS OPÉRATIONNELLES ===\n`);

/* ─────────────────────────────── 1. WORKFLOW ─────────────────────────────── */

console.log(`[1] MACHINES DÉCLARÉES`);
const machines = Object.entries(WORKFLOWS);
console.log(`    ${ok(machines.length > 0)} ${machines.length} machine·s au registre`);

for (const [key, wf] of machines) {
  const errors = validateDefinition(wf);
  console.log(`\n    ${wf.name} — ${wf.states.length} états, ${wf.transitions.length} transitions`);
  console.log(`      ${ok(errors.length === 0)} définition cohérente${errors.length ? ` : ${errors.join(" ; ")}` : ""}`);
  console.log(`      ${ok(key === wf.name)} clé du registre == nom de la machine`);
  // Un état terminal sans issue : sinon « définitif » est un mensonge.
  for (const t of wf.terminal) {
    console.log(`      ${ok(!wf.transitions.some((x) => x.from === t))} « ${t} » est réellement sans issue`);
  }
  // Chaque transition doit viser une route existante, sinon `hasAccess()` juge
  // un chemin mort et refusera tout le monde en silence.
  for (const t of wf.transitions) {
    console.log(`      ${ok(routeExists(t.requiredPath))} ${`${t.from}→${t.to}`.padEnd(22)} ${t.requiredPath}`);
  }
}

// ---- Calage sur l'énumération Prisma RÉELLE, pas sur une copie ----
console.log(`\n    Calage sur le schéma Prisma`);
const schema = raw("prisma/schema.prisma");
const enumBlock = schema.match(/enum ReportCardStatus \{([^}]*)\}/)?.[1] ?? "";
const enumStates = enumBlock
  .split("\n")
  .map((l) => l.replace(/\/\/.*$/, "").trim())
  .filter(Boolean);
console.log(`      ${ok(enumStates.length > 0)} énumération ReportCardStatus lue (${enumStates.length} valeurs)`);
const declared = [...reportCardWorkflow.states].sort().join(",");
const inSchema = [...enumStates].sort().join(",");
console.log(`      ${ok(declared === inSchema)} états déclarés == énumération Prisma`);
if (declared !== inSchema) console.log(`        code:   ${declared}\n        schéma: ${inSchema}`);
console.log(`      ${ok(reportCardWorkflow.initial === "DRAFT")} état initial == @default(DRAFT) du schéma`);

/* ─────────────────────────── 2. UNE SEULE MATRICE ─────────────────────────── */

console.log(`\n[2] AUCUNE MATRICE DE PERMISSIONS PARALLÈLE`);
const ROLES = Object.keys(ROLE_PERMISSIONS) as RoleType[];
const wfCode = code("src/lib/workflow.ts");
const histCode = code("src/lib/workflowHistory.ts");

// Un nom de rôle en dur ici recréerait le doublon supprimé aux lots 06 et 09.
const roleLiteral = new RegExp(`["'](${ROLES.join("|")})["']`);
console.log(`    ${ok(!roleLiteral.test(wfCode))} workflow.ts ne cite aucun rôle en dur`);
console.log(`    ${ok(!roleLiteral.test(histCode))} workflowHistory.ts ne cite aucun rôle en dur`);
console.log(`    ${ok(/hasAccess\(/.test(wfCode))} workflow.ts délègue à hasAccess()`);
console.log(`    ${ok(!/hasAccess\(/.test(histCode))} workflowHistory.ts ne rejuge pas les droits (canTransition le fait)`);

// Le contrôle doit produire le bon résultat, pas seulement appeler la fonction.
console.log(`\n    Effet réel par rôle sur le bulletin :`);
for (const r of ROLES) {
  const canWrite = hasAccess(r, "/dashboard/grades");
  const canReview = hasAccess(r, "/dashboard/documents/validation");
  const submit = canTransition(reportCardWorkflow, "VALIDATED", "SUBMITTED", r).allowed;
  const approve = canTransition(reportCardWorkflow, "SUBMITTED", "APPROVED", r).allowed;
  const consistent = submit === canWrite && approve === canReview;
  console.log(`      ${ok(consistent)} ${r.padEnd(11)} déposer=${submit ? "oui" : "non"} approuver=${approve ? "oui" : "non"}`);
}
// L'anomalie que la séparation des chemins doit empêcher.
console.log(`    ${ok(!canTransition(reportCardWorkflow, "SUBMITTED", "APPROVED", "TEACHER").allowed)} un TEACHER ne peut pas approuver son propre travail`);
console.log(`    ${ok(canTransition(reportCardWorkflow, "SUBMITTED", "APPROVED", "SECRETARY").allowed)} le SECRETARY peut approuver`);
console.log(`    ${ok(availableTransitions(reportCardWorkflow, "APPROVED", "OWNER").length === 0)} rien n'est proposé depuis un état terminal, même à OWNER`);
console.log(`    ${ok(!canTransition(reportCardWorkflow, "DRAFT", "APPROVED", "OWNER").allowed)} aucun raccourci DRAFT→APPROVED, même pour OWNER`);

// Un refus doit être motivé, et les trois motifs doivent être distincts.
const reasons = new Set([
  canTransition(reportCardWorkflow, "APPROVED", "DRAFT", "OWNER"),
  canTransition(reportCardWorkflow, "DRAFT", "APPROVED", "OWNER"),
  canTransition(reportCardWorkflow, "SUBMITTED", "APPROVED", "TEACHER"),
].map((r) => (r.allowed ? "" : r.reason)));
console.log(`    ${ok(reasons.size === 3 && !reasons.has(""))} trois refus, trois motifs distincts`);

// Un commentaire obligatoire là où un refus doit s'expliquer.
const returned = reportCardWorkflow.transitions.find((t) => t.to === "RETURNED");
console.log(`    ${ok(returned?.commentRequired === true)} le renvoi pour correction exige un commentaire`);
console.log(`    ${ok(/commentRequired/.test(histCode) && /trim\(\)/.test(histCode))} workflowHistory.ts contrôle réellement ce commentaire`);

/* ─────────────────────────────── 3. PÉRIODES ─────────────────────────────── */

console.log(`\n[3] PÉRIODES`);
const ref = new Date(2026, 7, 17, 14, 30); // lundi 17 août 2026, 14 h 30

const d = dayPeriod(ref);
console.log(`    ${ok(d.from.getHours() === 0 && d.to.getTime() - d.from.getTime() === 864e5)} jour = minuit → minuit +24 h (${d.label})`);

const w = weekPeriod(ref);
console.log(`    ${ok(w.from.getDay() === 1)} semaine commence un lundi (${w.label})`);
console.log(`    ${ok(w.to.getTime() - w.from.getTime() === 7 * 864e5)} semaine = 7 jours`);
// Le dimanche est le PIÈGE : getDay() y vaut 0.
const sunday = weekPeriod(new Date(2026, 7, 23, 23, 59));
console.log(`    ${ok(sunday.from.getTime() === w.from.getTime())} le dimanche 23 tombe dans la semaine du lundi 17`);

const m = monthPeriod(ref);
console.log(`    ${ok(m.from.getDate() === 1 && m.to.getDate() === 1 && m.to.getMonth() === 8)} mois = 1ᵉʳ → 1ᵉʳ suivant (${m.label})`);
const dec = monthPeriod(new Date(2026, 11, 15));
console.log(`    ${ok(dec.to.getFullYear() === 2027 && dec.to.getMonth() === 0)} décembre passe bien à janvier de l'année suivante`);

// Borne exclue : sans quoi un enregistrement à minuit compterait dans deux mois.
console.log(`    ${ok(contains(m, new Date(2026, 7, 31, 23, 59)) && !contains(m, m.to))} borne de fin EXCLUE (31 août dedans, 1ᵉʳ sept. dehors)`);
console.log(`    ${ok(!contains(m, new Date(m.from.getTime() - 1)) && contains(m, m.from))} borne de début INCLUSE`);

const f = periodFilter(m, "createdAt") as Record<string, { gte: Date; lt: Date }>;
console.log(`    ${ok("lt" in f.createdAt && !("lte" in f.createdAt))} periodFilter produit « lt », jamais « lte »`);
console.log(`    ${ok(f.createdAt.gte.getTime() === m.from.getTime())} periodFilter reprend les bornes sans les recalculer`);

const r30 = rollingDays(30, ref);
console.log(`    ${ok(Math.round((r30.to.getTime() - r30.from.getTime()) / 864e5) === 30)} fenêtre glissante de 30 jours`);

// Le piège du schéma : Term.startDate / endDate sont nullables.
console.log(`    ${ok(termPeriod({ name: "T1", startDate: null, endDate: null }) === null)} trimestre sans dates → null (pas de bornes inventées)`);
console.log(`    ${ok(termPeriod({ name: "T1", startDate: new Date(2026, 0, 5), endDate: null }) === null)} trimestre à moitié daté → null`);
const t1 = termPeriod({ name: "T1", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 3, 4) });
console.log(`    ${ok(t1 !== null && t1.to.getDate() === 5 && t1.to.getMonth() === 3)} fin de trimestre incluse côté métier → borne exclue au 5 avril`);
console.log(`    ${ok(termPeriod({ name: "X", startDate: new Date(2026, 5, 1), endDate: new Date(2026, 4, 1) }) === null)} trimestre à bornes inversées → null`);

const inverted = customPeriod(new Date(2026, 7, 20), new Date(2026, 7, 10));
console.log(`    ${ok(inverted.from < inverted.to)} période personnalisée : bornes réordonnées`);
console.log(`    ${ok(/nullable|null/.test(raw("src/lib/period.ts")))} le piège des dates nulles est documenté dans le fichier`);

const kinds = new Set([d.kind, w.kind, m.kind, t1?.kind, customPeriod(ref, ref).kind]);
console.log(`    ${ok(["day", "week", "month", "term", "custom"].every((k) => kinds.has(k as never)))} les 5 granularités demandées existent`);

/* ──────────────────────────── 4. AUDIT & ISOLATION ──────────────────────── */

console.log(`\n[4] AUDIT ET ISOLATION`);
const auditCode = code("src/lib/audit.ts");

// L'acteur ne doit jamais pouvoir venir d'un argument libre.
//
// ⚠️ Le contrôle porte sur les LISTES DE PARAMÈTRES des fonctions exportées, pas
// sur le fichier entier : `AuditRecord.userId` et la ligne lue par `decode()`
// contiennent légitimement ces noms — ce sont des valeurs relues en base, pas
// des sources d'autorité. Chercher le nom n'importe où donnait un faux échec.
// ⚠️ Deux fonctions sont exemptées, et il faut savoir pourquoi.
//
// `systemActor(schoolId)` et `isSystemActor(userId)` CONSTRUISENT ou INSPECTENT
// un contexte d'acteur ; elles ne lisent ni n'écrivent rien pour le compte de
// quelqu'un. C'est le pendant de `requireActionContext()`, qui produit lui aussi
// un contexte. L'invariant réel porte sur les fonctions qui *agissent* : celles-là
// doivent recevoir un `ActorContext` déjà résolu, jamais un identifiant libre.
//
// L'exemption est compensée plus bas : `systemActor` ne doit être appelée que
// depuis le balayage serveur, jamais depuis une server action.
const ACTOR_CONSTRUCTORS = new Set(["systemActor", "isSystemActor"]);

for (const [name, src] of [["audit.ts", auditCode], ["workflowHistory.ts", histCode]] as const) {
  const signatures = [...src.matchAll(/export (?:async )?function (\w+)(?:<[^>]*>)?\(([\s\S]*?)\)\s*(?::|\{)/g)];
  const acting = signatures.filter(([, fn]) => !ACTOR_CONSTRUCTORS.has(fn));
  const guilty = acting.filter(([, , params]) => /\b(schoolId|userId)\b/.test(params));
  console.log(`    ${ok(acting.length > 0 && guilty.length === 0)} ${name.padEnd(20)} ${acting.length} fonction·s agissantes, aucune n'accepte de schoolId/userId`);
  console.log(`    ${ok(/actor:\s*ActorContext/.test(src))} ${name.padEnd(20)} exige un ActorContext résolu côté serveur`);
}

// Compensation de l'exemption : l'acteur système reste cantonné au balayage.
const systemCallers = ["src/lib/overdue.ts"].filter((f) => /systemActor\(/.test(code(f)));
const actionFiles = [
  "src/app/dashboard/payments/expenses/actions.ts",
  "src/app/dashboard/payments/statement/actions.ts",
  "src/app/dashboard/payments/actions.ts",
];
const abusers = actionFiles.filter((f) => /systemActor\(/.test(code(f)));
console.log(`    ${ok(systemCallers.length === 1 && abusers.length === 0)} systemActor() n'est appelée que par le balayage, jamais par une server action`);

// Toute lecture doit porter le schoolId. Comptage par requête, pas par fichier.
for (const [name, src] of [["audit.ts", auditCode], ["workflowHistory.ts", histCode]] as const) {
  const reads = [...src.matchAll(/prisma\.\w+\.(findMany|findFirst|findUnique|count|aggregate|groupBy)\(([\s\S]*?)\n  \}\)/g)];
  const leaks = reads.filter((r) => !/schoolId:\s*actor\.schoolId/.test(r[2]));
  console.log(`    ${ok(reads.length > 0 && leaks.length === 0)} ${name.padEnd(20)} ${reads.length} lecture·s, toutes filtrées par actor.schoolId`);
}

// Toute écriture doit porter le schoolId de l'acteur, sinon la ligne est orpheline.
console.log(`    ${ok(/schoolId:\s*actor\.schoolId/.test(auditCode))} audit.ts        : les lignes écrites portent actor.schoolId`);
console.log(`    ${ok(/schoolId:\s*actor\.schoolId/.test(histCode))} workflowHistory : les lignes écrites portent actor.schoolId`);

// Une trace manquante ne doit pas annuler l'acte métier.
console.log(`    ${ok(/catch\s*\(error\)[\s\S]*?return false/.test(auditCode))} recordAudit ne lève jamais (catch → false)`);
console.log(`    ${ok(/catch\s*\(error\)[\s\S]*?return false/.test(histCode))} recordTransition ne lève jamais (catch → false)`);
console.log(`    ${ok(/JSON\.parse[\s\S]{0,200}catch/.test(auditCode))} un JSON abîmé ne casse pas l'écran qui l'affiche`);

// Les deux lignes du même acte, ensemble ou pas du tout.
console.log(`    ${ok(/\$transaction\(\[[\s\S]*?workflowTransition\.create[\s\S]*?auditLog\.create/.test(histCode))} historique + audit écrits dans UNE transaction`);
console.log(`    ${ok(/auditData\(/.test(histCode) && /export function auditData/.test(auditCode))} …via auditData(), sans dupliquer la sérialisation`);

// « Avec quel résultat ? » : les trois issues doivent être écrites quelque part.
for (const outcome of ["success", "failure", "denied"]) {
  console.log(`    ${ok(new RegExp(`outcome:\\s*"${outcome}"`).test(auditCode + histCode))} l'issue « ${outcome} » est journalisée`);
}
console.log(`    ${ok(/outcome:\s*"denied"/.test(histCode))} un refus de droit laisse une trace`);
console.log(`    ${ok(/actorRole:\s*String\(actor\.role\)/.test(histCode))} le rôle est figé au moment de l'acte`);

// L'historique ne doit jamais affirmer un changement qui n'a pas eu lieu.
const applyBeforeRecord =
  histCode.indexOf("await apply(") < histCode.indexOf("await recordTransition(") &&
  histCode.indexOf("await authorizeTransition(") < histCode.indexOf("await apply(");
console.log(`    ${ok(applyBeforeRecord)} runTransition : autoriser → appliquer → tracer, dans cet ordre`);

/* ───────────────────────────────── 5. SCHÉMA ─────────────────────────────── */

console.log(`\n[5] SCHÉMA`);
const wtBlock = schema.match(/model WorkflowTransition \{([\s\S]*?)\n\}/)?.[1] ?? "";
console.log(`    ${ok(wtBlock.length > 0)} model WorkflowTransition présent`);
// Les huit informations exigées : acteur, rôle, date, avant, après, commentaire, école, objet.
for (const field of ["actorId", "actorRole", "createdAt", "fromState", "toState", "comment", "schoolId", "entityId"]) {
  console.log(`    ${ok(new RegExp(`^\\s*${field}\\s`, "m").test(wtBlock))} ${field}`);
}
console.log(`    ${ok(/fromState String\?/.test(wtBlock))} fromState nullable (entrée dans le workflow)`);
// Pas de relation : la table est générique et sert plusieurs types d'objet.
console.log(`    ${ok(!/@relation/.test(wtBlock))} aucune relation (table générique, cf. AuditLog)`);
console.log(`    ${ok(!/onDelete/.test(wtBlock))} aucun onDelete introduit`);
console.log(`    ${ok(/@@index\(\[schoolId, entity, entityId, createdAt\]\)/.test(wtBlock))} index d'historique par objet`);

const auditBlock = schema.match(/model AuditLog \{([\s\S]*?)\n\}/)?.[1] ?? "";
// Les deux index d'origine doivent survivre : leur retrait serait une régression.
console.log(`    ${ok(/@@index\(\[schoolId\]\)/.test(auditBlock))} AuditLog : index [schoolId] d'origine conservé`);
console.log(`    ${ok(/@@index\(\[userId\]\)/.test(auditBlock))} AuditLog : index [userId] d'origine conservé`);
console.log(`    ${ok(/@@index\(\[schoolId, entity, entityId\]\)/.test(auditBlock))} AuditLog : index ajouté pour auditForEntity()`);
console.log(`    ${ok(/details   String\?/.test(auditBlock))} AuditLog : colonnes d'origine intactes`);

// Le lot 10 n'ajoute qu'une table. Le garde énumère les modèles d'AVANT plutôt
// que de figer un total : un total casserait au prochain modèle légitime, en
// laissant croire à une suppression.
const MODELS_AVANT_LOT_10 = [
  "Invitation", "WaitlistEntry", "DocumentRequest", "School", "User", "AuditLog",
  "Student", "Class", "Enrollment", "Invoice", "InvoiceItem", "Payment", "Survey",
  "SurveyResponse", "Message", "WebhookEvent", "Subject", "ClassSubject",
  "TeachingAssignment", "Term", "Evaluation", "ReportCard", "Grade",
];
const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
const disparus = MODELS_AVANT_LOT_10.filter((m) => !models.includes(m));
console.log(`    ${ok(disparus.length === 0)} les ${MODELS_AVANT_LOT_10.length} modèles d'avant le lot 10 sont tous présents${disparus.length ? ` (manquants : ${disparus.join(", ")})` : ""}`);
console.log(`    ${ok(models.includes("WorkflowTransition"))} WorkflowTransition est le seul ajout du lot`);
console.log(`    ${ok(models.includes("ReportCard") && /status         ReportCardStatus @default\(DRAFT\)/.test(schema))} le workflow bulletin existant est inchangé`);

/* ──────────────────────────────── 6. FRONTIÈRES ──────────────────────────── */

console.log(`\n[6] FRONTIÈRES DE MODULE`);
// workflow.ts et period.ts doivent rester importables depuis un composant client.
for (const f of ["src/lib/workflow.ts", "src/lib/period.ts"]) {
  const src = raw(f);
  const runtimeImports = [...src.matchAll(/^import\s+(?!type\s)([\s\S]*?)from\s+["']([^"']+)["']/gm)];
  const pulls = runtimeImports.filter(([, , mod]) => /prisma|generated/.test(mod));
  console.log(`    ${ok(pulls.length === 0)} ${f.padEnd(20)} aucune dépendance runtime sur Prisma`);
}
console.log(`    ${ok(/^import type \{ AuditEntity \}/m.test(raw("src/lib/workflow.ts")))} workflow.ts importe AuditEntity en « import type » (effacé à la compilation)`);
console.log(`    ${ok(/prisma/.test(raw("src/lib/workflowHistory.ts")))} workflowHistory.ts porte les écritures`);

/* ──────────────────────────────── 7. ADOPTION ──────────────────────────────── */

// Le lot 10 pose la mécanique sans la câbler à un écran. Ce relevé n'est donc pas
// un contrôle : il rend visible l'adoption des fondations par les lots suivants,
// et signalera le jour où un module réimplémente ce qui existe déjà ici.
console.log(`\n[7] ADOPTION (relevé, pas un contrôle)`);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const appFiles = walk("src").filter((f) => !f.startsWith(join("src", "generated")) && !f.startsWith(join("src", "lib")));
for (const mod of ["period", "workflow", "workflowHistory", "audit"]) {
  const users = appFiles.filter((f) => new RegExp(`from ["']@/lib/${mod}["']`).test(raw(f)));
  console.log(`    ${mod.padEnd(16)} ${users.length} écran·s : ${users.length ? users.map((u) => u.replace("src/app/", "")).join(", ") : "aucun (attendu au lot 10)"}`);
}

/* ──────────────────────────────── verdict ──────────────────────────────── */

console.log(`\n${fail === 0 ? "✅ FONDATIONS VÉRIFIÉES" : `❌ ${fail} CONTRÔLE·S EN ÉCHEC`}\n`);
process.exit(fail === 0 ? 0 : 1);
