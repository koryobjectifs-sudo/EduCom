"use server";

import { requireActionContext } from "@/lib/actionContext";
import { engagementPublication, type EngagementPublication } from "@/lib/engagement";

/** Engagement d'une publication : son auteur et la direction seulement (vérifié dans `lib/engagement.ts`). */
export async function voirEngagement(postId: string): Promise<{ ok: true; e: EngagementPublication } | { ok: false; error: string }> {
  const auth = await requireActionContext(undefined, { lecture: true });
  if (!auth.ok) return { ok: false, error: auth.error };
  const { userId, schoolId, role } = auth.ctx;
  const e = await engagementPublication({ userId, schoolId, role }, typeof postId === "string" ? postId : "");
  return e ? { ok: true, e } : { ok: false, error: "Réservé à l'auteur et à la direction." };
}
