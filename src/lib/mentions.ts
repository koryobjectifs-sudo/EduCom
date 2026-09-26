import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { mentionsVisibles, perimetre } from "@/lib/community";
import { destinatairesPublication } from "@/lib/engagement";
import { resoudreAudience } from "@/lib/audience";
import { notifierPersonnes } from "@/lib/notifications";
import { groupesMentionnables, PREFIXE_GROUPE } from "@/lib/groupesMention";

/**
 * Prévenir les personnes et les groupes mentionnés (« @ ») — 26 sept. 2026.
 * Personne : prévenue si elle voit la publication (`mentionsVisibles`).
 * Groupe : autorisé pour l'auteur (`groupesMention.ts`), et seuls ses membres
 * qui font partie de l'audience de la publication sont prévenus.
 */
async function nomDe(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Quelqu'un";
}

export async function notifierMentions(
  actor: ActorContext,
  postId: string,
  mentions: unknown,
  texteExtrait: string,
  espace: string,
  deja: string[] = [],
) {
  try {
    const liste = [...new Set(Array.isArray(mentions) ? mentions.filter((x): x is string => typeof x === "string") : [])];
    const groupesDemandes = liste.filter((x) => x.startsWith(PREFIXE_GROUPE)).slice(0, 10);
    const personnes = liste.filter((x) => !x.startsWith(PREFIXE_GROUPE));
    const auteur = await nomDe(actor.userId);
    const lien = `?espace=${encodeURIComponent(espace)}#pub-${postId}`;
    const extrait = texteExtrait || "Dans un message de la Communauté";

    const ids = (await mentionsVisibles(actor.schoolId, postId, personnes, actor.userId)).filter((id) => !deja.includes(id));
    if (ids.length) {
      await notifierPersonnes(actor.schoolId, ids, {
        title: `${auteur} vous a mentionné`,
        body: extrait,
        suffixe: lien,
        tag: `mention-${postId}`,
        kind: "communaute.mention",
      });
    }

    if (!groupesDemandes.length) return;
    const p = await perimetre(actor);
    const autorises = new Map((await groupesMentionnables(actor, p.classIds, p.toutesClasses)).map((g) => [g.id, g]));
    const groupes = groupesDemandes.map((id) => autorises.get(id)).filter((g) => g !== undefined);
    if (!groupes.length) return;
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, schoolId: actor.schoolId },
      select: { id: true, schoolId: true, authorId: true, audience: true, classId: true, channelId: true, createdAt: true },
    });
    if (!post) return;
    const audience = new Set(await destinatairesPublication(post));
    const dejaPrevenus = new Set([...deja, ...ids, actor.userId]);
    for (const g of groupes) {
      const membres = await resoudreAudience(actor.schoolId, g.regles, []);
      const cibles = [...membres.parents, ...membres.personnel].filter((id) => audience.has(id) && !dejaPrevenus.has(id));
      cibles.forEach((id) => dejaPrevenus.add(id));
      if (!cibles.length) continue;
      await notifierPersonnes(actor.schoolId, cibles, {
        title: `${auteur} a mentionné @${g.nom}`,
        body: extrait,
        suffixe: lien,
        tag: `mention-${postId}`,
        kind: "communaute.mention",
      });
    }
  } catch (e) {
    console.error("[communauté] mentions impossibles :", (e as Error).message);
  }
}
