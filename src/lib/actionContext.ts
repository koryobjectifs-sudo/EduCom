import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasAccess, RoleType } from "@/lib/permissions";

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
 * - Bloque toute action si l'adresse e-mail de l'utilisateur n'est pas confirmée.
 */

export type ActionContext = {
  userId: string;
  schoolId: string;
  role: RoleType;
  emailVerified: boolean;
  school?: { id: string; name: string; activeAcademicYear: string | null } | null;
};

export type ActionAuth =
  | { ok: true; ctx: ActionContext }
  | { ok: false; error: string };

export type ActionContextOptions = {
  allowUnverifiedEmail?: boolean;
};

/**
 * Authentifie l'appelant et résout son établissement.
 *
 * @param requiredPath Chemin dont l'accès est exigé (ex. `/dashboard/settings`).
 *   Si omis, seule l'authentification est vérifiée.
 * @param options Options d'autorisation (ex. allowUnverifiedEmail pour renvoi d'e-mail).
 */
export const requireActionContext = cache(async function requireActionContext(
  requiredPath?: string,
  options?: ActionContextOptions
): Promise<ActionAuth> {
  // Support Local Test Mode (Dev uniquement)
  if (process.env.NODE_ENV === "development") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const testSchoolId = cookieStore.get("dev_test_school_id")?.value;
    const testUserId = cookieStore.get("dev_test_user_id")?.value;
    
    if (testSchoolId && testUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: testUserId },
        include: { school: { select: { id: true, name: true, activeAcademicYear: true } } },
      });
      if (dbUser && dbUser.schoolId === testSchoolId) {
        const role = dbUser.role as RoleType;
        if (requiredPath && !hasAccess(role, requiredPath)) {
          return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action (Dev Mode)." };
        }
        if (!options?.allowUnverifiedEmail && !dbUser.emailVerified) {
          return { ok: false, error: "Confirmation d'e-mail requise. Veuillez vérifier votre boîte mail avant d'effectuer cette action." };
        }
        return {
          ok: true,
          ctx: {
            userId: dbUser.id,
            schoolId: testSchoolId,
            role,
            emailVerified: dbUser.emailVerified ?? false,
            school: dbUser.school,
          },
        };
      }
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorisé — vous devez être connecté." };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      schoolId: true,
      role: true,
      emailVerified: true,
      school: { select: { id: true, name: true, activeAcademicYear: true } },
    },
  });
  if (!dbUser) return { ok: false, error: "Utilisateur introuvable." };
  if (!dbUser.schoolId) return { ok: false, error: "Aucun établissement rattaché à ce compte." };

  // ⚠️ SÉCURITÉ : Blocage des actions serveurs si e-mail non vérifié
  if (!options?.allowUnverifiedEmail && !dbUser.emailVerified) {
    return { ok: false, error: "Confirmation d'e-mail requise. Veuillez vérifier votre boîte mail avant d'effectuer cette action." };
  }

  const role = dbUser.role as RoleType;

  if (requiredPath && !hasAccess(role, requiredPath)) {
    return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action." };
  }

  return {
    ok: true,
    ctx: {
      userId: dbUser.id,
      schoolId: dbUser.schoolId,
      role,
      emailVerified: dbUser.emailVerified ?? false,
      school: dbUser.school,
    },
  };
});
