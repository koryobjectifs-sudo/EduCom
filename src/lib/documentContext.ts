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

/**
 * **Le même contexte, mais la porte est fermée d'abord.**
 *
 * ═══ POURQUOI CE HELPER EXISTE — FUITE MESURÉE LE 22 AOÛT 2026 ═══
 *
 * `requireSchoolContext()` authentifie et résout l'école. Il ne vérifie **pas**
 * le rôle, et rien d'autre ne le faisait : le middleware ne contrôle que
 * l'authentification, et le layout du tableau de bord non plus. Chaque page
 * devait donc poser sa propre garde — **cinq générateurs l'avaient oubliée** :
 * `report-card`, `certificate`, `info-sheet`, `timetable`, `drafts`.
 *
 * Conséquence concrète, reproduite en sonde : un **parent** authentifié qui
 * tapait `/dashboard/documents/report-card` obtenait les bulletins de tous les
 * élèves de l'établissement — notes, moyennes, rangs, avis du conseil. Les cinq
 * écrans chargent l'école entière, par construction.
 *
 * ⚠️ **Refuser dans `ROLE_DENIALS` ne suffisait pas** : `hasAccess()` ne protège
 * que ce qui l'appelle. Il fallait les deux — le refus dans la table, et cette
 * garde sur le chemin. C'est la leçon déjà écrite pour les réglages
 * (« le masquage dans la sidebar ne suffit pas, une URL se tape à la main »),
 * appliquée cette fois avec un point d'entrée unique pour qu'on ne l'oublie plus.
 *
 * On renvoie vers `firstAllowedPath()` et non vers `/dashboard` : un `PARENT`
 * n'a pas accès à l'accueil, et l'y envoyer produirait une boucle de
 * redirection — piège déjà payé, documenté dans `permissions.ts`.
 */
export async function requirePathAccess(path: string) {
  const ctx = await requireSchoolContext();
  const role = ctx.user.role as RoleType;
  if (!hasAccess(role, path)) redirect(firstAllowedPath(role));
  return ctx;
}
