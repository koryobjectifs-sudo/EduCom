/**
 * Formatage monétaire — **module utilisable côté navigateur**.
 *
 * Le formatage n'a jamais eu besoin de la base : c'est une fonction pure.
 */

const formatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatAmount(n: number): string {
  return `${formatter.format(n)} FCFA`;
}
