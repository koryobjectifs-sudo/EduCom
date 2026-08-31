/**
 * Vérifie qu'une campagne ne peut PAS se présenter comme partante — LOT 17.
 * LECTURE SEULE.
 *
 * Le défaut réparé : le parcours créait une campagne `SCHEDULED`/`PROCESSING` et
 * l'écran affichait « créée avec succès », alors qu'aucun message ne quittait
 * EduCom. Ce vérifieur existe pour que la promesse ne puisse pas revenir par
 * inadvertance — un `git revert`, un copier-coller, un nouvel écran.
 *
 * Cinq propriétés :
 *   1. DRAPEAU COHÉRENT   `CAMPAIGN_DISPATCH_AVAILABLE` ne peut être `true`
 *                         tant que rien n'appelle réellement le moteur d'envoi ;
 *   2. PERSISTANCE        la création n'écrit aucun statut qui promet un envoi ;
 *   3. LIBELLÉS           tout statut promettant devient neutre à l'écran ;
 *   4. AFFICHAGE BRUT     aucun écran ne rend `camp.status` tel quel ;
 *   5. VOCABULAIRE        aucun mot d'envoi dans le retour de création.
 *
 *   npm run script -- scripts/verify-campaign-honesty.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { CAMPAIGN_DISPATCH_AVAILABLE, campaignStateLabel } from "../src/lib/campaignDispatch";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));

const read = (p: string) => readFileSync(p, "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "generated" || e === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

console.log("── 1. DRAPEAU COHÉRENT AVEC LA RÉALITÉ ────────────────────────");
const actions = read("src/app/dashboard/communications/campaigns/new/actions.ts");
const cron = read("vercel.json");
const appelleMoteur = /^\s*await\s+workflowEngine\.processManualCampaign/m.test(actions);
const cronWorkflows = /processAutomatedWorkflows|\/api\/cron\/(workflows|campaigns)/.test(cron);
const envoiBranche = appelleMoteur || cronWorkflows;

console.log(`  ${ok(!CAMPAIGN_DISPATCH_AVAILABLE || envoiBranche)} le drapeau n'est \`true\` que si un envoi est réellement branché`);
console.log(`         appel direct au moteur : ${appelleMoteur} · tâche planifiée : ${cronWorkflows}`);
console.log(`         CAMPAIGN_DISPATCH_AVAILABLE = ${CAMPAIGN_DISPATCH_AVAILABLE}`);

console.log("\n── 2. PERSISTANCE ─────────────────────────────────────────────");
const PROMETTENT = ["SCHEDULED", "PROCESSING", "SENT", "COMPLETED"];
const statutEcrit = actions.match(/status:\s*CampaignStatus\.(\w+)/g) ?? [];
const ecritUnePromesse = statutEcrit.some((m) => PROMETTENT.some((p) => m.endsWith(p)));
console.log(`  ${ok(CAMPAIGN_DISPATCH_AVAILABLE || !ecritUnePromesse)} la création n'écrit aucun statut qui promet un envoi`);
console.log(`         statuts écrits : ${statutEcrit.join(", ") || "aucun"}`);

console.log("\n── 3. LIBELLÉS ────────────────────────────────────────────────");
for (const s of PROMETTENT) {
  const { label, hint } = campaignStateLabel(s);
  const neutre = !/planifi|envoy|en cours|transmis/i.test(label);
  const ditLaVerite = /non disponible|aucun message/i.test(hint);
  console.log(`  ${ok(CAMPAIGN_DISPATCH_AVAILABLE || (neutre && ditLaVerite))} ${s.padEnd(11)} → « ${label} » + précision explicite`);
}

console.log("\n── 4. AUCUN AFFICHAGE BRUT DU STATUT ──────────────────────────");
const bruts: string[] = [];
for (const f of walk("src")) {
  const src = read(f);
  // `{camp.status}` ou `{campaign.status}` rendus directement dans du JSX.
  if (/\{\s*(camp|campaign)\.status\s*\}/.test(src)) bruts.push(f);
}
console.log(`  ${ok(bruts.length === 0)} aucun écran ne rend le statut brut de la base`);
bruts.forEach((f) => console.log(`         ⚠️  ${f}`));

console.log("\n── 5. VOCABULAIRE DU RETOUR DE CRÉATION ───────────────────────");
const client = read("src/app/dashboard/communications/campaigns/new/ClientPage.tsx");
// ⚠️ Un mot d'envoi n'est pas interdit en soi : il est légitime dans la branche
// qui ne s'exécutera QUE le jour où l'envoi sera branché. Ce qu'on interdit,
// c'est un mot d'envoi NON GARDÉ par le drapeau. Chercher le mot seul ferait
// échouer un code correct et pousserait à supprimer la bonne branche.
const toasts = [...client.matchAll(/toast\.(?:success|error)\([\s\S]*?\);/g)];
const nonGardes = toasts.filter((m) => {
  if (!/(planifi\w*|envoy\w*|transmis\w*)/i.test(m[0])) return false;
  // Le drapeau doit apparaître dans les 400 caractères qui précèdent le toast.
  const avant = client.slice(Math.max(0, m.index! - 400), m.index!);
  return !avant.includes("CAMPAIGN_DISPATCH_AVAILABLE");
});
console.log(`  ${ok(CAMPAIGN_DISPATCH_AVAILABLE || nonGardes.length === 0)} aucun message de succès n'annonce un envoi sans être gardé par le drapeau`);
nonGardes.forEach((m) => console.log(`         ⚠️  ${m[0].split("\n")[0].trim()}`));
const ditNonDisponible = /non disponible|Aucun message n'a été envoyé/i.test(client);
console.log(`  ${ok(CAMPAIGN_DISPATCH_AVAILABLE || ditNonDisponible)} l'indisponibilité de l'envoi est dite explicitement`);

console.log(`\n${fail === 0 ? "✅ TOUT EST CONFORME" : `❌ ${fail} ÉCHEC(S)`}`);
process.exit(fail === 0 ? 0 : 1);
