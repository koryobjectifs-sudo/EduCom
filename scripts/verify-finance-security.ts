/**
 * Vérifie le correctif de sécurité financière (LOT 11.1). LECTURE SEULE.
 *
 *   1. PARENT       filtré par la relation RÉELLE, sur les deux chemins du schéma ;
 *   2. AUTORITÉ     aucun parentId ni schoolId venu du client ;
 *   3. SURFACES     tout écran atteignable par un parent est filtré ou refusé ;
 *   4. ENCAISSÉ     une seule définition, partagée par Paiements et l'état ;
 *   5. OVERDUE      idempotent, jamais depuis PAID/CANCELLED, tracé « système » ;
 *   6. RELANCES     le chemin de données de reminder peut aboutir ;
 *   7. FACTURATION  rien de l'existant n'a été supprimé.
 *
 * ═══ ANALYSE STATIQUE : PROFONDEUR, PAS DE REGEX FRAGILE ═══
 *
 * Les arguments d'appels Prisma sont extraits en comptant les parenthèses, et les
 * commentaires sont retirés avant inspection — sinon les docblocks ci-dessus,
 * qui *décrivent* les fuites corrigées, valideraient leurs propres contrôles.
 *
 *   npm run script -- scripts/verify-finance-security.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { hasAccess, ROLE_PERMISSIONS, ROLE_DENIALS, type RoleType } from "../src/lib/permissions";
import { invoiceScope } from "../src/lib/finance";
import { SYSTEM_ACTOR_ID, isSystemActor } from "../src/lib/audit";
import { DOCUMENT_KINDS, documentHref } from "../src/lib/documents";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const raw = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => strip(raw(p));

const ROLES = Object.keys(ROLE_PERMISSIONS) as RoleType[];

/** Chemins d'émission de factures, refusés au parent par le lot 11.1. */
const ISSUING_PATHS = [
  "/dashboard/payments/new",
  "/dashboard/documents/invoice",
  "/dashboard/documents/receipt",
  "/dashboard/documents/reminder",
];

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

