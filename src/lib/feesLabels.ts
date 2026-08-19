import type { FeeKind, FeeCadence } from "../generated/prisma/client";

/**
 * Libellés du référentiel tarifaire — **module utilisable côté navigateur**.
 *
 * ⚠️ Extraits de `src/lib/fees.ts` au lot 13.1, pour la raison exposée dans
 * `src/lib/moneyFormat.ts` : `fees.ts` importe Prisma, et deux écrans clients
 * — la grille tarifaire et son réglage — répondaient HTTP 500 depuis le
 * lot 12.1 sans que `tsc` ni aucun vérificateur ne le signale.
 *
 * Seuls les libellés bougent. Aucun calcul de tarif, de prévision, de
 * facturation ou d'encaissement n'est touché : ils restent dans `fees.ts`.
 */
export const FEE_KIND_LABELS: Record<FeeKind, string> = {
  REGISTRATION: "Frais d'inscription",
  TUITION: "Scolarité",
  INSURANCE: "Assurance",
  CANTEEN: "Cantine",
  TRANSPORT: "Transport",
  EXAM: "Frais d'examen",
  OTHER: "Autres frais",
};

export const FEE_CADENCE_LABELS: Record<FeeCadence, string> = {
  ONE_OFF: "Une fois (inscription)",
  ANNUAL: "Annuel",
  TERM: "Par trimestre",
  MONTHLY: "Mensuel",
};

export function feeKindLabel(k: FeeKind | string): string {
  return FEE_KIND_LABELS[k as FeeKind] ?? String(k);
}
