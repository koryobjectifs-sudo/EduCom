/**
 * Vérifie la logique pure de l'abonnement EduCom et la signature Wave.
 * Aucune base, aucun réseau :  npx tsx scripts/verify-subscription.ts
 */
import { createHmac } from "node:crypto";
import { calculerEtat, jalonDuJour, nouvelleFinDePeriode, GRACE_DAYS } from "../src/lib/subscription";
import { verifierSignatureWave } from "../src/lib/wave";

let echecs = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) echecs++;
};
const J = 86_400_000;
const t0 = new Date("2026-10-01T10:00:00Z");
const plus = (d: number) => new Date(t0.getTime() + d * J);

// États
const essai = { trialEndsAt: plus(7), currentPeriodEnd: null };
ok(calculerEtat(essai, t0).etat === "ESSAI", "essai en cours");
ok(calculerEtat(essai, t0).joursRestants === 7, "7 jours restants");
ok(calculerEtat(essai, plus(8)).etat === "EN_RETARD", "J+1 après l'essai : en retard (grâce)");
ok(calculerEtat(essai, plus(7 + GRACE_DAYS)).etat === "LECTURE_SEULE", "après la grâce : lecture seule");
const paye = { trialEndsAt: plus(7), currentPeriodEnd: plus(38) };
ok(calculerEtat(paye, plus(2)).etat === "ACTIF", "payé pendant l'essai : actif");
ok(calculerEtat(paye, plus(40)).etat === "LECTURE_SEULE", "période payée échue : lecture seule immédiate (sans grâce)");

// Prolongation sans perte de jours
const f1 = nouvelleFinDePeriode(essai, 1, plus(2));
ok(f1.debut.getTime() === plus(2).getTime(), "payer pendant l'essai : l'essai s'arrête et la période démarre au paiement");
const f2 = nouvelleFinDePeriode({ trialEndsAt: plus(7), currentPeriodEnd: plus(20) }, 1, plus(10));
ok(f2.debut.getTime() === plus(20).getTime(), "payer en avance : la période s'ajoute à la suite");
const f3 = nouvelleFinDePeriode({ trialEndsAt: plus(7), currentPeriodEnd: plus(20) }, 1, plus(30));
ok(f3.debut.getTime() === plus(30).getTime(), "payer en retard : la période démarre au paiement");

// Jalons
ok(jalonDuJour(calculerEtat(essai, plus(4))) === "J-3", "J-3");
ok(jalonDuJour(calculerEtat(essai, plus(6))) === "J-1", "J-1");
ok(jalonDuJour(calculerEtat(essai, plus(7.1))) === "J0", "J0 (jour de l'échéance)");
ok(jalonDuJour(calculerEtat(essai, plus(10.5))) === "G+3", "G+3");
ok(jalonDuJour(calculerEtat(essai, plus(20))) === "LS", "lecture seule");
ok(jalonDuJour(calculerEtat(essai, plus(1))) === null, "rien à J-6");

// Signature Wave
const secret = "wave_sn_WHS_test";
const corps = JSON.stringify({ type: "checkout.session.completed", data: { id: "cos-123" } });
const t = 1_790_000_000;
const sig = createHmac("sha256", secret).update(`${t}${corps}`).digest("hex");
ok(verifierSignatureWave(corps, `t=${t},v1=${sig}`, secret, t + 10) === null, "signature valide acceptée");
ok(verifierSignatureWave(corps + " ", `t=${t},v1=${sig}`, secret, t + 10) !== null, "corps modifié refusé");
ok(verifierSignatureWave(corps, `t=${t},v1=${sig}`, "autre", t + 10) !== null, "mauvais secret refusé");
ok(verifierSignatureWave(corps, `t=${t},v1=${sig}`, secret, t + 400) !== null, "horodatage > 5 min refusé");
ok(verifierSignatureWave(corps, null, secret, t) !== null, "en-tête absent refusé");
ok(verifierSignatureWave(corps, `t=${t},v1=zz,v1=${sig}`, secret, t + 1) === null, "plusieurs v1 : une bonne suffit");

console.log(echecs ? `\n${echecs} échec(s)` : "\nTout est bon.");
process.exit(echecs ? 1 : 0);
