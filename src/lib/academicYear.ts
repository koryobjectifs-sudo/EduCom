/**
 * Gestion de l'année scolaire active dans EduCom.
 *
 * ═══ RÈGLE FONDAMENTALE DU PRODUIT ═══
 *
 * L'année active est une DONNÉE DÉCLARÉE PAR L'ÉCOLE (`School.activeAcademicYear`),
 * JAMAIS une date système calculée au vol.
 *
 * Chaque école peut avoir un calendrier personnalisé (ex: rentrée le 5 octobre) ou
 * rester sur la session précédente pendant ses opérations de clôture et réinscriptions.
 *
 * La date système (`defaultAcademicYear`) ne sert que de suggestion par défaut à la
 * création initiale d'un établissement, jamais pour décider en cours de route.
 */

export interface SchoolWithAcademicYear {
  activeAcademicYear?: string | null;
}

/**
 * Année scolaire suggérée à la création selon la date courante.
 * Rentrée sénégalaise en septembre/octobre : avant septembre, session N-1/N.
 */
export function defaultAcademicYear(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  return ref.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/**
 * Résout l'année scolaire active pour un établissement.
 *
 * Priorité absolue : `school.activeAcademicYear` déclarée par l'école.
 * Repli : `defaultAcademicYear()` si non renseignée.
 */
export function currentAcademicYear(school?: SchoolWithAcademicYear | string | null): string {
  if (typeof school === "string" && school.trim()) {
    return school.trim();
  }
  if (school && typeof school === "object" && school.activeAcademicYear) {
    return school.activeAcademicYear;
  }
  return defaultAcademicYear();
}
