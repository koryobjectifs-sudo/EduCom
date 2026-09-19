"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Action serveur de bascule de rôle à chaud (DÉVELOPPEMENT UNIQUEMENT).
 * À retirer avant déploiement en production.
 */
export async function changeTestRole(newRole: string) {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "Action de test non autorisée en production" };
  }

  let normalizedRole = newRole.toUpperCase().trim();
  if (normalizedRole === "COMPTABLE") normalizedRole = "ACCOUNTANT";
  if (normalizedRole === "DIRECTION") normalizedRole = "ADMIN";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non connecté" };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  const cookieStore = await cookies();

  // 1. Gestion des cookies de simulation pour identifier un admin en mode test
  if (normalizedRole === "PARENT") {
    cookieStore.set("educom_dev_simulated_role", "PARENT", { path: "/" });
    if (dbUser && dbUser.role !== "PARENT") {
      cookieStore.set("educom_dev_original_role", dbUser.role, { path: "/" });
    }
  } else {
    cookieStore.delete("educom_dev_simulated_role");
    cookieStore.delete("educom_dev_original_role");
  }

  // 2. Mettre à jour l'utilisateur en base
  await prisma.user.update({
    where: { id: user.id },
    data: { role: normalizedRole as any },
  });

  // 3. Mettre à jour l'adhésion active (SchoolMembership) pour aligner resolveSchoolContext
  const memberships = await prisma.schoolMembership.findMany({
    where: { userId: user.id, active: true },
  });
  if (memberships.length > 0) {
    const primary = memberships.find((m) => m.isPrimary) || memberships[0];
    const sameRoleMembership = memberships.find(
      (m) => m.schoolId === primary.schoolId && m.role === (normalizedRole as any)
    );
    if (sameRoleMembership) {
      await prisma.schoolMembership.update({
        where: { id: sameRoleMembership.id },
        data: { isPrimary: true },
      });
      if (sameRoleMembership.id !== primary.id) {
        await prisma.schoolMembership.update({
          where: { id: primary.id },
          data: { isPrimary: false },
        });
      }
    } else {
      await prisma.schoolMembership.update({
        where: { id: primary.id },
        data: { role: normalizedRole as any },
      });
    }

    // 4. En mode ENSEIGNANT : simuler un enseignant RÉEL de l'école avec ses affectations
    if (normalizedRole === "TEACHER") {
      const realTeacher = await prisma.user.findFirst({
        where: {
          schoolId: primary.schoolId,
          role: "TEACHER",
          id: { not: user.id },
          OR: [
            { assignments: { some: {} } },
            { classesTaught: { some: {} } },
          ],
        },
        include: {
          assignments: true,
          classesTaught: true,
        },
      });

      if (realTeacher) {
        // Cloner les classes titulaires (élémentaire / maître unique)
        for (const c of realTeacher.classesTaught) {
          const existing = await prisma.teachingAssignment.findFirst({
            where: { teacherId: user.id, classId: c.id, subjectId: null },
          });
          if (!existing) {
            await prisma.teachingAssignment.create({
              data: {
                teacherId: user.id,
                classId: c.id,
                schoolId: primary.schoolId,
                subjectId: null,
              },
            });
          }
        }

        // Cloner les affectations spécifiques (secondaire / matières)
        for (const a of realTeacher.assignments) {
          const existing = await prisma.teachingAssignment.findFirst({
            where: { teacherId: user.id, classId: a.classId, subjectId: a.subjectId },
          });
          if (!existing) {
            await prisma.teachingAssignment.create({
              data: {
                teacherId: user.id,
                classId: a.classId,
                schoolId: primary.schoolId,
                subjectId: a.subjectId,
              },
            });
          }
        }
      }
    }
  }

  const { firstAllowedPath } = await import("@/lib/permissions");
  const targetPath = normalizedRole === "PARENT" ? "/famille" : firstAllowedPath(normalizedRole as any) || "/dashboard";

  return { success: true, targetPath };
}
