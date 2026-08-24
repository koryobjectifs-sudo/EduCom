/**
 * Configuration centrale des tarifs EduCom.
 *
 * Source de vérité unique pour les prix, les conversions et les variables
 * de la stratégie Freemium / Pro / On Demand.
 */

export const PRO_PRICE_EUR = 9;
export const EUR_TO_XOF_RATE = 655.957;
export const TRIAL_DAYS = 14;

/**
 * Convertit un montant EUR en Francs CFA (XOF) selon le taux fixe.
 * Arrondit à l'entier le plus proche et formate avec un séparateur de milliers (espace).
 */
export function formatFCFA(eurAmount: number): string {
  const cfa = Math.round(eurAmount * EUR_TO_XOF_RATE);
  // Intl.NumberFormat('fr-FR') utilise l'espace insécable pour les milliers.
  return new Intl.NumberFormat("fr-FR").format(cfa) + " F CFA";
}
