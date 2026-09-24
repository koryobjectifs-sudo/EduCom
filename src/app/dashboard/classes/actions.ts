"use server";

import { requireActionContext } from "@/lib/actionContext";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { attachCurriculumSubjectsToClass } from "@/lib/notes/class-subjects";
import { deduceCycleAndSerie } from "@/app/dashboard/students/import/utils";

function normalizeOrDeduceCycle(rawCycle: string | null | undefined, className: string): any {
  let c = (rawCycle || "").trim().toUpperCase();
  if (c === "MATERNELLE") c = "PRESCOLAIRE";
  if (c === "COLLEGE") c = "MOYEN";
  if (c === "LYCEE") c = "SECONDAIRE";
  if (c === "PRESCOLAIRE" || c === "ELEMENTAIRE" || c === "MOYEN" || c === "SECONDAIRE") {
    return c;
  }
  const deduced = deduceCycleAndSerie(className);
  return deduced.cycle;
}

export async function createClass(formData: FormData) {
  // 23 sept. 2026 — aucune garde de rôle : un PARENT ou un enseignant pouvait
  // créer, renommer ou supprimer des classes en appel direct.
  const guard = await requireActionContext("/dashboard/classes");
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ 
    where: { id: user.id },
    include: { school: true }
  });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const name = formData.get("name") as string;
  const teacherId = formData.get("teacherId") as string;
  const rawCycle = formData.get("cycle") as string;

  if (!name) {
    return { error: "Le nom de la classe est requis." };
  }

  const cycle = normalizeOrDeduceCycle(rawCycle, name);
  const serie = formData.get("serie") as string | null;

  let createdId: string | null = null;
  try {
    const created = await prisma.class.create({
      data: {
        name,
        cycle: cycle,
        serie: serie || null,
        schoolId: dbUser.schoolId,
        teacherId: teacherId || null,
        academicYear: dbUser.school.activeAcademicYear,
      }
    });
    createdId = created.id;
    await attachCurriculumSubjectsToClass(created.id);
  } catch (error) {
    console.error("Error creating class:", error);
    return { error: "Erreur lors de la création de la classe." };
  }

  revalidatePath("/dashboard/classes");
  redirect(`/dashboard/classes/${createdId}`);
}

export async function createClassInline(formData: FormData) {
  // 23 sept. 2026 — aucune garde de rôle : un PARENT ou un enseignant pouvait
  // créer, renommer ou supprimer des classes en appel direct.
  const guard = await requireActionContext("/dashboard/classes");
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ 
    where: { id: user.id },
    include: { school: true }
  });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const name = formData.get("name") as string;
  const teacherId = formData.get("teacherId") as string;
  const rawCycle = formData.get("cycle") as string;

  if (!name) {
    return { error: "Le nom de la classe est requis." };
  }

  const cycle = normalizeOrDeduceCycle(rawCycle, name);
  const serie = formData.get("serie") as string | null;

  try {
    const created = await prisma.class.create({
      data: {
        name,
        cycle,
        serie: serie || null,
        schoolId: dbUser.schoolId,
        teacherId: teacherId || null,
        academicYear: dbUser.school.activeAcademicYear,
      }
    });
    await attachCurriculumSubjectsToClass(created.id);
  } catch (error) {
    console.error("Error creating class:", error);
    return { error: "Erreur lors de la création de la classe." };
  }

  revalidatePath("/dashboard/classes");
  return { success: true };
}

export async function updateClass(id: string, formData: FormData) {
  // 23 sept. 2026 — aucune garde de rôle : un PARENT ou un enseignant pouvait
  // créer, renommer ou supprimer des classes en appel direct.
  const guard = await requireActionContext("/dashboard/classes");
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const name = formData.get("name") as string;
  const teacherId = formData.get("teacherId") as string;
  const rawCycle = formData.get("cycle") as string;

  if (!name) {
    return { error: "Le nom de la classe est requis." };
  }

  const cycle = normalizeOrDeduceCycle(rawCycle, name);

  try {
    await prisma.class.update({
      where: {
        id,
        schoolId: dbUser.schoolId
      },
      data: {
        name,
        cycle,
        teacherId: teacherId || null,
      }
    });
  } catch (error) {
    console.error("Error updating class:", error);
    return { error: "Erreur lors de la mise à jour." };
  }

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${id}`);
  return { success: true };
}

export async function assignTeacherDirectly(
  classId: string,
  teacherId: string | null,
  teachSubjectId?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };
  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Seule la direction peut désigner le professeur principal." };
  }

  try {
    // 1. Mettre à jour le titulaire / professeur principal
    await prisma.class.update({
      where: {
        id: classId,
        schoolId: dbUser.schoolId,
      },
      data: {
        teacherId: teacherId || null,
      },
    });

    // 2. Si un professeur principal est désigné et qu'une matière d'enseignement est fournie
    if (teacherId && teachSubjectId) {
      const existingAssign = await prisma.teachingAssignment.findFirst({
        where: {
          classId,
          subjectId: teachSubjectId,
        },
      });

      if (existingAssign) {
        await prisma.teachingAssignment.update({
          where: { id: existingAssign.id },
          data: { teacherId },
        });
      } else {
        await prisma.teachingAssignment.create({
          data: {
            classId,
            teacherId,
            subjectId: teachSubjectId,
            schoolId: dbUser.schoolId,
          },
        });
      }
    }

    // 3. Détection de charge extrême (> 8 classes)
    let warning: string | null = null;
    if (teacherId) {
      const teacherAssignments = await prisma.teachingAssignment.findMany({
        where: { teacherId, schoolId: dbUser.schoolId },
        select: { classId: true },
      });
      const distinctClasses = new Set(teacherAssignments.map((a) => a.classId));
      distinctClasses.add(classId);

      if (distinctClasses.size > 8) {
        warning = `Attention : cet enseignant est affecté à ${distinctClasses.size} classes (> 8). Vérifiez s'il ne s'agit pas d'une erreur de saisie.`;
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/classes");
    revalidatePath(`/dashboard/classes/${classId}`);
    revalidatePath("/dashboard/settings/pedagogie");
    return { success: true, warning };
  } catch (error) {
    console.error("Error assigning teacher to class:", error);
    return { error: "Erreur lors de l'affectation de l'enseignant." };
  }
}

