"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { SQL_CANAUX_COMMUNAUTE } from "@/lib/communauteSchema";

/**
 * Bouton « Mettre à jour la base » de l'écran d'attente de la Communauté —
 * DÉVELOPPEMENT UNIQUEMENT (en production, le schéma suit `prisma db push`
 * au déploiement). Ajouts seulement, rejouable : voir `lib/communauteSchema.ts`.
 */
export async function mettreAJourBaseCommunaute(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.NODE_ENV === "production") return { ok: false, error: "Disponible en développement uniquement." };
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!["OWNER", "ADMIN"].includes(auth.ctx.role)) return { ok: false, error: "Réservé à la direction." };
  try {
    // ~60 instructions, une par aller-retour vers la base distante : le délai par
    // défaut de Prisma (5 s) ne suffit pas depuis Dakar (vu le 26 sept. 2026).
    await prisma.$transaction(
      async (tx) => {
        for (const sql of SQL_CANAUX_COMMUNAUTE) await tx.$executeRawUnsafe(sql);
      },
      { maxWait: 15_000, timeout: 120_000 },
    );
  } catch (e) {
    console.error("[communauté] mise à jour du schéma impossible :", (e as Error).message);
    return { ok: false, error: (e as Error).message.split("\n").slice(-1)[0].slice(0, 300) };
  }
  revalidatePath("/dashboard/communications/communaute");
  revalidatePath("/famille/communaute");
  return { ok: true };
}
