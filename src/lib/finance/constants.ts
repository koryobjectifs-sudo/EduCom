/**
 * Constantes et libellés financiers sûrs pour l'exécution côté client (browser) et serveur.
 * Ce fichier ne doit JAMAIS importer `prisma`, `pg` ou de code serveur.
 */

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money (Wave / Orange)",
  BANK_TRANSFER: "Virement",
  OTHER: "Autre",
};
