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
 * Ce helper renvoie le `schoolId` **de la session**, jamais celui des
 * arguments, et vérifie que le rôle de l'appelant couvre bien le chemin
 * concerné. Le contrôle de rôle réutilise `hasAccess()` : les permissions
 * restent définies à un seul endroit (`src/lib/permissions.ts`), et l'action
 * autorise exactement ce que la navigation autorise déjà — ni plus, ni moins.
 *
 * Le motif de référence est `src/app/dashboard/grades/actions.ts`, qui
 * authentifiait déjà correctement ; ce fichier ne fait que le factoriser pour
 * que les autres actions n'aient plus à le réécrire.
 *
 * Contrairement à `requireSchoolContext()` (qui redirige, et convient aux
 * pages), ce helper **renvoie une erreur** : une server action doit répondre
 * `{ error }` à son appelant plutôt que tenter une redirection.
 */

export type ActionContext = {
  userId: string;
  schoolId: string;
  role: RoleType;
};

export type ActionAuth =
  | { ok: true; ctx: ActionContext }
  | { ok: false; error: string };

/**
 * Authentifie l'appelant et résout son établissement.
 *
 * @param requiredPath Chemin dont l'accès est exigé (ex. `/dashboard/settings`).
 *   Si omis, seule l'authentification est vérifiée.
 */
export async function requireActionContext(requiredPath?: string): Promise<ActionAuth> {
  // Support Local Test Mode (Dev uniquement)
  if (process.env.NODE_ENV === "development") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const testSchoolId = cookieStore.get("dev_test_school_id")?.value;
    const testUserId = cookieStore.get("dev_test_user_id")?.value;
    
    if (testSchoolId && testUserId) {
      const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      if (dbUser && dbUser.schoolId === testSchoolId) {
        const role = dbUser.role as RoleType;
        if (requiredPath && !hasAccess(role, requiredPath)) {
          return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action (Dev Mode)." };
        }
        return { ok: true, ctx: { userId: dbUser.id, schoolId: testSchoolId, role } };
      }
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorisé — vous devez être connecté." };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, schoolId: true, role: true },
  });
  if (!dbUser) return { ok: false, error: "Utilisateur introuvable." };
  if (!dbUser.schoolId) return { ok: false, error: "Aucun établissement rattaché à ce compte." };

  const role = dbUser.role as RoleType;

  if (requiredPath && !hasAccess(role, requiredPath)) {
    return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action." };
  }

  return { ok: true, ctx: { userId: dbUser.id, schoolId: dbUser.schoolId, role } };
}
