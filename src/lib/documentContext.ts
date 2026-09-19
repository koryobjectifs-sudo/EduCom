import { cache } from "react";
import { redirect } from "next/navigation";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { resolveSchoolContext } from "@/lib/schoolContext";

/**
 * Contexte commun aux pages et générateurs de documents : l'utilisateur connecté, son rôle actif et SON école.
 *
 * SÉCURITÉ ABSOLUE :
 * - Résolution multi-établissements avec vérification d'adhésion active (SchoolMembership).
 * - Repli automatique sur User.schoolId pour les comptes historiques.
 * - Bloque tout accès au dashboard si l'adresse e-mail de l'utilisateur n'est pas confirmée.
 */
export const requireSchoolContext = cache(async function requireSchoolContext() {
  const result = await resolveSchoolContext();
  if (!result.ok) {
    if (result.redirectUrl) {
      redirect(result.redirectUrl);
    }
    redirect("/login");
  }

  return result.context;
});

export const requirePathAccess = cache(async function requirePathAccess(path: string) {
  const ctx = await requireSchoolContext();
  const role = ctx.user.role as RoleType;
  if (!hasAccess(role, path)) redirect(firstAllowedPath(role));
  return ctx;
});
