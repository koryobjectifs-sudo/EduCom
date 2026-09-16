import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";

/**
 * Contexte commun aux pages et générateurs de documents : l'utilisateur connecté et SON école.
 *
 * SÉCURITÉ ABSOLUE :
 * - Bloque tout accès au dashboard si l'adresse e-mail de l'utilisateur n'est pas confirmée.
 */
export const requireSchoolContext = cache(async function requireSchoolContext() {
  if (process.env.NODE_ENV === "development") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const testSchoolId = cookieStore.get("dev_test_school_id")?.value;
    const testUserId = cookieStore.get("dev_test_user_id")?.value;
    
    if (testSchoolId && testUserId) {
      const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      const school = await prisma.school.findUnique({ where: { id: testSchoolId } });
      if (dbUser && school) {
        if (!dbUser.emailVerified) {
          redirect(`/verify-email?email=${encodeURIComponent(dbUser.email)}`);
        }
        return { user: dbUser, schoolId: testSchoolId, school };
      }
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  // Synchronisation automatique si confirmé dans Supabase Auth (ex: via Google OAuth ou lien de confirmation)
  if (!dbUser.emailVerified && user.email_confirmed_at) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { emailVerified: true },
    });
    dbUser = { ...dbUser, emailVerified: true };
  }

  // ⚠️ SÉCURITÉ : Redirection immédiate si e-mail non vérifié
  if (!dbUser.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(dbUser.email)}`);
  }

  const school = await prisma.school.findUnique({ where: { id: dbUser.schoolId } });

  return { user: dbUser, schoolId: dbUser.schoolId, school };
});

export const requirePathAccess = cache(async function requirePathAccess(path: string) {
  const ctx = await requireSchoolContext();
  const role = ctx.user.role as RoleType;
  if (!hasAccess(role, path)) redirect(firstAllowedPath(role));
  return ctx;
});
