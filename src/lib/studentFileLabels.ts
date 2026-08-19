import type { DocCategory, StudentKind } from "../generated/prisma/client";

/**
 * Libellés et formats du dossier élève — **module utilisable côté navigateur**.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (lot 13.1) ═══
 *
 * Ces quatre helpers vivaient dans `src/lib/studentFile.ts`, qui importe Prisma.
 * `DossierClient.tsx` et `RequirementsClient.tsx` sont des composants `"use
 * client"` : en important ces libellés, ils entraînaient dans le bundle
 * navigateur `@/lib/prisma` → `pg` → `dns`, un module Node qui n'existe pas dans
 * un navigateur. La compilation du bundle client échouait, la route ne produisait
 * jamais son manifeste, et l'écran répondait **HTTP 500**.
 *
 * ⚠️ **Ni `tsc --noEmit` ni aucun vérificateur ne voyait ce défaut** : le code
 * est parfaitement typé, et la frontière client/serveur ne se vérifie qu'à la
 * compilation du bundle, c'est-à-dire au rendu. C'est exactement la leçon du
 * lot 08 — « neuf scripts verts ne valent pas un rendu » — reproduite à
 * l'identique, et c'est la sonde HTTP du lot 13.1 qui l'a mise au jour.
 *
 * ⚠️ **Règle à retenir** : un composant `"use client"` ne doit importer que des
 * modules sans accès base. Les seuls imports admis depuis un fichier qui touche
 * Prisma sont les imports `import type`, effacés à la compilation.
 */

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  IDENTITE: "Identité",
  INSCRIPTION: "Inscription",
  SCOLARITE: "Scolarité",
  SANTE: "Santé",
  TRANSFERT: "Transfert",
  EXAMENS: "Examens",
  AUTRES: "Autres",
};

export const STUDENT_KIND_LABELS: Record<StudentKind, string> = {
  NOUVEAU: "Nouvel élève",
  ANCIEN: "Ancien élève",
  TRANSFERT: "Élève transféré",
};

export function categoryLabel(c: DocCategory | string): string {
  return DOC_CATEGORY_LABELS[c as DocCategory] ?? String(c);
}

/** Taille lisible — les tailles brutes en octets ne disent rien à personne. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}
