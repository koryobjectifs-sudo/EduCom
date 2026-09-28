/**
 * Configuration centrale des tarifs EduCom.
 *
 * Source de vérité unique pour les prix, les conversions et les variables
 * de la stratégie Freemium / Pro / On Demand.
 */

export const EUR_TO_XOF_RATE = 655.957;
export const TRIAL_DAYS = 7;

/** Tarifs Plan Standard : 9 900 F CFA (~15 €) par mois */
export const STANDARD_PRICE_XOF = 9900;
export const STANDARD_PRICE_EUR = 15;

/** Tarifs Plan Premium (Recommandé) : 14 900 F CFA (~23 €) par mois */
export const PREMIUM_PRICE_XOF = 14900;
export const PREMIUM_PRICE_EUR = 23;

/** Compatibilité rétroactive (pointe sur Premium par défaut) */
export const PRO_PRICE_EUR = PREMIUM_PRICE_EUR;
export const PRO_PRICE_XOF = PREMIUM_PRICE_XOF;

/**
 * Convertit un montant EUR en Francs CFA (XOF) selon le taux fixe.
 * Arrondit à l'entier le plus proche et formate avec un séparateur de milliers (espace).
 */
export function formatFCFA(eurAmount: number): string {
  const cfa = Math.round(eurAmount * EUR_TO_XOF_RATE);
  return new Intl.NumberFormat("fr-FR").format(cfa) + " F CFA";
}

/** Formate directement un montant en F CFA avec séparateur de milliers. */
export function formatMontantCFA(cfaAmount: number): string {
  return new Intl.NumberFormat("fr-FR").format(cfaAmount) + " F CFA";
}

export type OptionDuree = {
  mois: number;
  libelle: string;
  reductionPct: number;
  badge?: string;
  recommande?: boolean;
};

/** Options de durée avec réductions dégressives incitatives */
export const DUREES_ABONNEMENT: OptionDuree[] = [
  { mois: 1, libelle: "1 mois", reductionPct: 0 },
  { mois: 3, libelle: "3 mois", reductionPct: 10, badge: "-10%" },
  { mois: 6, libelle: "6 mois", reductionPct: 15, badge: "-15%" },
  { mois: 12, libelle: "12 mois (1 an)", reductionPct: 20, badge: "-20%", recommande: true },
];

/**
 * Calcule le montant total, la remise et le prix mensuel équivalent pour une durée donnée.
 * Les montants sont arrondis à la centaine de F CFA la plus proche pour des prix nets.
 */
export function calculerTarifAbonnement(prixMensuel: number, mois: number) {
  const option = DUREES_ABONNEMENT.find((o) => o.mois === mois);
  const reductionPct = option?.reductionPct ?? 0;
  const prixBase = prixMensuel * mois;
  const remise = Math.round((prixBase * (reductionPct / 100)) / 100) * 100;
  const total = prixBase - remise;
  return {
    mois,
    prixBase,
    remise,
    total,
    reductionPct,
    prixParMoisEquivalent: Math.round(total / mois),
  };
}
