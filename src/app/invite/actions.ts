"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function acceptInvite(formData: FormData) {
  const token = formData.get("token") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const password = formData.get("password") as string;

  if (!token || !firstName || !lastName || !password) {
    return { error: "Tous les champs sont requis." };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return { error: "Invitation invalide ou déjà utilisée." };
  }

  try {
    const supabase = await createClient();

    // 1. Inscription dans Supabase Auth
    const res = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: {
          firstName,
          lastName,
        }
      }
    });

    if (res.error) {
      return { error: res.error.message };
    }

    const userId = res.data.user?.id;
    if (!userId) {
      return { error: "Erreur lors de la création de l'utilisateur." };
    }

    // 2. Création de l'utilisateur dans Prisma
    await prisma.user.create({
      data: {
        id: userId,
        email: invitation.email,
        firstName,
        lastName,
        role: invitation.role,
        schoolId: invitation.schoolId
      }
    });

    // 3. Marquer l'invitation comme acceptée
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" }
    });
    
  } catch (err) {
    console.error("Invite error:", err);
    return { error: "Une erreur interne s'est produite." };
  }

  // Si tout s'est bien passé, l'utilisateur est connecté et on le redirige vers le tableau de bord.
  redirect("/dashboard");
}
