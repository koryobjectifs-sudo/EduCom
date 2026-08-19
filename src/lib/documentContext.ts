import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
 */
export async function requireSchoolContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  const school = await prisma.school.findUnique({ where: { id: dbUser.schoolId } });

  return { user: dbUser, schoolId: dbUser.schoolId, school };
}
