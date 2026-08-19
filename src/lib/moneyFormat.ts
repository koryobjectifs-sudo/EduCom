/**
 * Formatage monétaire — **module utilisable côté navigateur**.
 *
 * ⚠️ Extrait de `src/lib/finance.ts` au lot 13.1. `finance.ts` importe Prisma :
 * un composant `"use client"` qui y prenait `formatAmount` entraînait
 * Prisma → `pg` → `dns` dans le bundle navigateur, et la route ne compilait
 * plus (HTTP 500). Voir `src/lib/studentFileLabels.ts` pour le même défaut,
 * découvert le même jour sur le dossier élève.
 *
 * Le formatage n'a jamais eu besoin de la base : c'est une fonction pure.
 */
export function formatAmount(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}
