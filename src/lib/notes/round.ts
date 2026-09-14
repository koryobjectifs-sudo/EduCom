/**
 * Arrondi à 2 décimales — LA seule fonction d'arrondi du socle de notes.
 *
 * ⚠️ Partagée entre élémentaire et secondaire (lot 18/2) : c'est un utilitaire
 * numérique, pas une règle pédagogique. Les DEUX moteurs de calcul restent
 * étanches l'un à l'autre — ils n'importent que celle-ci, rien d'autre.
 *
 * `Number.EPSILON` évite qu'un flottant comme 12.005 (stocké en mémoire comme
 * 12.004999999...) s'arrondisse à tort vers le bas.
 */
export function roundTo2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
