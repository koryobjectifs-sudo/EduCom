import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";

/**
 * Contexte commun aux générateurs de documents : l'utilisateur connecté et SON
 * école.
 *
 * Toute requête d'un générateur doit être filtrée par le `schoolId` renvoyé
 * ici. Sans ce filtre, `prisma.student.findMany()` ramène les élèves de tous
 * les établissements de la base — fuite entre locataires. Et
 * `prisma.school.findFirst()` sans `orderBy` ne garantit pas quelle école
 * remonte : un document pouvait sortir avec le nom, le cachet et la signature
 * d'un autre établissement.
 *
 * Mémoïsé par requête via React `cache()` pour éviter les allers-retours Supabase
 * et SQL redondants entre layouts et pages.
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
        return { user: dbUser, schoolId: testSchoolId, school };
      }
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  const school = await prisma.school.findUnique({ where: { id: dbUser.schoolId } });

  return { user: dbUser, schoolId: dbUser.schoolId, school };
});

export const requirePathAccess = cache(async function requirePathAccess(path: string) {
  const ctx = await requireSchoolContext();
  const role = ctx.user.role as RoleType;
  if (!hasAccess(role, path)) redirect(firstAllowedPath(role));
  return ctx;
});