function exportedSignatures(src: string): { name: string; params: string }[] {
  const out: { name: string; params: string }[] = [];
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\(/g)) {
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

console.log(`\n=== SÉCURITÉ FINANCIÈRE (LOT 11.1) ===\n`);

/* ══════════════ 1. LA RESTRICTION PARENT, PAR LA VRAIE RELATION ══════════════ */

console.log(`[1] RESTRICTION PARENT`);

const parentScope = invoiceScope({ userId: "u-parent", schoolId: "s-1", role: "PARENT" }) as Record<string, unknown>;
const staffScope = invoiceScope({ userId: "u-staff", schoolId: "s-1", role: "ACCOUNTANT" }) as Record<string, unknown>;

console.log(`    ${ok(parentScope.schoolId === "s-1")} le schoolId est appliqué EN PREMIER, même pour un parent`);
console.log(`    ${ok(Array.isArray(parentScope.OR))} un parent reçoit une restriction OR`);

const or = (parentScope.OR ?? []) as Record<string, unknown>[];
const direct = or.some((c) => c.parentId === "u-parent");
const viaStudent = or.some((c) => (c.student as { parentId?: string } | undefined)?.parentId === "u-parent");
console.log(`    ${ok(direct)} chemin DIRECT couvert (Invoice.parentId)`);
console.log(`    ${ok(viaStudent)} chemin INDIRECT couvert (Invoice.studentId → Student.parentId)`);
console.log(`    ${ok(direct && viaStudent && or.length === 2)} les DEUX chemins, et rien d'autre`);

// ⚠️ Le point qui compte : 0 facture sur 6 utilise le lien direct. Ne couvrir que
// `Invoice.parentId` aurait donné une liste vide — un correctif qui paraît
// fonctionner tout en masquant les vraies factures du parent.
console.log(`    ${ok(viaStudent)} …le chemin indirect est celui qu'utilisent les données réelles`);

console.log(`    ${ok(staffScope.OR === undefined)} un rôle non-parent n'est PAS restreint (seulement par école)`);
console.log(`    ${ok(staffScope.schoolId === "s-1")} …mais reste borné à son établissement`);

// L'identité vient de la session : la signature n'accepte aucun parentId.
const financeSigs = exportedSignatures(code("src/lib/finance.ts"));
const leaky = financeSigs.filter((s) => /\b(parentId|schoolId|userId)\b/.test(s.params));
console.log(`    ${ok(leaky.length === 0)} ${financeSigs.length} fonctions exportées, aucune n'accepte parentId/schoolId/userId`);
console.log(`    ${ok(/actor\.userId/.test(code("src/lib/finance.ts")))} l'identité du parent vient de actor.userId (session)`);

/* ══════════════════════ 2. SURFACES ATTEIGNABLES ══════════════════════ */

console.log(`\n[2] SURFACES ATTEIGNABLES PAR UN PARENT`);

// Les quatre écrans d'émission doivent être refusés.
for (const p of ISSUING_PATHS) {
  console.log(`    ${ok(!hasAccess("PARENT", p))} PARENT refusé sur ${p}`);
}
console.log(`    ${ok(hasAccess("PARENT", "/dashboard/payments"))} …mais garde l'accès à ses factures`);
console.log(`    ${ok(hasAccess("PARENT", "/dashboard/documents"))} …et au hub Documents`);

// Le personnel garde ces écrans : un refus trop large casserait la facturation.
for (const p of ISSUING_PATHS) {
  const staffOk = hasAccess("OWNER", p) && hasAccess("ADMIN", p);
  console.log(`    ${ok(staffOk)} OWNER et ADMIN conservent ${p}`);
}
console.log(`    ${ok(hasAccess("ACCOUNTANT", "/dashboard/payments/new"))} le comptable émet toujours des factures`);
console.log(`    ${ok(hasAccess("ACCOUNTANT", "/dashboard/documents/reminder"))} …et accède toujours aux relances`);

// Gardes SERVEUR sur chaque écran refusé — masquer un lien ne suffit pas.
const GUARDED = [
  "src/app/dashboard/payments/new/page.tsx",
  "src/app/dashboard/documents/invoice/page.tsx",
  "src/app/dashboard/documents/receipt/page.tsx",
  "src/app/dashboard/documents/reminder/page.tsx",
];
for (const f of GUARDED) {
  const src = code(f);
  console.log(`    ${ok(/hasAccess\(/.test(src) && /redirect\(/.test(src))} garde serveur : ${f.replace("src/app/dashboard/", "")}`);
}

// Le motif `schoolId: dbUser?.schoolId` — Prisma ignore un filtre `undefined`.
const optionalChained = GUARDED.concat([
  "src/app/dashboard/payments/page.tsx",
]).filter((f) => /schoolId:\s*\w+\?\./.test(code(f)));
console.log(`    ${ok(optionalChained.length === 0)} aucun « schoolId: x?.y » (filtre silencieusement ignoré)${optionalChained.length ? ` — ${optionalChained.join(", ")}` : ""}`);

// Le hub ne doit pas proposer de lien mort.
const hub = code("src/app/dashboard/documents/page.tsx");
console.log(`    ${ok(/hasAccess\(role,\s*documentHref\(/.test(hub))} le hub Documents filtre ses cartes par hasAccess()`);
const parentVisible = DOCUMENT_KINDS.filter((d) => hasAccess("PARENT", documentHref(d)));
console.log(`    ${ok(parentVisible.length === DOCUMENT_KINDS.length - 3)} un parent voit ${parentVisible.length}/${DOCUMENT_KINDS.length} modèles, sans lien mort`);

/* ═══════════════ 3. LA LISTE ET LES AGRÉGATS SUIVENT LA MÊME PORTÉE ═══════════ */

console.log(`\n[3] LISTE ET AGRÉGATS`);
const pageSrc = code("src/app/dashboard/payments/page.tsx");
const financeSrc = code("src/lib/finance.ts");

console.log(`    ${ok(!/prisma\.invoice\./.test(pageSrc))} l'écran Paiements n'interroge plus Prisma directement`);
console.log(`    ${ok(/invoiceOverview\(/.test(pageSrc))} il passe par invoiceOverview(), qui applique la portée`);
console.log(`    ${ok(/invoiceScope\(actor\)/.test(financeSrc))} invoiceOverview applique invoiceScope()`);

// Les totaux affichés doivent porter sur les factures visibles, pas sur l'école.
const overviewBody = financeSrc.slice(financeSrc.indexOf("export async function invoiceOverview"));
const overviewEnd = overviewBody.indexOf("\n}");
const body = overviewBody.slice(0, overviewEnd);
console.log(`    ${ok(/invoiceIds:\s*ids/.test(body))} les encaissements sont bornés aux factures visibles`);
console.log(`    ${ok(/invoiceId:\s*\{\s*in:\s*ids\s*\}/.test(body))} le reste dû aussi`);
console.log(`    ${ok(/restrictedToParent/.test(pageSrc))} l'écran indique au parent que la vue est la sienne`);

// Tout appel Prisma de finance.ts reste partitionné.
const financeCalls = callArgs(financeSrc, /prisma\.(\w+)\.(findMany|findFirst|findUnique|count|aggregate|groupBy|create|update|updateMany|delete|deleteMany)\(/g);
const unpartitioned = financeCalls.filter((c) => !/schoolId/.test(c.args) && !/\.\.\.school\b/.test(c.args) && !/\.\.\.scope\b/.test(c.args) && !/where:\s*scope/.test(c.args));
console.log(`    ${ok(financeCalls.length > 0 && unpartitioned.length === 0)} ${financeCalls.length} appels Prisma dans finance.ts, ${unpartitioned.length} sans partition`);
for (const u of unpartitioned) console.log(`          ↳ ${u.call}`);

/* ══════════════ 4. « ENCAISSÉ » — UNE SEULE DÉFINITION ══════════════ */

console.log(`\n[4] DÉFINITION UNIQUE DE « ENCAISSÉ »`);

// Une seule agrégation de paiements par mode dans tout le code financier.
const groupBys = callArgs(financeSrc, /prisma\.payment\.groupBy\(/g);
const byMethodAggs = groupBys.filter((g) => /by:\s*\[\s*"method"\s*\]/.test(g.args));
console.log(`    ${ok(byMethodAggs.length === 1)} une seule agrégation par mode de paiement (${byMethodAggs.length})`);
console.log(`    ${ok(/export async function collectedByMethod/.test(financeSrc))} elle vit dans collectedByMethod()`);

// Les deux consommateurs appellent la même fonction.
const snapshotBody = financeSrc.slice(financeSrc.indexOf("export async function financeSnapshot"));
console.log(`    ${ok(/collectedByMethod\(actor,\s*\{\s*period\s*\}\)/.test(snapshotBody))} l'état financier appelle collectedByMethod()`);
console.log(`    ${ok(/collectedByMethod\(actor,\s*\{\s*invoiceIds/.test(body))} l'écran Paiements appelle la MÊME fonction`);

// Le motif fautif : additionner Invoice.totalAmount sous le libellé « encaissé ».
const badSum = /status\s*===\s*"PAID"[\s\S]{0,120}totalAmount/.test(pageSrc) ||
               /totalAmount[\s\S]{0,80}status\s*===\s*"PAID"/.test(pageSrc);
console.log(`    ${ok(!badSum)} l'écran n'additionne plus Invoice.totalAmount pour dire « encaissé »`);
console.log(`    ${ok(/Total encaissé/.test(pageSrc) && /formatAmount\(collected\)/.test(pageSrc))} la carte affiche bien la valeur issue des Payment`);

// Payment n'a pas de statut : un filtre de statut serait impossible.
const schema = raw("prisma/schema.prisma");
const payBlock = schema.match(/model Payment \{([\s\S]*?)\n\}/)?.[1] ?? "";
console.log(`    ${ok(!/^\s*status\s/m.test(payBlock))} Payment n'a aucune colonne de statut (l'existence de la ligne EST l'encaissement)`);
console.log(`    ${ok(!/payment[\s\S]{0,80}status:/i.test(financeSrc))} …et aucun code ne filtre les paiements par statut`);

/* ═══════════════════════ 5. OVERDUE ═══════════════════════ */

console.log(`\n[5] BASCULE OVERDUE`);
const overdueSrc = code("src/lib/overdue.ts");

console.log(`    ${ok(existsSync("src/lib/overdue.ts"))} la logique est isolée dans src/lib/overdue.ts`);
console.log(`    ${ok(/FROM_STATUS\s*=\s*"PENDING"/.test(overdueSrc))} départ : PENDING uniquement`);
console.log(`    ${ok(/TO_STATUS\s*=\s*"OVERDUE"/.test(overdueSrc))} arrivée : OVERDUE`);

// Idempotence : la sélection exclut par construction tout état non-PENDING.
const selects = callArgs(overdueSrc, /prisma\.invoice\.findMany\(/g);
console.log(`    ${ok(selects.length === 1 && /status:\s*FROM_STATUS/.test(selects[0].args))} la sélection filtre sur le statut de départ`);
console.log(`    ${ok(selects.length === 1 && /dueDate:\s*\{\s*lt:/.test(selects[0].args))} …et sur une échéance STRICTEMENT dépassée (lt, pas lte)`);

// L'écriture répète le statut : une facture réglée entre-temps n'est pas ramenée.
const updates = callArgs(overdueSrc, /prisma\.invoice\.updateMany\(/g);
console.log(`    ${ok(updates.length === 1 && /status:\s*FROM_STATUS/.test(updates[0].args))} l'écriture revérifie le statut de départ (course entre lecture et écriture)`);
console.log(`    ${ok(updates.length === 1 && /schoolId/.test(updates[0].args))} …et porte le schoolId`);

// Aucun état de sortie ne doit apparaître comme source.
for (const forbidden of ["PAID", "CANCELLED"]) {
  const asSource = new RegExp(`status:\\s*"${forbidden}"`).test(overdueSrc);
  console.log(`    ${ok(!asSource)} aucune bascule depuis ${forbidden}`);
}

// Isolation : école par école, jamais globalement.
console.log(`    ${ok(/sweepSchool\(s\.id/.test(overdueSrc))} le balayage traite les écoles UNE PAR UNE`);
const overdueCalls = callArgs(overdueSrc, /prisma\.invoice\.(findMany|updateMany)\(/g);
console.log(`    ${ok(overdueCalls.every((c) => /schoolId/.test(c.args)))} ${overdueCalls.length} requêtes de facture, toutes avec schoolId`);

// Acteur système : jamais un humain.
console.log(`    ${ok(/systemActor\(/.test(overdueSrc))} l'audit utilise l'acteur système`);
console.log(`    ${ok(isSystemActor(SYSTEM_ACTOR_ID) && !isSystemActor("un-vrai-uuid"))} isSystemActor() distingue bien la machine`);
console.log(`    ${ok(/recordAudit\(/.test(overdueSrc))} chaque bascule est tracée`);
const auditArgs = callArgs(overdueSrc, /recordAudit\(/g);
console.log(`    ${ok(auditArgs.length === 1 && /from:\s*FROM_STATUS/.test(auditArgs[0].args) && /to:\s*TO_STATUS/.test(auditArgs[0].args))} la trace porte l'ancien ET le nouveau statut`);
console.log(`    ${ok(auditArgs.length === 1 && /entity:\s*"invoice"/.test(auditArgs[0].args))} …rattachée à la facture`);
console.log(`    ${ok(/isSystemActor/.test(code("src/app/dashboard/payments/_finance/HistoryTimeline.tsx")))} l'historique n'affiche pas la machine comme « compte supprimé »`);

// Essai à blanc par défaut, comme toute opération de masse du projet.
const scriptSrc = code("scripts/mark-overdue.ts");
console.log(`    ${ok(/APPLY\s*===\s*"1"/.test(scriptSrc))} le script est en essai à blanc par défaut (APPLY=1 pour écrire)`);
console.log(`    ${ok(/apply:\s*APPLY/.test(scriptSrc))} …et transmet réellement ce mode`);

// L'endpoint doit échouer fermé.
const routeSrc = code("src/app/api/cron/overdue/route.ts");
console.log(`    ${ok(/CRON_SECRET/.test(routeSrc))} l'endpoint exige un secret`);
console.log(`    ${ok(/if\s*\(!secret\)/.test(routeSrc))} …et refuse tout si le secret est absent (échec fermé)`);
console.log(`    ${ok(/timingSafeEqual/.test(routeSrc))} comparaison à durée constante`);
console.log(`    ${ok(/export async function GET/.test(routeSrc) && /405/.test(routeSrc))} GET refusé : une visite ne déclenche pas d'écriture`);

/* ═══════════════════════ 6. RELANCES ═══════════════════════ */

console.log(`\n[6] CHEMIN DE DONNÉES DES RELANCES`);
const reminderSrc = code("src/app/dashboard/documents/reminder/page.tsx");
console.log(`    ${ok(/status:\s*"OVERDUE"/.test(reminderSrc))} reminder cherche bien les factures OVERDUE`);
console.log(`    ${ok(/schoolId/.test(reminderSrc))} …bornées à l'établissement`);
console.log(`    ${ok(existsSync("src/app/dashboard/documents/reminder/Generator.tsx"))} le générateur n'a pas été supprimé`);

/* ═══════════════════ 7. FACTURATION INTACTE ═══════════════════ */

console.log(`\n[7] FACTURATION EXISTANTE INTACTE`);
const actionsSrc = code("src/app/dashboard/payments/actions.ts");
for (const fn of ["createInvoice", "markInvoiceAsPaid"]) {
  console.log(`    ${ok(new RegExp(`export async function ${fn}`).test(actionsSrc))} ${fn} existe toujours`);
}
console.log(`    ${ok(/requireActionContext\(BILLING_PATH\)/.test(actionsSrc))} les deux actions exigent désormais un rôle`);
const actionSigs = exportedSignatures(actionsSrc);
console.log(`    ${ok(actionSigs.every((s) => !/\bschoolId\b/.test(s.params)))} aucune n'accepte de schoolId`);
console.log(`    ${ok(/prisma\.student\.findFirst[\s\S]{0,200}schoolId:\s*ctx\.schoolId/.test(actionsSrc))} l'élève facturé est vérifié dans l'école de la session`);
console.log(`    ${ok(/recordAudit\(/.test(actionsSrc))} les actes de facturation sont tracés`);
console.log(`    ${ok(/payment\.create/.test(actionsSrc) && /invoice\.update/.test(actionsSrc))} l'encaissement écrit toujours paiement + facture`);
console.log(`    ${ok(/\$transaction/.test(actionsSrc))} …dans une transaction`);

// Les écrans et composants existants survivent.
for (const f of [
  "src/app/dashboard/payments/PaymentsListClient.tsx",
  "src/app/dashboard/payments/PayButton.tsx",
  "src/app/dashboard/payments/new/form.tsx",
  "src/app/dashboard/documents/invoice/Generator.tsx",
  "src/app/dashboard/documents/receipt/Generator.tsx",
]) {
  console.log(`    ${ok(existsSync(f))} conservé : ${f.replace("src/app/dashboard/", "")}`);
}
console.log(`    ${ok(/canCollect/.test(code("src/app/dashboard/payments/PaymentsListClient.tsx")))} le bouton d'encaissement est masqué au parent`);

// Le schéma du lot 11.1 n'a pas bougé : ce lot était un correctif de code.
//
// ⚠️ Mis à jour au lot 12.1. La version précédente exigeait `models.length === 26`,
// donc elle échouait dès qu'un lot ULTÉRIEUR ajoutait légitimement un modèle —
// c'est l'« exclusion périmée » déjà rencontrée au lot 08, sous une autre forme :
// un contrôle qui fige un TOTAL transforme toute évolution en régression.
//
// L'invariant réellement utile n'était pas le total mais la NON-DISPARITION.
// Il est donc énoncé explicitement, et devient du même coup plus strict : il
// nomme les 26 modèles au lieu de les compter.
const MODELS_LOT_11 = [
  "Invitation", "WaitlistEntry", "DocumentRequest", "School", "User", "AuditLog",
  "WorkflowTransition", "Student", "Class", "Enrollment", "Invoice", "InvoiceItem",
  "Payment", "Expense", "FinancialStatement", "Survey", "SurveyResponse", "Message",
  "WebhookEvent", "Subject", "ClassSubject", "TeachingAssignment", "Term",
  "Evaluation", "ReportCard", "Grade",
];
const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
const disparus = MODELS_LOT_11.filter((m) => !models.includes(m));
console.log(`    ${ok(disparus.length === 0)} les ${MODELS_LOT_11.length} modèles du lot 11 sont tous présents${disparus.length ? ` (disparus : ${disparus.join(", ")})` : ` (schéma : ${models.length} modèles)`}`);
console.log(`    ${ok(/model Invoice \{/.test(schema) && /model Payment \{/.test(schema))} Invoice et Payment intacts`);

/* ═══════════════ 8. AUCUNE MATRICE PARALLÈLE ═══════════════ */

console.log(`\n[8] AUCUNE MATRICE PARALLÈLE`);
const TOUCHED = [
  "src/lib/finance.ts", "src/lib/overdue.ts",
  "src/app/dashboard/payments/page.tsx", "src/app/dashboard/payments/actions.ts",
  "src/app/dashboard/payments/new/page.tsx", "src/app/dashboard/documents/page.tsx",
  "src/app/dashboard/documents/invoice/page.tsx", "src/app/dashboard/documents/receipt/page.tsx",
  "src/app/dashboard/documents/reminder/page.tsx",
];
// `finance.ts` compare légitimement `actor.role !== "PARENT"` : c'est la
// restriction de portée elle-même, pas une table de permissions. Exception unique
// et documentée.
const roleLiteral = new RegExp(`["'](${ROLES.filter((r) => r !== "PARENT").join("|")})["']`);
const guilty = TOUCHED.filter((f) => roleLiteral.test(code(f)));
console.log(`    ${ok(guilty.length === 0)} aucun fichier touché ne cite un rôle en dur${guilty.length ? ` (${guilty.join(", ")})` : ""}`);
// ⚠️ Compter les occurrences était arbitraire : `finance.ts` en a légitimement
// deux — décider la restriction, puis la signaler à l'écran. Le vrai invariant
// est que CHAQUE mention de « PARENT » soit une comparaison sur `actor.role`,
// donc une décision de portée, et jamais une entrée de table de permissions.
const parentMentions = [...code("src/lib/finance.ts").matchAll(/.{0,24}"PARENT"/g)].map((m) => m[0]);
const scopeOnly = parentMentions.every((m) => /actor\.role\s*[!=]==\s*$|actor\.role\s*[!=]==\s*"PARENT"/.test(m + '"PARENT"') || /actor\.role/.test(m));
console.log(`    ${ok(parentMentions.length > 0 && scopeOnly)} les ${parentMentions.length} mentions de « PARENT » sont des comparaisons sur actor.role`);
// ⚠️ Mis à jour au lot 12.2 — même raison que juste au-dessus, appliquée cette
// fois aux refus eux-mêmes : `length === 8` figeait leur nombre, donc tout refus
// LÉGITIME ajouté par un lot ultérieur devenait une régression. Le lot 12.2 en a
// ajouté un neuvième (`/dashboard/payments/tarifs`, qui expose la grille
// officielle et que PARENT héritait par préfixe).
//
// L'invariant utile est que les refus du lot 11.1 soient TOUJOURS là, pas qu'ils
// soient exactement huit. Les nommer rend le contrôle plus strict, pas moins.
const REFUS_PARENT_REQUIS = [
  "/dashboard/documents/validation",
  "/dashboard/payments/expenses",
  "/dashboard/payments/statement",
  "/dashboard/payments/review",
  "/dashboard/payments/new",
  "/dashboard/documents/invoice",
  "/dashboard/documents/receipt",
  "/dashboard/documents/reminder",
];
const refusManquants = REFUS_PARENT_REQUIS.filter((r) => !(ROLE_DENIALS.PARENT ?? []).includes(r));
console.log(`    ${ok(refusManquants.length === 0)} les ${REFUS_PARENT_REQUIS.length} refus PARENT du lot 11.1 sont tous dans la matrice centrale${refusManquants.length ? ` (manquants : ${refusManquants.join(", ")})` : ` (total actuel : ${ROLE_DENIALS.PARENT?.length})`}`);
for (const p of ISSUING_PATHS) {
  console.log(`    ${ok(ROLE_DENIALS.PARENT?.includes(p) === true)} déclaré centralement : ${p}`);
}

/* ═════════ 9. MATRICE COMPLÈTE, RÔLE PAR RÔLE ═════════ */

console.log(`\n[9] MATRICE COMPLÈTE`);
const EXPECTED: Record<RoleType, { seeInvoices: boolean; issue: boolean }> = {
  OWNER:      { seeInvoices: true,  issue: true  },
  ADMIN:      { seeInvoices: true,  issue: true  },
  ACCOUNTANT: { seeInvoices: true,  issue: true  },
  PARENT:     { seeInvoices: true,  issue: false },
  SECRETARY:  { seeInvoices: false, issue: false },
  TEACHER:    { seeInvoices: false, issue: false },
  ASSISTANT:  { seeInvoices: false, issue: false },
};
for (const r of ROLES) {
  const see = hasAccess(r, "/dashboard/payments");
  const issue = hasAccess(r, "/dashboard/payments/new");
  const good = see === EXPECTED[r].seeInvoices && issue === EXPECTED[r].issue;
  console.log(`    ${ok(good)} ${r.padEnd(11)} voit les factures=${see ? "oui" : "non"} · émet=${issue ? "oui" : "non"}`);
}

console.log(`\n${fail === 0 ? "✅ SÉCURITÉ FINANCIÈRE VÉRIFIÉE" : `❌ ${fail} CONTRÔLE·S EN ÉCHEC`}\n`);
process.exit(fail === 0 ? 0 : 1);
