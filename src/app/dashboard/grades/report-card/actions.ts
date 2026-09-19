"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const settingsSchema = z.object({
  bulletinAccentColor: z.string().nullable().optional(),
  bulletinWatermark: z.boolean(),
  bulletinWatermarkOpacity: z.number().min(0.01).max(0.5),
  bulletinLogoPosition: z.enum(["LEFT", "CENTER", "RIGHT"]),
});

export async function saveSchoolBulletinSettings(data: z.infer<typeof settingsSchema>) {
  const auth = await requireActionContext("/dashboard/grades/report-card");
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "Paramètres invalides." };
  }

  try {
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        bulletinAccentColor: parsed.data.bulletinAccentColor?.trim() || null,
        bulletinWatermark: parsed.data.bulletinWatermark,
        bulletinWatermarkOpacity: parsed.data.bulletinWatermarkOpacity,
        bulletinLogoPosition: parsed.data.bulletinLogoPosition,
      },
    });

    revalidatePath("/dashboard/grades/report-card");
    revalidatePath("/dashboard/grades/bulletin");
    return { ok: true };
  } catch (err) {
    console.error("Erreur sauvegarde réglages bulletin:", err);
    return { ok: false, error: "Échec de l'enregistrement des réglages." };
  }
}
