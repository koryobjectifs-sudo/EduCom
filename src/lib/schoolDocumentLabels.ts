import type { SchoolDocStatus, DocAudience, DocScopeKind, EducationalCycle } from "../generated/prisma/client";

/**
 * Libellés du centre documentaire — **module utilisable côté navigateur**.
 *
 * ⚠️ Aucun import de base : la règle du lot 13.1, après trois écrans restés en
 * HTTP 500 parce qu'un composant client entraînait Prisma dans le bundle.
 */

export const DOC_STATUS_LABELS: Record<SchoolDocStatus, string> = {
  DRAFT: "Brouillon",
  REVIEW: "À valider",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const AUDIENCE_LABELS: Record<DocAudience, string> = {
  STAFF: "Personnel de l'établissement",
  FAMILIES: "Familles",
};

export const SCOPE_LABELS: Record<DocScopeKind, string> = {
  SCHOOL: "Tout l'établissement",
  CYCLE: "Un cycle",
  CLASS: "Une classe",
};

export const CYCLE_LABELS: Record<EducationalCycle, string> = {
  MATERNELLE: "Maternelle",
  ELEMENTAIRE: "Élémentaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  AUTRE: "Autre",
};

/**
 * Formats dont l'aperçu est réellement possible dans un navigateur.
 *
 * ⚠️ Liste **fermée et honnête** : afficher un cadre d'aperçu pour un format que
 * le navigateur ne sait pas rendre donnerait un rectangle vide, que
 * l'utilisateur prendrait pour un document corrompu. Hors de cette liste,
 * l'écran dit « aperçu indisponible » et propose le téléchargement.
 */
export const PREVIEWABLE = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export function canPreview(mimeType: string): boolean {
  return (PREVIEWABLE as readonly string[]).includes(mimeType);
}

export function previewKind(mimeType: string): "pdf" | "image" | null {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/") && canPreview(mimeType)) return "image";
  return null;
}
