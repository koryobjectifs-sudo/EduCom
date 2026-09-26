import { prisma } from "@/lib/prisma";
import { cleEspace } from "@/lib/community";
import { notifierNouvellePublication, notifierNouveauMessage } from "@/lib/notifications";
import { notifierMentions } from "@/lib/mentions";

/**
 * Messages programmés — 26 sept. 2026 (canaux et messages directs).
 *
 * ═══ RÈGLES ═══
 * Un message programmé est enregistré avec `createdAt` = son heure de
 * parution et `scheduledAt` renseigné. Avant cette heure, seul son auteur le
 * voit (`filtreVisible`, `chargerMessages`). À l'heure dite, les notifications
 * partent UNE fois (`announcedAt`, pris avant l'envoi).
 *
 * Déclenchement sans tâche planifiée à la minute : à chaque interrogation de
 * la cloche (toutes les 15 s par personne connectée), à l'ouverture de la
 * Communauté et par la tâche quotidienne. Si personne n'est connecté, le
 * message paraît quand même à l'heure (visibilité calculée), seules ses
 * notifications attendent le prochain passage.
 */
export const DELAI_MAX_JOURS = 60;

/** Date de programmation valide : au moins 1 minute dans le futur, au plus 60 jours. Renvoie null si invalide. */
export function dateProgrammation(brut: unknown): Date | null {
  if (typeof brut !== "string" || !brut) return null;
  const d = new Date(brut);
  const t = d.getTime();
  if (Number.isNaN(t) || t < Date.now() + 60_000 || t > Date.now() + DELAI_MAX_JOURS * 86400_000) return null;
  return d;
}

export async function publierProgrammesEchus(schoolId?: string): Promise<number> {
  const maintenant = new Date();
  const ecole = schoolId ? { schoolId } : {};
  let posts: { id: string; schoolId: string; authorId: string; audience: string; classId: string | null; channelId: string | null; body: string; pendingMentions: unknown }[] = [];
  let messages: { id: string; schoolId: string; authorId: string; conversationId: string; body: string; createdAt: Date }[] = [];
  try {
    [posts, messages] = await Promise.all([
      prisma.communityPost.findMany({
        where: { ...ecole, scheduledAt: { not: null }, announcedAt: null, createdAt: { lte: maintenant } },
        select: { id: true, schoolId: true, authorId: true, audience: true, classId: true, channelId: true, body: true, pendingMentions: true },
        take: 50,
      }),
      prisma.communityMessage.findMany({
        where: { ...ecole, scheduledAt: { not: null }, announcedAt: null, createdAt: { lte: maintenant }, deletedAt: null },
        select: { id: true, schoolId: true, authorId: true, conversationId: true, body: true, createdAt: true },
        take: 50,
      }),
    ]);
  } catch {
    return 0; // colonnes pas encore créées
  }
  if (!posts.length && !messages.length) return 0;
  const auteurs = new Map(
    (
      await prisma.user.findMany({ where: { id: { in: [...new Set([...posts, ...messages].map((x) => x.authorId))] } }, select: { id: true, role: true } })
    ).map((u) => [u.id, u.role]),
  );
  let n = 0;
  for (const post of posts) {
    const pris = await prisma.communityPost.updateMany({ where: { id: post.id, announcedAt: null }, data: { announcedAt: new Date() } });
    if (!pris.count) continue;
    const actor = { userId: post.authorId, schoolId: post.schoolId, role: auteurs.get(post.authorId) ?? "TEACHER" };
    await notifierNouvellePublication(actor, { id: post.id, audience: post.audience, classId: post.classId, channelId: post.channelId, body: post.body || "📷 Nouveau message" }).catch(
      (e) => console.error("[programmés] notification :", (e as Error).message),
    );
    await notifierMentions(actor, post.id, post.pendingMentions, post.body, cleEspace(post));
    n++;
  }
  for (const m of messages) {
    const pris = await prisma.communityMessage.updateMany({ where: { id: m.id, announcedAt: null }, data: { announcedAt: new Date() } });
    if (!pris.count) continue;
    await prisma.communityConversation.updateMany({ where: { id: m.conversationId, lastMessageAt: { lt: m.createdAt } }, data: { lastMessageAt: m.createdAt } });
    const actor = { userId: m.authorId, schoolId: m.schoolId, role: auteurs.get(m.authorId) ?? "PARENT" };
    await notifierNouveauMessage(actor, m.conversationId, m.body || "📎 Pièce jointe").catch((e) =>
      console.error("[programmés] message :", (e as Error).message),
    );
    n++;
  }
  return n;
}
