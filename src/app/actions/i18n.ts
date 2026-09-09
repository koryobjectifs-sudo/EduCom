"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isSupportedLocale, type SupportedLocale, DEFAULT_LOCALE } from "@/lib/i18n/types";

export async function setLanguageAction(newLocale: string) {
  if (!isSupportedLocale(newLocale)) {
    return { success: false, error: "Langue non supportée." };
  }

  const cookieStore = await cookies();
  cookieStore.set("educom_locale", newLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
    sameSite: "lax",
  });

  // Mettre à jour l'utilisateur si connecté
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { locale: newLocale },
      });
    }
  } catch (err) {
    // Non bloquant si non authentifié (ex: login/onboarding)
  }

  revalidatePath("/");
  return { success: true, locale: newLocale as SupportedLocale };
}
