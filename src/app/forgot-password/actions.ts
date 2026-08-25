"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email")?.toString();

  if (!email) {
    return { error: "Veuillez renseigner une adresse e-mail." };
  }

  const supabase = await createClient();

  const entetes = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host")}`;

  // L'utilisateur cliquera sur le lien dans son e-mail et sera redirigé vers /auth/callback
  // La route callback l'enverra ensuite sur /update-password grâce au paramètre next
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    console.error("Forgot password error:", error.message);
    if (error.message.includes("rate limit")) {
      return { error: "Trop de tentatives. Veuillez patienter." };
    }
    // Pour éviter l'énumération de comptes, on affiche "succès" même si l'email n'existe pas.
    return { success: true };
  }

  return { success: true };
}