/**
 * Affecte ou retire un enseignant pour une matière précise d'une classe.
 */
export async function assignSubjectTeacher(
  classId: string,
  subjectId: string,
  teacherId: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };
  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Seule la direction peut modifier les affectations." };
  }

  try {
    if (!teacherId) {
      // Retirer l'affectation sur cette matière
      await prisma.teachingAssignment.deleteMany({
        where: {
          classId,
          subjectId,
          schoolId: dbUser.schoolId,
        },
      });
      revalidatePath(`/dashboard/classes/${classId}`);
      revalidatePath("/dashboard/classes");
      return { success: true };
    }

    // Remplacer ou créer l'affectation
    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        classId,
        subjectId,
      },
    });

    if (existing) {
      await prisma.teachingAssignment.update({
        where: { id: existing.id },
        data: { teacherId },
      });
    } else {
      await prisma.teachingAssignment.create({
        data: {
          classId,
          subjectId,
          teacherId,
          schoolId: dbUser.schoolId,
        },
      });
    }

    // Vérifier si charge extrême (> 8 classes)
    let warning: string | null = null;
    const teacherAssignments = await prisma.teachingAssignment.findMany({
      where: { teacherId, schoolId: dbUser.schoolId },
      select: { classId: true },
    });
    const distinctClasses = new Set(teacherAssignments.map((a) => a.classId));
    if (distinctClasses.size > 8) {
      warning = `Attention : cet enseignant est affecté à ${distinctClasses.size} classes (> 8). Vérifiez s'il ne s'agit pas d'une erreur de saisie.`;
    }

    revalidatePath(`/dashboard/classes/${classId}`);
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/settings/pedagogie");
    return { success: true, warning };
  } catch (error: any) {
    console.error("Error in assignSubjectTeacher:", error);
    return { error: error.message || "Erreur lors de l'affectation de la matière." };
  }
}

/**
 * Affectation en masse depuis la fiche / vue enseignant :
 * Permet d'affecter un enseignant à plusieurs classes pour une matière en une seule opération.
 */
export async function assignTeacherBulk(
  teacherId: string,
  subjectId: string | null,
  targetClassIds: string[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };
  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Seule la direction peut effectuer des affectations en masse." };
  }

  try {
    // 1. Vérifier que l'enseignant appartient à l'école
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, schoolId: dbUser.schoolId },
    });
    if (!teacher) return { error: "Enseignant introuvable dans cet établissement." };

    // 2. Pour chaque classe ciblée, remplacer ou ajouter l'affectation
    for (const classId of targetClassIds) {
      // Si subjectId est précisé, remplacer l'affectation existante sur ce sujet
      if (subjectId) {
        const existing = await prisma.teachingAssignment.findFirst({
          where: { classId, subjectId },
        });
        if (existing) {
          await prisma.teachingAssignment.update({
            where: { id: existing.id },
            data: { teacherId },
          });
        } else {
          await prisma.teachingAssignment.create({
            data: {
              classId,
              subjectId,
              teacherId,
              schoolId: dbUser.schoolId,
            },
          });
        }
      } else {
        // Maître unique / toutes matières
        const existingAll = await prisma.teachingAssignment.findFirst({
          where: { classId, teacherId, subjectId: null },
        });
        if (!existingAll) {
          await prisma.teachingAssignment.create({
            data: {
              classId,
              subjectId: null,
              teacherId,
              schoolId: dbUser.schoolId,
            },
          });
        }
      }
    }

    // 3. Détection de charge extrême (> 8 classes)
    const teacherAssignments = await prisma.teachingAssignment.findMany({
      where: { teacherId, schoolId: dbUser.schoolId },
      select: { classId: true },
    });
    const distinctClasses = new Set(teacherAssignments.map((a) => a.classId));
    let warning: string | null = null;
    if (distinctClasses.size > 8) {
      warning = `Attention : cet enseignant est désormais affecté à ${distinctClasses.size} classes (> 8). Vérifiez s'il ne s'agit pas d'une erreur de saisie.`;
    }

    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/settings/pedagogie");
    return { success: true, count: targetClassIds.length, warning };
  } catch (error: any) {
    console.error("Error in assignTeacherBulk:", error);
    return { error: error.message || "Erreur lors de l'affectation en masse." };
  }
}

