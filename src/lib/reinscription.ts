/**
 * Logique métier pour la réinscription en masse et la promotion de niveau.
 *
 * ═══ RÈGLES DU CYCLE SÉNÉGALAIS ═══
 *
 * 1. Maternelle (Préscolaire) :
 *    - Petite Section (PS) -> Moyenne Section (MS)
 *    - Moyenne Section (MS) -> Grande Section (GS)
 *    - Grande Section (GS) -> CI (Passage Élémentaire)
 *
 * 2. Primaire (Élémentaire) :
 *    - CI -> CP
 *    - CP -> CE1
 *    - CE1 -> CE2
 *    - CE2 -> CM1
 *    - CM1 -> CM2
 *    - CM2 -> SORTIE (Fin de cycle / Entrée en 6ème)
 *
 * 3. Collège (Moyen) :
 *    - 6ème -> 5ème
 *    - 5ème -> 4ème
 *    - 4ème -> 3ème
 *    - 3ème -> SORTIE (Fin de cycle BFEM / Entrée en Seconde)
 *
 * 4. Lycée (Secondaire) :
 *    - Seconde (2nde) -> Première (1ère)
 *    - Première (1ère) -> Terminale (Tle)
 *    - Terminale -> SORTIE (Fin de cycle Baccalauréat)
 */

export const EXIT_DESTINATION = "__EXIT__";

export interface ClassPromotionRule {
  sourceClassId: string;
  sourceClassName: string;
  sourceCycle: string;
  targetClassId: string | typeof EXIT_DESTINATION;
  targetClassName: string;
  targetCycle: string;
  isExit: boolean;
  isNewClass: boolean;
}

export interface StudentPromotionChoice {
  studentId: string;
  firstName: string;
  lastName: string;
  matricule?: string | null;
  gender?: string | null;
  sourceClassId: string;
  sourceClassName: string;
  targetClassId: string | typeof EXIT_DESTINATION;
  targetClassName: string;
  isReenrolled: boolean;
  promotionType: "PROMOTION" | "REPEAT" | "SKIP" | "CUSTOM" | "EXIT";
}

/**
 * Calcule l'année scolaire suivante à partir d'une année donnée (ex: "2025-2026" -> "2026-2027").
 */
export function getNextAcademicYear(currentYear: string): string {
  const match = currentYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    const now = new Date().getFullYear();
    return `${now}-${now + 1}`;
  }
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  return `${start + 1}-${end + 1}`;
}

/**
 * Normalise un nom de classe pour la comparaison.
 */
export function normalizeClassName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Table de promotion standard du cycle sénégalais.
 */
export const PROMOTION_LADDER: {
  pattern: RegExp;
  nextName: string | typeof EXIT_DESTINATION;
  cycle: "PRESCOLAIRE" | "ELEMENTAIRE" | "MOYEN" | "SECONDAIRE" | "AUTRE";
}[] = [
  // Maternelle
  { pattern: /^(?:petite\s*section|ps)(?:\s+(.*))?$/i, nextName: "Moyenne Section", cycle: "PRESCOLAIRE" },
  { pattern: /^(?:moyenne\s*section|ms)(?:\s+(.*))?$/i, nextName: "Grande Section", cycle: "PRESCOLAIRE" },
  { pattern: /^(?:grande\s*section|gs)(?:\s+(.*))?$/i, nextName: "CI", cycle: "ELEMENTAIRE" },

  // Élémentaire
  { pattern: /^ci(?:\s+(.*))?$/i, nextName: "CP", cycle: "ELEMENTAIRE" },
  { pattern: /^cp(?:\s+(.*))?$/i, nextName: "CE1", cycle: "ELEMENTAIRE" },
  { pattern: /^ce1(?:\s+(.*))?$/i, nextName: "CE2", cycle: "ELEMENTAIRE" },
  { pattern: /^ce2(?:\s+(.*))?$/i, nextName: "CM1", cycle: "ELEMENTAIRE" },
  { pattern: /^cm1(?:\s+(.*))?$/i, nextName: "CM2", cycle: "ELEMENTAIRE" },
  { pattern: /^cm2(?:\s+(.*))?$/i, nextName: EXIT_DESTINATION, cycle: "ELEMENTAIRE" },

  // Collège
  { pattern: /^6(?:\s*(?:e|eme|ème))?(?:\s+(.*))?$/i, nextName: "5ème", cycle: "MOYEN" },
  { pattern: /^5(?:\s*(?:e|eme|ème))?(?:\s+(.*))?$/i, nextName: "4ème", cycle: "MOYEN" },
  { pattern: /^4(?:\s*(?:e|eme|ème))?(?:\s+(.*))?$/i, nextName: "3ème", cycle: "MOYEN" },
  { pattern: /^3(?:\s*(?:e|eme|ème))?(?:\s+(.*))?$/i, nextName: EXIT_DESTINATION, cycle: "MOYEN" },

  // Lycée
  { pattern: /^(?:seconde|2(?:\s*(?:nde|e|eme|ème))?)(?:\s+(.*))?$/i, nextName: "Première", cycle: "SECONDAIRE" },
  { pattern: /^(?:premiere|première|1(?:\s*(?:ere|ère|e|eme|ème))?)(?:\s+(.*))?$/i, nextName: "Terminale", cycle: "SECONDAIRE" },
  { pattern: /^(?:terminale|tle)(?:\s+(.*))?$/i, nextName: EXIT_DESTINATION, cycle: "SECONDAIRE" },
];

/**
 * Déduit le nom et le cycle de la classe de destination par défaut selon le nom de la classe source.
 */
export function predictNextClass(className: string, currentCycle: string): {
  targetName: string | typeof EXIT_DESTINATION;
  cycle: string;
  isExit: boolean;
} {
  // Conserve les suffixes de section (ex: "CP A" -> "CE1 A", "6ème 2" -> "5ème 2")
  for (const step of PROMOTION_LADDER) {
    const match = className.match(step.pattern);
    if (match) {
      if (step.nextName === EXIT_DESTINATION) {
        return { targetName: EXIT_DESTINATION, cycle: step.cycle, isExit: true };
      }
      const suffix = match[1] ? match[1].trim() : "";
      const targetName = suffix ? `${step.nextName} ${suffix}` : step.nextName;
      return { targetName, cycle: step.cycle, isExit: false };
    }
  }

  // Si non reconnu, proposition générique ou sortie
  return { targetName: EXIT_DESTINATION, cycle: currentCycle || "AUTRE", isExit: true };
}
