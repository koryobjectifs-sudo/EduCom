"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function inviteTeamMember(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as any;

  if (!email || !role) {
    return { error: "L'email et le rôle sont requis." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true, role: true }
  });

  if (!dbUser || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN")) {
    return { error: "Vous n'avez pas les droits pour inviter un membre." };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Un utilisateur avec cet email existe déjà." };
  }

  // Check if pending invite already exists
  const existingInvite = await prisma.invitation.findFirst({
    where: { email, schoolId: dbUser.schoolId, status: "PENDING" }
  });

  if (existingInvite) {
    return { error: "Une invitation est déjà en attente pour cet email." };
  }

  // Create invitation
  const invite = await prisma.invitation.create({
    data: {
      email,
      role,
      schoolId: dbUser.schoolId
    }
  });

  revalidatePath("/dashboard/team");

  // Since we don't have email sending, we return the magic link to the UI
  // In production, we would use the actual deployed URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const link = `${baseUrl}/invite?token=${invite.token}`;

  return { success: true, link };
}

export async function createStaffMember(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as any;
  const password = formData.get("password") as string;

  if (!firstName || !lastName || !email || !role || !password) {
    return { error: "Tous les champs sont requis." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true, role: true }
  });

  if (!dbUser || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN")) {
    return { error: "Vous n'avez pas les droits pour créer un membre." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Un utilisateur avec cet email existe déjà." };
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminAuthClient = createAdminClient();

    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role,
        schoolId: dbUser.schoolId
      }
    });

    if (authError || !authData.user) {
      console.error("Auth Admin Error:", authError);
      return { error: "Erreur lors de la création du compte (avez-vous ajouté la clé admin ?)" };
    }

    // Le trigger Supabase va créer l'entrée dans public.User automatiquement 
    // à cause de handle_new_user, MAIS il utilise les user_metadata !
    // Si pour une raison ou une autre on veut s'assurer que c'est synchro,
    // on peut aussi update l'utilisateur ici.
    
    // On force la synchro au cas où
    await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        firstName,
        lastName,
        role,
        schoolId: dbUser.schoolId
      },
      create: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        role,
        schoolId: dbUser.schoolId,
        password: "" // password not stored in prisma
      }
    });

    revalidatePath("/dashboard/team");
    return { success: true };
  } catch (err: any) {
    console.error("Error creating staff:", err);
    return { error: "La clé d'administration Supabase est introuvable. Veuillez vérifier votre fichier .env." };
  }
}
