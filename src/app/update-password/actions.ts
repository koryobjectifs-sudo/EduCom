"use server";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password")?.toString();

  if (!password) {
    return { error: "Veuillez saisir un mot de passe." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Update password error:", error.message);
    return { error: "Impossible de mettre à jour le mot de passe. Le lien est peut-être expiré." };
  }

  return { success: true };
}
