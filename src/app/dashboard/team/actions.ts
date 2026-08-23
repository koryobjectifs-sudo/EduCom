"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function inviteTeamMember(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as any;
  // Note: we don't store managerId on the Invitation model for now, but we could if we update schema.
  // We'll skip managerId for invitation for now since we didn't add it to Invitation schema.

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
  const managerId = formData.get("managerId") as string;

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
        schoolId: dbUser.schoolId,
        managerId: managerId || null
      }
    });

    if (authError || !authData.user) {
      console.error("Auth Admin Error:", authError);
      return { error: `Erreur d'authentification : ${authError?.message || 'Erreur inconnue'}` };
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
        schoolId: dbUser.schoolId,
        managerId: managerId || null
      },
      create: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        role,
        schoolId: dbUser.schoolId,
        password: "", // password not stored in prisma
        managerId: managerId || null
      }
    });

    revalidatePath("/dashboard/team");
    return { success: true };
  } catch (err: any) {
    console.error("Error creating staff:", err);
    return { error: "La clé d'administration Supabase est introuvable. Veuillez vérifier votre fichier .env." };
  }
}

export async function updateStaffMember(formData: FormData) {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as any;
  const managerId = (formData.get("managerId") as string) || null;

  if (!userId || !role) {
    return { error: "Le membre et le rôle sont requis." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true, role: true }
  });

  if (!dbUser || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN")) {
    return { error: "Vous n'avez pas les droits pour modifier un membre." };
  }

  // Prevent setting a user as their own manager
  if (userId === managerId) {
    return { error: "Un utilisateur ne peut pas être son propre responsable hiérarchique." };
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId, schoolId: dbUser.schoolId } });
  if (!targetUser) {
    return { error: "Utilisateur introuvable." };
  }

  if (targetUser.role === "OWNER") {
    return { error: "Le rôle du propriétaire ne peut pas être modifié." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        managerId,
      }
    });

    // We should also attempt to update the metadata in Supabase Auth if possible,
    // but the DB is the source of truth for our app's roles.
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminAuthClient = createAdminClient();
      await adminAuthClient.auth.admin.updateUserById(userId, {
        user_metadata: { role, managerId }
      });
    } catch (adminErr) {
      console.warn("Could not sync metadata to Supabase Auth. This is non-fatal if DB is updated.", adminErr);
    }

    revalidatePath("/dashboard/team");
    return { success: true };
  } catch (err) {
    console.error("Error updating staff member:", err);
    return { error: "Erreur inattendue lors de la mise à jour." };
  }
}
