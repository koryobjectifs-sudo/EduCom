import { cache } from "react";
import { hasAccess, RoleType } from "@/lib/permissions";
import { resolveSchoolContext, ActiveMembershipInfo } from "@/lib/schoolContext";

/**
 * Contexte d'autorisation commun aux server actions.
 *
 * Une server action est un point d'entrée HTTP à part entière : elle est
 * appelable directement, sans passer par l'écran qui l'invoque normalement.
 * Tout ce qu'elle reçoit en argument vient donc du client et ne peut jamais
 * être considéré comme fiable — en particulier un `schoolId`, qui déterminerait
 * alors *quel établissement* la requête écrit.
 *
 * SÉCURITÉ ABSOLUE :
 * - Résolution contextuelle multi-écoles (SchoolMembership).
 * - Bloque toute action si l'adresse e-mail de l'utilisateur n'est pas confirmée.
 */

export type ActionContext = {
  userId: string;
  schoolId: string;
  role: RoleType;
  emailVerified: boolean;
  school?: { id: string; name: string; activeAcademicYear: string | null } | null;
  memberships?: ActiveMembershipInfo[];
  activeMembership?: ActiveMembershipInfo | null;
  isFallback?: boolean;
};

export type ActionAuth =
  | { ok: true; ctx: ActionContext }
  | { ok: false; error: string };

export type ActionContextOptions = {
  allowUnverifiedEmail?: boolean;
};

/**
 * Authentifie l'appelant et résout son établissement actif selon ses droits vérifiés.
 *
 * @param requiredPath Chemin dont l'accès est exigé (ex. `/dashboard/settings`).
 *   Si omis, seule l'authentification et l'adhésion active sont vérifiées.
 * @param options Options d'autorisation (ex. allowUnverifiedEmail pour renvoi d'e-mail).
 */
export const requireActionContext = cache(async function requireActionContext(
  requiredPath?: string,
  options?: ActionContextOptions
): Promise<ActionAuth> {
  const result = await resolveSchoolContext({
    allowUnverifiedEmail: options?.allowUnverifiedEmail,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const { context } = result;
  const role = context.role;

  if (requiredPath && !hasAccess(role, requiredPath)) {
    return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action." };
  }

  return {
    ok: true,
    ctx: {
      userId: context.user.id,
      schoolId: context.schoolId,
      role,
      emailVerified: context.user.emailVerified ?? false,
      school: context.school,
      memberships: context.memberships,
      activeMembership: context.activeMembership,
      isFallback: context.isFallback,
    },
  };
});

