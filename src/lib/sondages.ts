import { prisma } from "@/lib/prisma";
import { notifierPersonnes } from "@/lib/notifications";
import { destinatairesPublication } from "@/lib/engagement";
import { cleEspace } from "@/lib/community";
import { lireChoix } from "@/lib/interpretation";

/**
 * Sondages — relance et annonce des résultats (26 sept. 2026).
 *
 * ═══ RÈGLES ═══
 * Relance : l'auteur ou la direction ; seuls les destinataires qui n'ont pas
 *   voté sont prévenus.
 * Résultats : à la clôture (bouton « Clore » ou date atteinte), les
 *   destinataires, les votants et l'auteur sont prévenus UNE fois
 *   (`resultsNotifiedAt`, pris avant l'envoi : deux passages simultanés
 *   n'envoient pas deux fois).
 */

const lien = (post: { id: string; audience: string; classId: string | null; channelId: string | null }) =>
  `?espace=${encodeURIComponent(cleEspace(post))}#pub-${post.id}`;

async function chargerPoll(pollId: string, schoolId?: string) {
  return prisma.communityPoll.findFirst({
    where: { id: pollId, ...(schoolId ? { post: { schoolId } } : {}) },
    select: {
      id: true,
      question: true,
      multiple: true,
      closesAt: true,
      options: { orderBy: { position: "asc" }, select: { id: true, label: true } },
      votes: { select: { userId: true, optionId: true } },
      post: { select: { id: true, schoolId: true, authorId: true, audience: true, classId: true, channelId: true, createdAt: true, hiddenAt: true } },
    },
  });
}

/** Personnes visées par le sondage qui n'ont pas encore voté. */
export async function nonVotants(pollId: string, schoolId: string): Promise<string[]> {
  const poll = await chargerPoll(pollId, schoolId);
  if (!poll) return [];
  const vote = new Set(poll.votes.map((v) => v.userId));
  return (await destinatairesPublication(poll.post)).filter((id) => !vote.has(id));
}

export async function relancerNonVotants(pollId: string, schoolId: string): Promise<number> {
  const poll = await chargerPoll(pollId, schoolId);
  if (!poll || poll.post.hiddenAt) return 0;
  const cibles = await nonVotants(pollId, schoolId);
  await notifierPersonnes(schoolId, cibles, {
    title: `⏰ Votre avis est attendu : ${poll.question}`,
    body: "Un geste suffit pour répondre au sondage de l'école.",
    suffixe: lien(poll.post),
    tag: `sondage-${poll.id}`,
    kind: "communaute.sondage",
  });
  return cibles.length;
}

/** Annonce les résultats d'un sondage clos (idempotent). Renvoie le nombre de personnes prévenues. */
export async function annoncerResultats(pollId: string): Promise<number> {
  const pris = await prisma.communityPoll.updateMany({
    where: { id: pollId, resultsNotifiedAt: null, closesAt: { lte: new Date() } },
    data: { resultsNotifiedAt: new Date() },
  });
  if (!pris.count) return 0;
  const poll = await chargerPoll(pollId);
  if (!poll || poll.post.hiddenAt) return 0;
  const votants = new Set(poll.votes.map((v) => v.userId));
  const options = poll.options.map((o) => ({ label: o.label, votes: poll.votes.filter((v) => v.optionId === o.id).length }));
  const lecture = lireChoix(options, votants.size, poll.multiple);
  const cibles = [...new Set([...(await destinatairesPublication(poll.post)), ...votants, poll.post.authorId])];
  await notifierPersonnes(poll.post.schoolId, cibles, {
    title: `📊 Résultats : ${poll.question}`,
    body: votants.size ? `${lecture.phrase} ${votants.size} participant${votants.size > 1 ? "s" : ""}.` : "Sondage clos sans réponse.",
    suffixe: lien(poll.post),
    tag: `sondage-resultats-${poll.id}`,
    kind: "communaute.sondage.resultats",
  });
  return cibles.length;
}

/** Sondages arrivés à leur date de clôture, pas encore annoncés. Tâche quotidienne + ouverture de la Communauté. */
export async function annoncerSondagesEchus(schoolId?: string): Promise<number> {
  let ids: string[] = [];
  try {
    ids = (
      await prisma.communityPoll.findMany({
        where: { resultsNotifiedAt: null, closesAt: { lte: new Date() }, ...(schoolId ? { post: { schoolId } } : {}) },
        select: { id: true },
        take: 50,
      })
    ).map((p) => p.id);
  } catch {
    return 0; // colonne pas encore créée : rien à annoncer
  }
  let total = 0;
  for (const id of ids) total += await annoncerResultats(id).catch(() => 0);
  return total;
}
