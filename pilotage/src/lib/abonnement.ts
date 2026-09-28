/**
 * Abonnement EduCom — COPIE des règles pures de `../src/lib/subscription.ts`
 * et `../src/lib/pricing.ts` (l'outil de pilotage est une application séparée).
 * ⚠️ Si EduCom change son tarif, son délai de grâce ou ses états, reporter ici.
 * `scripts/verify-pilotage.ts` compare ces valeurs à celles d'EduCom.
 */
export const PRO_PRICE_EUR = 23;
export const EUR_TO_XOF_RATE = 655.957;
export const PRO_PRICE_XOF = 14900;
export const GRACE_DAYS = 7;
const JOUR = 86_400_000;

export type EtatAbonnement = "ESSAI" | "ACTIF" | "EN_RETARD" | "LECTURE_SEULE";
type Dates = { trialEndsAt: Date; currentPeriodEnd: Date | null };

export function calculerEtat(sub: Dates, maintenant: Date = new Date()) {
  const paye = sub.currentPeriodEnd;
  const periodePayee = Boolean(paye && paye.getTime() > sub.trialEndsAt.getTime());
  const echeance = periodePayee ? paye! : sub.trialEndsAt;
  const grace = periodePayee ? 0 : GRACE_DAYS;
  const lectureSeuleLe = new Date(echeance.getTime() + grace * JOUR);
  const t = maintenant.getTime();
  let etat: EtatAbonnement;
  if (t < echeance.getTime()) etat = periodePayee ? "ACTIF" : "ESSAI";
  else if (grace > 0 && t < lectureSeuleLe.getTime()) etat = "EN_RETARD";
  else etat = "LECTURE_SEULE";
  return { etat, echeance, joursRestants: Math.ceil((echeance.getTime() - t) / JOUR), lectureSeuleLe, aDejaPaye: Boolean(paye), prixMensuelXof: PRO_PRICE_XOF };
}

/** Payer pendant l'essai démarre à maintenant ; prolonger un abonnement en cours s'ajoute à la suite. */
export function nouvelleFinDePeriode(sub: Dates, mois: number, maintenant = new Date()) {
  const aPeriodePayeeEnCours = Boolean(sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > maintenant.getTime());
  const debut = aPeriodePayeeEnCours ? new Date(sub.currentPeriodEnd!.getTime()) : new Date(maintenant.getTime());
  const fin = new Date(debut);
  fin.setMonth(fin.getMonth() + mois);
  return { debut, fin };
}
