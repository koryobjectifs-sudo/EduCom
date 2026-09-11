"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function changeTestRole(newRole: string) {
  if (process.env.NODE_ENV === "production") return { success: false, error: "Only in dev" };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false, error: "Not logged in" };

  await prisma.user.update({
    where: { id: user.id },
    data: { role: newRole as any }
  });

  return { success: true };
}

export async function setSidebarCollapsed(collapsed: boolean) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("educom_sidebar_collapsed", collapsed ? "true" : "false", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { success: true };
}

/**
 * Met à jour la photo de profil de l'utilisateur connecté (ou de test en dev),
 * et synchronise immédiatement l'organigramme de l'équipe (/dashboard/team).
 */
export async function updateUserAvatar(avatar: string | null) {
  let targetUserId: string | null = null;

  if (process.env.NODE_ENV === "development") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const testUserId = cookieStore.get("dev_test_user_id")?.value;
    if (testUserId) targetUserId = testUserId;
  }

  if (!targetUserId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };
    targetUserId = user.id;
  }

  // Si suppression d'avatar
  if (!avatar) {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { avatar: null },
    });
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/team");
    return { success: true, avatar: null };
  }

  // Validation format image (data URL base64 ou URL https)
  if (!avatar.startsWith("data:image/") && !avatar.startsWith("http://") && !avatar.startsWith("https://")) {
    return { success: false, error: "Format d'image non supporté." };
  }

  // Plage de taille élargie (jusqu'à 8 Mo base64)
  if (avatar.length > 8 * 1024 * 1024) {
    return { success: false, error: "La photo est trop volumineuse (maximum 6 Mo)." };
  }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { avatar },
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/team");

    return { success: true, avatar };
  } catch (err: any) {
    console.error("Failed to update user avatar:", err);
    return { success: false, error: err?.message || "Échec de l'enregistrement de la photo de profil." };
  }
}
