/**
 * Outil de pilotage — règles pures (sans base).
 * npx tsx scripts/verify-pilotage.ts
 */
import { compterStatuts, revenus, signaux, statutEcole } from "../src/lib/calculs";
import { creerJeton, hacher, lireJeton, motDePasseValide, secret, verifier } from "../src/lib/session";
import { GRACE_DAYS, PRO_PRICE_EUR, EUR_TO_XOF_RATE, calculerEtat } from "../src/lib/abonnement";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let ko = 0;
let n = 0;
const ok = (nom: string, c: boolean, d?: unknown) => {
  n++;
  if (!c) {
    ko++;
    console.error("✗", nom, d ?? "");
  }
};
const J = 86_400_000;
const now = new Date("2026-09-27T10:00:00Z");
const d = (j: number) => new Date(now.getTime() + j * J);

// Statuts
ok("sans abonnement", statutEcole(null, now).statut === "INCONNU");
ok("essai en cours", statutEcole({ trialEndsAt: d(3), currentPeriodEnd: null }, now).statut === "ESSAI");
ok("payante", statutEcole({ trialEndsAt: d(-30), currentPeriodEnd: d(10) }, now).statut === "PAYANTE");
ok("payante échue : perdue immédiatement (sans grâce)", statutEcole({ trialEndsAt: d(-40), currentPeriodEnd: d(-3) }, now).statut === "PERDUE");
ok("perdue (a payé, lecture seule)", statutEcole({ trialEndsAt: d(-60), currentPeriodEnd: d(-20) }, now).statut === "PERDUE");
ok("non convertie (jamais payé)", statutEcole({ trialEndsAt: d(-20), currentPeriodEnd: null }, now).statut === "NON_CONVERTIE");
ok("essai terminé il y a 2 j = en retard, pas perdue", statutEcole({ trialEndsAt: d(-2), currentPeriodEnd: null }, now).statut === "EN_RETARD");

// Revenus
const c = compterStatuts(["PAYANTE", "PAYANTE", "PAYANTE", "EN_RETARD", "PERDUE", "ESSAI", "ESSAI", "NON_CONVERTIE", "INCONNU"]);
const r = revenus(c, 1000);
ok("MRR = payantes × prix", r.mrr === 3000, r);
ok("à récupérer", r.aRecuperer === 1000);
ok("perdu / mois", r.perduParMois === 1000);
ok("potentiel essais", r.potentielEssais === 2000);
ok("conversion = clients / sorties d'essai", Math.abs((r.tauxConversion ?? 0) - 5 / 6) < 1e-9, r.tauxConversion);
ok("churn = perdues / clients", Math.abs((r.tauxChurn ?? 0) - 1 / 5) < 1e-9, r.tauxChurn);
const vide = revenus(compterStatuts([]), 1000);
ok("aucune école : taux non définis", vide.tauxConversion === null && vide.tauxChurn === null && vide.mrr === 0);

// Signaux
const base = { statut: "PAYANTE" as const, joursRestants: 20, derniereActivite: d(-1), creeLe: d(-30), notes30j: 50, eleves: 100 };
ok("école saine : aucun signal", signaux(base, now).length === 0, signaux(base, now));
ok("inactive 9 j", signaux({ ...base, derniereActivite: d(-9) }, now).some((s) => s.includes("9 j")));
ok("aucune note ce mois", signaux({ ...base, notes30j: 0 }, now).includes("Aucune note ce mois"));
ok("aucun élève", signaux({ ...base, eleves: 0 }, now).includes("Aucun élève importé"));
ok("essai J-2", signaux({ ...base, statut: "ESSAI", joursRestants: 2 }, now).some((s) => s.startsWith("Essai")));
ok("nouvelle école (3 j) : pas de reproche « aucune note »", !signaux({ ...base, creeLe: d(-3), notes30j: 0 }, now).includes("Aucune note ce mois"));
ok("école perdue : pas de signal d'inactivité", signaux({ ...base, statut: "PERDUE", derniereActivite: d(-40) }, now).length === 0);

// Connexion (pure)
(async () => {
  const h = await hacher("un mot de passe long");
  ok("mot de passe : bon accepté", await verifier("un mot de passe long", h));
  ok("mot de passe : mauvais refusé", !(await verifier("un mot de passe lonG", h)));
  ok("hachage salé (2 hachages différents)", h !== (await hacher("un mot de passe long")));
  ok("hachage corrompu refusé", !(await verifier("x", "md5$abc")));
  ok("12 caractères minimum", motDePasseValide("court") !== null && motDePasseValide("douze-caract") === null);
  const cle = "cle-de-test";
  const j = creerJeton("compte-1", cle, 1_000);
  ok("jeton valide lu", lireJeton(j, cle, 2_000) === "compte-1");
  ok("jeton expiré refusé", lireJeton(j, cle, 1_000 + 13 * 3600 * 1000) === null);
  ok("jeton falsifié refusé", lireJeton(j.replace("compte-1", "compte-2"), cle, 2_000) === null);
  ok("autre clé refusée", lireJeton(j, "autre", 2_000) === null);
  ok("jeton vide refusé", lireJeton(undefined, cle) === null && lireJeton("n'importe quoi", cle) === null);
  ok("secret dérivé de DATABASE_URL", secret({ DATABASE_URL: "postgres://a" } as unknown as NodeJS.ProcessEnv).length === 64);
  ok("secret dédié prioritaire", secret({ DATABASE_URL: "postgres://a", PILOTAGE_SESSION_SECRET: "s" } as unknown as NodeJS.ProcessEnv) === "s");

  // Copie des règles d'abonnement : identique à EduCom
  const racine = join(__dirname, "..", "..", "src", "lib");
  const pricing = readFileSync(join(racine, "pricing.ts"), "utf8");
  const sub = readFileSync(join(racine, "subscription.ts"), "utf8");
  ok("prix identique à EduCom", pricing.includes("PRO_PRICE_EUR") && pricing.includes(`EUR_TO_XOF_RATE = ${EUR_TO_XOF_RATE};`));
  ok("délai de grâce identique à EduCom", sub.includes(`GRACE_DAYS = ${GRACE_DAYS};`));
  ok("calculerEtat : en retard puis lecture seule", calculerEtat({ trialEndsAt: d(-2), currentPeriodEnd: null }, now).etat === "EN_RETARD" && calculerEtat({ trialEndsAt: d(-8), currentPeriodEnd: null }, now).etat === "LECTURE_SEULE");

console.log(ko ? `✗ ${ko}/${n} échec(s)` : `✓ ${n}/${n} vérifications`);
process.exit(ko ? 1 : 0);
})();
