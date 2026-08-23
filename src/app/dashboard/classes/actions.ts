"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const name = formData.get("name") as string;
  const teacherId = formData.get("teacherId") as string;
  const cycle = formData.get("cycle") as string;

  if (!name) {
    return { error: "Le nom de la classe est requis." };
  }

  if (!cycle) {
    return { error: "Le cycle éducatif est requis." };
  }

  try {
    await prisma.class.create({
      data: {
        name,
        cycle: cycle as any,
        schoolId: dbUser.schoolId,
        teacherId: teacherId || null,
      }
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return { error: "Erreur lors de la création de la classe." };
  }

  revalidatePath("/dashboard/classes");
  redirect("/dashboard/classes");
}

export async function createClassInline(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const name = formData.get("name") as string;
  const teacherId = formData.get("teacherId") as string;
  const cycle = formData.get("cycle") as any;

  if (!name) {
    return { error: "Le nom de la classe est requis." };
  }

  try {
    await prisma.class.create({
      data: {
        name,
        cycle: cycle || "AUTRE",
        schoolId: dbUser.schoolId,
        teacherId: teacherId || null,
      }
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return { error: "Erreur lors de la création de la classe." };
  }

  revalidatePath("/dashboard/classes");
  return { success: true };
}

export async function updateClass(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const name = formData.get("name") as string;
  const teacherId = formData.get("teacherId") as string;
  const cycle = formData.get("cycle") as string;

  if (!name) {
    return { error: "Le nom de la classe est requis." };
  }

  if (!cycle) {
    return { error: "Le cycle éducatif est requis." };
  }

  try {
    await prisma.class.update({
      where: {
        id,
        schoolId: dbUser.schoolId
      },
      data: {
        name,
        cycle: cycle as any,
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

export async function deleteClass(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const defaultClasses = [
    { name: "Petite Section", cycle: "MATERNELLE" },
    { name: "Moyenne Section", cycle: "MATERNELLE" },
    { name: "Grande Section", cycle: "MATERNELLE" },
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
    { name: "6ème", cycle: "COLLEGE" },
    { name: "5ème", cycle: "COLLEGE" },
    { name: "4ème", cycle: "COLLEGE" },
    { name: "3ème", cycle: "COLLEGE" },
    { name: "Seconde", cycle: "LYCEE" },
    { name: "Première", cycle: "LYCEE" },
    { name: "Terminale", cycle: "LYCEE" },
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
    }

    revalidatePath("/dashboard/classes");
    return { success: true, count: classesToCreate.length };
  } catch (error) {
    console.error("Error generating default classes:", error);
    return { error: "Erreur lors de la génération des classes." };
  }
}

export async function generateCycleClasses(cycleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const defaultClasses = [
    { name: "Petite Section", cycle: "MATERNELLE" },
    { name: "Moyenne Section", cycle: "MATERNELLE" },
    { name: "Grande Section", cycle: "MATERNELLE" },
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
    { name: "6ème", cycle: "COLLEGE" },
    { name: "5ème", cycle: "COLLEGE" },
    { name: "4ème", cycle: "COLLEGE" },
    { name: "3ème", cycle: "COLLEGE" },
    { name: "Seconde", cycle: "LYCEE" },
    { name: "Première", cycle: "LYCEE" },
    { name: "Terminale", cycle: "LYCEE" },
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
    }

    revalidatePath("/dashboard/directory");
    return { success: true, count: classesToCreate.length };
  } catch (error) {
    console.error("Error generating cycle classes:", error);
    return { error: "Erreur lors de la génération des classes du cycle." };
  }
}