export async function deleteClass(id: string) {
  // 23 sept. 2026 — aucune garde de rôle : un PARENT ou un enseignant pouvait
  // créer, renommer ou supprimer des classes en appel direct.
  const guard = await requireActionContext("/dashboard/classes");
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    const studentCount = await prisma.enrollment.count({
      where: {
        classId: id,
        student: { schoolId: dbUser.schoolId }
      }
    });

    if (studentCount > 0) {
      return { 
        error: `Cette classe contient encore ${studentCount} élève(s). Pour supprimer cette classe, vous devez d'abord retirer ou réaffecter tous les élèves qui lui sont associés.` 
      };
    }

    await prisma.class.delete({
      where: { 
        id,
        schoolId: dbUser.schoolId
      }
    });
    
    revalidatePath("/dashboard/classes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting class:", error);
    return { error: "Erreur lors de la suppression." };
  }
}

export async function generateDefaultClasses() {
  // 23 sept. 2026 — aucune garde de rôle : un PARENT ou un enseignant pouvait
  // créer, renommer ou supprimer des classes en appel direct.
  const guard = await requireActionContext("/dashboard/classes");
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const defaultClasses = [
    { name: "Petite Section", cycle: "PRESCOLAIRE" },
    { name: "Moyenne Section", cycle: "PRESCOLAIRE" },
    { name: "Grande Section", cycle: "PRESCOLAIRE" },
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
    { name: "6ème", cycle: "MOYEN" },
    { name: "5ème", cycle: "MOYEN" },
    { name: "4ème", cycle: "MOYEN" },
    { name: "3ème", cycle: "MOYEN" },
    { name: "Seconde", cycle: "SECONDAIRE" },
    { name: "Première", cycle: "SECONDAIRE" },
    { name: "Terminale", cycle: "SECONDAIRE" },
  ];

  try {
    const existingClasses = await prisma.class.findMany({
      where: { schoolId: dbUser.schoolId }
    });
    const existingSet = new Set(existingClasses.map(c => `${c.name}-${c.cycle}`));

    const classesToCreate = defaultClasses
      .filter(c => !existingSet.has(`${c.name}-${c.cycle}`))
      .map(c => ({
        name: c.name,
        cycle: c.cycle as any,
        schoolId: dbUser.schoolId,
      }));

    if (classesToCreate.length > 0) {
      await prisma.class.createMany({
        data: classesToCreate
      });
      const createdInDb = await prisma.class.findMany({
        where: { schoolId: dbUser.schoolId, name: { in: classesToCreate.map(c => c.name) } },
        select: { id: true },
      });
      for (const cls of createdInDb) {
        await attachCurriculumSubjectsToClass(cls.id);
      }
    }

    revalidatePath("/dashboard/classes");
    return { success: true, count: classesToCreate.length };
  } catch (error) {
    console.error("Error generating default classes:", error);
    return { error: "Erreur lors de la génération des classes." };
  }
}

export async function generateCycleClasses(cycleId: string) {
  const guard = await requireActionContext("/dashboard/classes");
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const defaultClasses = [
    { name: "Petite Section", cycle: "PRESCOLAIRE" },
    { name: "Moyenne Section", cycle: "PRESCOLAIRE" },
    { name: "Grande Section", cycle: "PRESCOLAIRE" },
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
    { name: "6ème", cycle: "MOYEN" },
    { name: "5ème", cycle: "MOYEN" },
    { name: "4ème", cycle: "MOYEN" },
    { name: "3ème", cycle: "MOYEN" },
    { name: "Seconde", cycle: "SECONDAIRE" },
    { name: "Première", cycle: "SECONDAIRE" },
    { name: "Terminale", cycle: "SECONDAIRE" },
  ];

  const cycleClasses = defaultClasses.filter(c => c.cycle === cycleId);

  try {
    const existingClasses = await prisma.class.findMany({
      where: { schoolId: dbUser.schoolId, cycle: cycleId as any }
    });
    const existingSet = new Set(existingClasses.map(c => c.name));

    const classesToCreate = cycleClasses
      .filter(c => !existingSet.has(c.name))
      .map(c => ({
        name: c.name,
        cycle: c.cycle as any,
        schoolId: dbUser.schoolId,
      }));

    if (classesToCreate.length > 0) {
      await prisma.class.createMany({
        data: classesToCreate
      });
      const createdInDb = await prisma.class.findMany({
        where: { schoolId: dbUser.schoolId, name: { in: classesToCreate.map(c => c.name) } },
        select: { id: true },
      });
      for (const cls of createdInDb) {
        await attachCurriculumSubjectsToClass(cls.id);
      }
    }

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/classes");
    return { success: true, count: classesToCreate.length };
  } catch (error) {
    console.error("Error generating cycle classes:", error);
    return { error: "Erreur lors de la génération des classes du cycle." };
  }
}

