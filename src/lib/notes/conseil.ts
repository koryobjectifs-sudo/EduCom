/**
 * Règles métier du Bloc Conseil de Classe — lot 18/3C.
 *
 * ⚠️ Pur : pas de dépendance vers la base de données ni Next.js.
 * Partagé entre les Server Actions, les composants d'écran et les scripts de test.
 */

export type DistinctionType = "TABLEAU_HONNEUR" | "ENCOURAGEMENTS" | "FELICITATIONS";
export type SanctionType = "AVERTISSEMENT" | "BLAME";
export type DecisionOrientationType = "PASSAGE" | "REDOUBLEMENT" | "EXCLUSION";

export const DISTINCTION_LABELS: Record<DistinctionType, string> = {
  TABLEAU_HONNEUR: "Tableau d'honneur",
  ENCOURAGEMENTS: "Encouragements",
  FELICITATIONS: "Félicitations",
};

export const SANCTION_LABELS: Record<SanctionType, string> = {
  AVERTISSEMENT: "Avertissement",
  BLAME: "Blâme",
};

export const ORIENTATION_LABELS: Record<DecisionOrientationType, string> = {
  PASSAGE: "Passage",
  REDOUBLEMENT: "Redoublement",
  EXCLUSION: "Exclusion",
};

/**
 * Calcule la distinction proposée par le système selon la moyenne générale :
 *   ≥ 16 : Félicitations
 *   ≥ 14 : Encouragements
 *   ≥ 12 : Tableau d'honneur
 *   < 12 : null
 *
 * ⚠️ La proposition est purement indicative : le conseil de classe peut la
 * retenir, la modifier ou la retirer (ex. élève indiscipliné).
 */
export function proposerDistinction(mg: number | null): DistinctionType | null {
  if (mg === null || typeof mg !== "number" || isNaN(mg)) return null;
  if (mg >= 16) return "FELICITATIONS";
  if (mg >= 14) return "ENCOURAGEMENTS";
  if (mg >= 12) return "TABLEAU_HONNEUR";
  return null;
}

/**
 * Détermine si le trimestre considéré est le 3e trimestre (fin d'année).
 *
 * ⚠️ La décision d'orientation (passage, redoublement, exclusion) est
 * STRICTEMENT réservée au 3e trimestre. Aux trimestres 1 et 2, elle n'a
 * aucun sens pédagogique et le serveur refuse toute écriture.
 */
export function isTroisiemeTrimestre(
  term: { id?: string; name: string; startDate?: Date | null; createdAt?: Date },
  allTerms?: { id: string; name: string; startDate?: Date | null; createdAt?: Date }[],
): boolean {
  const norm = term.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  if (/\b3(?:e|eme)?\b/.test(norm) || norm.includes("troisieme") || norm.includes("3eme")) {
    return true;
  }

  if (allTerms && allTerms.length === 3) {
    const sorted = [...allTerms].sort((a, b) => {
      if (a.startDate && b.startDate) return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (a.createdAt && b.createdAt) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });
    return sorted[2]?.id === term.id;
  }

  return false;
}
