"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import type { Prisma } from "@/generated/prisma/client";
import { annoncerDistributionsEchues } from "@/lib/bulletinsParents";
import { publierProgrammesEchus } from "@/lib/programmes";

/**
 * Cloche de notifications (personnel ET familles) — 26 sept. 2026.
 * Le destinataire vient TOUJOURS de la session, jamais d'un argument :
 * connaître un identifiant ne suffit pas à lire la boîte de quelqu'un.
 */
export type NotificationVue = { id: string; titre: string; texte: string; lien: string | null; lue: boolean; date: string };

/**
 * Ce qui s'adresse aux familles. L'espace parent n'affiche QUE cela : une
 * notification interne (bulletins validés, frais…) ne doit jamais y apparaître,
 * même quand un même compte a les deux casquettes (sélecteur de rôle de test).
 */
const FAMILLE: Prisma.StaffNotificationWhereInput = {
  OR: [
    { kind: { startsWith: "communaute" } },
    { kind: { startsWith: "famille." } },
    { kind: { in: ["document.validated", "document.rejected"] } },
  ],
};

export async function mesNotifications(espace: "famille" | "personnel" = "personnel"): Promise<{ ok: true; nonLues: number; liste: NotificationVue[] } | { ok: false }> {
  const auth = await requireActionContext(undefined, { lecture: true });
  if (!auth.ok) return { ok: false };
  const { userId, schoolId } = auth.ctx;
  const filtre = espace === "famille" ? FAMILLE : { NOT: { kind: { startsWith: "famille." } } };
  // Messages programmés arrivés à leur heure : notifications envoyées (idempotent, sans tâche à la minute).
  await publierProgrammesEchus(schoolId).catch(() => 0);
  // Bulletins dont la date de distribution vient d'arriver : annoncés sans attendre la tâche du matin.
  if (espace === "famille") await annoncerDistributionsEchues(schoolId).catch(() => 0);
  const [nonLues, liste] = await Promise.all([
    prisma.staffNotification.count({ where: { userId, schoolId, readAt: null, ...filtre } }),
    prisma.staffNotification.findMany({
      where: { userId, schoolId, ...filtre },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    }),
  ]);
  return {
    ok: true,
    nonLues,
    liste: liste.map((n) => ({
      id: n.id,
      titre: n.title,
      texte: n.body,
      lien: n.link,
      lue: Boolean(n.readAt),
      date: n.createdAt.toISOString(),
    })),
  };
}

/** Marque comme lues (toutes si `ids` est vide). Lecture : jamais bloquée par l'abonnement. */
export async function marquerNotificationsLues(ids: string[] = [], espace: "famille" | "personnel" = "personnel"): Promise<{ ok: boolean }> {
  const auth = await requireActionContext(undefined, { lecture: true });
  if (!auth.ok) return { ok: false };
  const { userId, schoolId } = auth.ctx;
  const liste = Array.isArray(ids) ? ids.filter((x) => typeof x === "string").slice(0, 100) : [];
  await prisma.staffNotification.updateMany({
    where: {
      userId,
      schoolId,
      readAt: null,
      ...(liste.length ? { id: { in: liste } } : espace === "famille" ? FAMILLE : {}),
    },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
