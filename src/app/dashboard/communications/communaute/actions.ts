"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { hasAccess } from "@/lib/permissions";
import {
  perimetre,
  peutModerer,
  peutPublier,
  peutGererCanaux,
  postVisible,
  cleEspace,
  lireEspace,
  REACTIONS,
  type TypeReaction,
} from "@/lib/community";
import { regleValide } from "@/lib/audience";
import { preparerEnvoiMedia, mediasRattachables, type DemandeEnvoi } from "@/lib/communityMedia";
import { notifierNouvellePublication, notifierPersonnes } from "@/lib/notifications";
import { annoncerResultats, relancerNonVotants } from "@/lib/sondages";
import { notifierMentions } from "@/lib/mentions";
import { dateProgrammation, publierProgrammesEchus } from "@/lib/programmes";

/**
 * Actions de la Communauté — partagées par l'espace personnel
 * (`/dashboard/communications/communaute`) et l'espace famille
 * (`/famille/communaute`). 25 sept. 2026.
 *
 * Chaque action : authentification, contrôle d'écran par rôle, puis contrôle
 * LIGNE par `lib/community.ts` (la publication est-elle dans le périmètre ?).
 * Un identifiant venu du navigateur n'est jamais cru sur parole.
 */
const CHEMIN_PERSONNEL = "/dashboard/communications/communaute";
const CHEMIN_FAMILLE = "/famille/communaute";
type R = { ok: true } | { ok: false; error: string };

async function contexte() {
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const { userId, schoolId, role } = auth.ctx;
  const autorise = role === "PARENT" ? true : hasAccess(role, CHEMIN_PERSONNEL);
  if (!autorise) return { ok: false as const, error: "Vous n'avez pas accès à la Communauté." };
  const actor = { userId, schoolId, role };
  return { ok: true as const, actor, p: await perimetre(actor) };
}

function rafraichir() {
  revalidatePath(CHEMIN_PERSONNEL);
  revalidatePath(CHEMIN_FAMILLE);
}

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Prépare l'envoi direct d'une photo, vidéo ou PDF (URL signée).
 * `usage` : PUBLICATION (réservé à qui peut publier) ou MESSAGE (tout
 * participant à une conversation, parents compris — vérifié au rattachement).
 */
export async function preparerMedia(
  demande: DemandeEnvoi,
  usage: "PUBLICATION" | "MESSAGE" = "PUBLICATION",
): Promise<{ ok: true; mediaId: string; path: string; token: string } | { ok: false; error: string }> {
  const c = await contexte();
  if (!c.ok) return c;
  if (usage === "PUBLICATION") {
    const publieQuelquePart =
      peutPublier(c.actor, c.p, "ECOLE") ||
      (c.actor.role === "TEACHER" && c.p.classIds.length > 0) ||
      (c.p.canaux ?? []).some((x) => peutPublier(c.actor, c.p, "CANAL", x.id));
    if (!publieQuelquePart) return { ok: false, error: "Vous ne pouvez pas publier." };
  }
  return preparerEnvoiMedia(c.actor, demande);
}

export async function publier(input: {
  body: string;
  mediaIds?: string[];
  /** Clé d'espace : "ECOLE", "classe:<id>" ou "canal:<id>" (voir `lireEspace`). */
  espace: string;
  pinned?: boolean;
  mustRead?: boolean;
  commentsEnabled?: boolean;
  /** Personnes mentionnées (« @ ») — prévenues si elles voient la publication. */
  mentions?: string[];
  /** Sondage joint (26 sept. 2026) : 2 à 6 réponses possibles. */
  sondage?: { question: string; options: string[]; multiple?: boolean; anonymous?: boolean; closesAt?: string | null } | null;
  /** Programmer (ISO) : le message paraît à cette heure ; invisible avant, sauf pour l'auteur. */
  programmeLe?: string | null;
}): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const body = texte(input.body, 5000);
  const mediaIds = Array.isArray(input.mediaIds) ? input.mediaIds.filter((x) => typeof x === "string") : [];
  let sondage: { question: string; options: string[]; multiple: boolean; anonymous: boolean; closesAt: Date | null } | null = null;
  if (input.sondage) {
    const question = texte(input.sondage.question, 300);
    const options = [
      ...new Set((Array.isArray(input.sondage.options) ? input.sondage.options : []).map((o) => texte(o, 120)).filter(Boolean)),
    ];
    if (!question) return { ok: false, error: "Écrivez la question du sondage." };
    if (options.length < 2) return { ok: false, error: "Un sondage demande au moins deux réponses différentes." };
    if (options.length > 6) return { ok: false, error: "Six réponses au maximum." };
    const fin = input.sondage.closesAt ? new Date(input.sondage.closesAt) : null;
    if (fin && (Number.isNaN(fin.getTime()) || fin <= new Date())) return { ok: false, error: "La date de clôture doit être dans le futur." };
    sondage = { question, options, multiple: Boolean(input.sondage.multiple), anonymous: Boolean(input.sondage.anonymous), closesAt: fin };
  }
  if (!body && mediaIds.length === 0 && !sondage) return { ok: false, error: "Écrivez un message ou ajoutez une photo avant de publier." };
  const programme = input.programmeLe ? dateProgrammation(input.programmeLe) : null;
  if (input.programmeLe && !programme) return { ok: false, error: "Choisissez une heure dans le futur (60 jours au plus)." };
  const e = lireEspace(typeof input.espace === "string" ? input.espace : "");
  if (e.type === "TOUT") return { ok: false, error: "Choisissez où publier." };
  const audience = e.type;
  const classId = audience === "CLASSE" ? e.id : null;
  const channelId = audience === "CANAL" ? e.id : null;
  if (!peutPublier(c.actor, c.p, audience, classId ?? channelId)) {
    return { ok: false, error: "Vous ne pouvez pas publier dans cet espace." };
  }
  if (classId) {
    const existe = await prisma.class.findFirst({ where: { id: classId, schoolId: c.actor.schoolId }, select: { id: true } });
    if (!existe) return { ok: false, error: "Classe introuvable." };
  }
  const rattachables = await mediasRattachables(c.actor, mediaIds);
  if (rattachables === null) return { ok: false, error: "Un fichier n'a pas fini de s'envoyer. Réessayez." };
  const post = await prisma.communityPost.create({
    data: {
      schoolId: c.actor.schoolId,
      authorId: c.actor.userId,
      audience,
      classId,
      channelId,
      body,
      pinned: Boolean(input.pinned),
      mustRead: Boolean(input.mustRead),
      commentsEnabled: input.commentsEnabled !== false,
      ...(programme
        ? { createdAt: programme, scheduledAt: new Date(), pendingMentions: Array.isArray(input.mentions) ? input.mentions.filter((x) => typeof x === "string").slice(0, 20) : [] }
        : {}),
      ...(sondage
        ? {
            poll: {
              create: {
                question: sondage.question,
                multiple: sondage.multiple,
                anonymous: sondage.anonymous,
                closesAt: sondage.closesAt,
                options: { create: sondage.options.map((label, position) => ({ label, position })) },
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });
  if (rattachables.length) {
    await prisma.$transaction(
      rattachables.map((id, i) =>
        prisma.communityMedia.updateMany({
          where: { id, uploaderId: c.actor.userId, postId: null, messageId: null },
          data: { postId: post.id, position: i },
        }),
      ),
    );
  }
  // Programmé : les notifications partiront à l'heure dite (`lib/programmes.ts`).
  if (programme) {
    rafraichir();
    return { ok: true };
  }
  await notifierNouvellePublication(c.actor, { id: post.id, audience, classId, channelId, body: body || (sondage ? `📊 Sondage : ${sondage.question}` : "") }).catch((e) =>
    console.error("[communauté] notification impossible :", (e as Error).message),
  );
  await notifierMentions(c.actor, post.id, input.mentions, body, cleEspace({ audience, classId, channelId }));
  rafraichir();
  return { ok: true };
}

/** Modifier le texte de son message (l'auteur seulement). Marqué « modifié » s'il a déjà paru. */
export async function modifierPublication(postId: string, body: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const post = await postVisible(c.actor, c.p, postId);
  if (!post || post.authorId !== c.actor.userId) return { ok: false, error: "Seul l'auteur peut modifier son message." };
  const t = texte(body, 5000);
  const detail = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { createdAt: true, poll: { select: { id: true } }, _count: { select: { medias: true } } },
  });
  if (!t && !detail?.poll && !detail?._count.medias) return { ok: false, error: "Le message ne peut pas être vide." };
  await prisma.communityPost.update({
    where: { id: postId },
    data: { body: t, ...(detail && detail.createdAt <= new Date() ? { editedAt: new Date() } : {}) },
  });
  rafraichir();
  return { ok: true };
}

/** Message programmé : changer l'heure, ou l'envoyer tout de suite (`quand` = null). L'auteur seulement. */
export async function reprogrammerPublication(postId: string, quand: string | null): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const post = await prisma.communityPost.findFirst({
    where: { id: typeof postId === "string" ? postId : "", schoolId: c.actor.schoolId, authorId: c.actor.userId, scheduledAt: { not: null }, announcedAt: null },
    select: { id: true, createdAt: true },
  });
  if (!post || post.createdAt <= new Date()) return { ok: false, error: "Ce message n'est plus programmé." };
  const d = quand === null ? new Date() : dateProgrammation(quand);
  if (!d) return { ok: false, error: "Choisissez une heure dans le futur (60 jours au plus)." };
  await prisma.communityPost.update({ where: { id: post.id }, data: { createdAt: d } });
  if (quand === null) await publierProgrammesEchus(c.actor.schoolId);
  rafraichir();
  return { ok: true };
}

export async function reagir(postId: string, kind: string | null): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const post = await postVisible(c.actor, c.p, postId);
  if (!post || post.hiddenAt) return { ok: false, error: "Publication introuvable." };
  if (kind === null) {
    await prisma.communityReaction.deleteMany({ where: { postId, userId: c.actor.userId } });
  } else {
    const k = kind.trim().slice(0, 16);
    if (!k) return { ok: false, error: "Réaction invalide." };
    await prisma.communityReaction.upsert({
      where: { postId_userId: { postId, userId: c.actor.userId } },
      update: { kind: k },
      create: { postId, userId: c.actor.userId, kind: k },
    });
  }
  rafraichir();
  return { ok: true };
}

export async function commenter(postId: string, body: string, mentions: string[] = []): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const post = await postVisible(c.actor, c.p, postId);
  if (!post || post.hiddenAt) return { ok: false, error: "Publication introuvable." };
  if (!post.commentsEnabled) return { ok: false, error: "Les commentaires sont fermés sur cette publication." };
  const t = texte(body, 2000);
  if (!t) return { ok: false, error: "Le commentaire est vide." };
  await prisma.communityComment.create({
    data: { postId, schoolId: c.actor.schoolId, authorId: c.actor.userId, body: t },
  });
  // L'auteur de la publication est prévenu d'une réponse ; les personnes mentionnées aussi.
  const cible = await prisma.communityPost.findUnique({ where: { id: postId }, select: { audience: true, classId: true, channelId: true } });
  const espace = cible ? cleEspace(cible) : "ECOLE";
  if (post.authorId !== c.actor.userId) {
    const nomAuteur = await nomDe(c.actor.userId);
    await notifierPersonnes(c.actor.schoolId, [post.authorId], {
      title: `${nomAuteur} a répondu à votre publication`,
      body: t,
      suffixe: `?espace=${encodeURIComponent(espace)}#pub-${postId}`,
      tag: `rep-${postId}`,
      kind: "communaute.reponse",
    }).catch((e) => console.error("[communauté] notification impossible :", (e as Error).message));
  }
  await notifierMentions(c.actor, postId, mentions, t, espace, [post.authorId]);
  rafraichir();
  return { ok: true };
}

async function nomDe(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Quelqu'un";
}

export async function marquerLu(postId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const post = await postVisible(c.actor, c.p, postId);
  if (!post) return { ok: false, error: "Publication introuvable." };
  await prisma.communityRead.upsert({
    where: { postId_userId: { postId, userId: c.actor.userId } },
    update: {},
    create: { postId, userId: c.actor.userId },
  });
  rafraichir();
  return { ok: true };
}

/** Épingler : direction et secrétariat (ceux qui publient pour l'école). */
export async function epingler(postId: string, pinned: boolean): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  if (!peutPublier(c.actor, c.p, "ECOLE")) return { ok: false, error: "Action réservée à la direction." };
  const post = await postVisible(c.actor, c.p, postId);
  if (!post) return { ok: false, error: "Publication introuvable." };
  await prisma.communityPost.update({ where: { id: postId }, data: { pinned } });
  rafraichir();
  return { ok: true };
}

/** Modération : la direction masque (réversible), elle ne supprime pas. */
export async function masquerPublication(postId: string, masquer: boolean): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  if (!peutModerer(c.actor.role, c.p.grants)) return { ok: false, error: "Action réservée à la direction." };
  const post = await postVisible(c.actor, c.p, postId);
  if (!post) return { ok: false, error: "Publication introuvable." };
  await prisma.communityPost.update({
    where: { id: postId },
    data: masquer ? { hiddenAt: new Date(), hiddenBy: c.actor.userId } : { hiddenAt: null, hiddenBy: null },
  });
  rafraichir();
  return { ok: true };
}

/** L'auteur retire SA publication. */
export async function supprimerPublication(postId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const post = await postVisible(c.actor, c.p, postId);
  if (!post || post.authorId !== c.actor.userId) return { ok: false, error: "Seul l'auteur peut supprimer sa publication." };
  await prisma.communityPost.delete({ where: { id: postId } });
  rafraichir();
  return { ok: true };
}

export async function masquerCommentaire(commentId: string, masquer: boolean): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const com = await prisma.communityComment.findFirst({
    where: { id: commentId, schoolId: c.actor.schoolId },
    select: { id: true, authorId: true, postId: true },
  });
  if (!com || !(await postVisible(c.actor, c.p, com.postId))) return { ok: false, error: "Commentaire introuvable." };
  if (com.authorId === c.actor.userId && masquer) {
    // L'auteur retire son propre commentaire.
    await prisma.communityComment.delete({ where: { id: com.id } });
  } else if (peutModerer(c.actor.role, c.p.grants)) {
    await prisma.communityComment.update({
      where: { id: com.id },
      data: masquer ? { hiddenAt: new Date(), hiddenBy: c.actor.userId } : { hiddenAt: null, hiddenBy: null },
    });
  } else {
    return { ok: false, error: "Action réservée à la direction." };
  }
  rafraichir();
  return { ok: true };
}

/** Signalement à la direction (notification aux OWNER / ADMIN). */
export async function signaler(cible: { postId?: string; commentId?: string }, raison: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  let postId = cible.postId ?? null;
  const commentId = cible.commentId ?? null;
  if (commentId) {
    const com = await prisma.communityComment.findFirst({ where: { id: commentId, schoolId: c.actor.schoolId }, select: { postId: true } });
    if (!com) return { ok: false, error: "Commentaire introuvable." };
    postId = com.postId;
  }
  if (!postId || !(await postVisible(c.actor, c.p, postId))) return { ok: false, error: "Publication introuvable." };
  const motif = texte(raison, 500) || "Contenu inapproprié";
  await prisma.communityReport.create({
    data: { schoolId: c.actor.schoolId, postId: commentId ? null : postId, commentId, reporterId: c.actor.userId, reason: motif },
  });
  const direction = await prisma.user.findMany({
    where: { schoolId: c.actor.schoolId, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (direction.length) {
    await prisma.staffNotification.createMany({
      data: direction.map((d) => ({
        userId: d.id,
        schoolId: c.actor.schoolId,
        kind: "communaute.signalement",
        title: "Contenu signalé dans la Communauté",
        body: motif,
        link: `${CHEMIN_PERSONNEL}#pub-${postId}`,
      })),
    });
  }
  return { ok: true };
}

/* ═══════════════════════ Sondages ═══════════════════════ */

/**
 * Vote : remplace mes choix par `optionIds` (un seul si le sondage n'est pas à
 * choix multiples ; liste vide = retirer mon vote). Même visibilité que la
 * publication, qui est revérifiée.
 */
export async function voter(pollId: string, optionIds: string[]): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const poll = await prisma.communityPoll.findFirst({
    where: { id: typeof pollId === "string" ? pollId : "", post: { schoolId: c.actor.schoolId } },
    select: { id: true, postId: true, multiple: true, closesAt: true, options: { select: { id: true } } },
  });
  const post = poll ? await postVisible(c.actor, c.p, poll.postId) : null;
  if (!poll || !post || post.hiddenAt) return { ok: false, error: "Sondage introuvable." };
  if (poll.closesAt && poll.closesAt <= new Date()) return { ok: false, error: "Ce sondage est clos." };
  const valides = new Set(poll.options.map((o) => o.id));
  const choix = [...new Set(Array.isArray(optionIds) ? optionIds : [])].filter((id) => valides.has(id));
  if (!poll.multiple && choix.length > 1) return { ok: false, error: "Une seule réponse possible." };
  await prisma.$transaction([
    prisma.communityPollVote.deleteMany({ where: { pollId: poll.id, userId: c.actor.userId } }),
    ...(choix.length
      ? [prisma.communityPollVote.createMany({ data: choix.map((optionId) => ({ pollId: poll.id, optionId, userId: c.actor.userId })) })]
      : []),
  ]);
  rafraichir();
  return { ok: true };
}

/** Clore un sondage : son auteur ou la direction. Les votes restent visibles. */
export async function clore(pollId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const poll = await prisma.communityPoll.findFirst({
    where: { id: typeof pollId === "string" ? pollId : "", post: { schoolId: c.actor.schoolId } },
    select: { id: true, postId: true, post: { select: { authorId: true } } },
  });
  if (!poll || !(await postVisible(c.actor, c.p, poll.postId))) return { ok: false, error: "Sondage introuvable." };
  if (poll.post.authorId !== c.actor.userId && !peutModerer(c.actor.role, c.p.grants)) return { ok: false, error: "Seuls l'auteur et la direction closent un sondage." };
  await prisma.communityPoll.update({ where: { id: poll.id }, data: { closesAt: new Date() } });
  // Résultats annoncés aux destinataires et aux votants (une seule fois).
  await annoncerResultats(poll.id).catch((e) => console.error("[sondages] annonce des résultats :", (e as Error).message));
  rafraichir();
  return { ok: true };
}

/** Relance les destinataires qui n'ont pas encore voté : l'auteur ou la direction. */
export async function relancerSondage(pollId: string): Promise<{ ok: true; relances: number } | { ok: false; error: string }> {
  const c = await contexte();
  if (!c.ok) return c;
  const poll = await prisma.communityPoll.findFirst({
    where: { id: typeof pollId === "string" ? pollId : "", post: { schoolId: c.actor.schoolId } },
    select: { id: true, postId: true, closesAt: true, post: { select: { authorId: true } } },
  });
  if (!poll || !(await postVisible(c.actor, c.p, poll.postId))) return { ok: false, error: "Sondage introuvable." };
  if (poll.post.authorId !== c.actor.userId && !peutModerer(c.actor.role, c.p.grants)) return { ok: false, error: "Seuls l'auteur et la direction relancent un sondage." };
  if (poll.closesAt && poll.closesAt <= new Date()) return { ok: false, error: "Ce sondage est clos." };
  const relances = await relancerNonVotants(poll.id, c.actor.schoolId);
  return { ok: true, relances };
}

/* ═══════════════════════ Canaux ═══════════════════════ */

type EntreeCanal = {
  name: string;
  description?: string;
  /** Règles « @ » (`lib/audience.ts`) : @tous-les-parents, @parents-CM2, @profs-CM2… */
  regles?: string[];
  membersCanPost?: boolean;
  memberIds?: string[];
};

/** Règles valides, et dont les classes appartiennent bien à l'école. */
async function reglesValides(schoolId: string, regles: unknown): Promise<string[]> {
  const liste = [...new Set((Array.isArray(regles) ? regles : []).filter(regleValide))].slice(0, 60);
  const classes = liste.filter((r) => r.startsWith("PARENTS_CLASSE:") || r.startsWith("PROFS_CLASSE:")).map((r) => r.split(":")[1]);
  if (!classes.length) return liste;
  const connues = new Set(
    (await prisma.class.findMany({ where: { schoolId, id: { in: classes } }, select: { id: true } })).map((c) => c.id),
  );
  return liste.filter((r) => !r.includes("CLASSE:") || connues.has(r.split(":")[1]));
}

/** Nom de canal façon Slack : minuscules, tirets, 40 caractères. */
function nomCanal(v: unknown) {
  return (typeof v === "string" ? v : "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function membresValides(schoolId: string, ids: unknown): Promise<string[]> {
  const liste = Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string"))].slice(0, 500) : [];
  if (!liste.length) return [];
  const users = await prisma.user.findMany({ where: { id: { in: liste }, schoolId }, select: { id: true } });
  return users.map((u) => u.id);
}

export async function creerCanal(input: EntreeCanal): Promise<{ ok: true; espace: string } | { ok: false; error: string }> {
  const c = await contexte();
  if (!c.ok) return c;
  if (!peutGererCanaux(c.actor.role)) return { ok: false, error: "Seules la direction et le secrétariat créent des canaux." };
  const name = nomCanal(input.name);
  if (name.length < 2) return { ok: false, error: "Donnez un nom au canal (2 caractères au moins)." };
  if (name === "général" || name === "general") return { ok: false, error: "« général » existe déjà : c'est le canal de toute l'école." };
  const deja = await prisma.communityChannel.findFirst({ where: { schoolId: c.actor.schoolId, name }, select: { archivedAt: true } });
  if (deja) return { ok: false, error: deja.archivedAt ? `Un canal archivé s'appelle déjà « ${name} ».` : `Le canal « ${name} » existe déjà.` };
  const [membres, regles] = await Promise.all([
    membresValides(c.actor.schoolId, input.memberIds),
    reglesValides(c.actor.schoolId, input.regles),
  ]);
  const canal = await prisma.communityChannel.create({
    data: {
      schoolId: c.actor.schoolId,
      name,
      description: texte(input.description, 300) || null,
      // Aucune règle ni personne : canal privé (créateur + direction). Rien n'est public par erreur.
      kind: "REGLES",
      audience: regles,
      membersCanPost: Boolean(input.membersCanPost),
      createdById: c.actor.userId,
      members: { create: [...new Set([c.actor.userId, ...membres])].map((userId) => ({ userId })) },
    },
    select: { id: true },
  });
  rafraichir();
  return { ok: true, espace: `canal:${canal.id}` };
}

export async function modifierCanal(channelId: string, input: EntreeCanal): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  if (!peutGererCanaux(c.actor.role)) return { ok: false, error: "Action réservée à la direction et au secrétariat." };
  const canal = await prisma.communityChannel.findFirst({ where: { id: channelId, schoolId: c.actor.schoolId, archivedAt: null }, select: { id: true, kind: true } });
  if (!canal) return { ok: false, error: "Canal introuvable." };
  const name = nomCanal(input.name);
  if (name.length < 2) return { ok: false, error: "Donnez un nom au canal (2 caractères au moins)." };
  const homonyme = await prisma.communityChannel.findFirst({ where: { schoolId: c.actor.schoolId, name, NOT: { id: channelId } }, select: { id: true } });
  if (homonyme) return { ok: false, error: `Le canal « ${name} » existe déjà.` };
  const [membres, regles] = await Promise.all([
    membresValides(c.actor.schoolId, input.memberIds),
    reglesValides(c.actor.schoolId, input.regles),
  ]);
  // Tout canal modifié passe au modèle « @ » (les anciens types sont traduits à l'ouverture du formulaire).
  await prisma.$transaction([
    prisma.communityChannel.update({
      where: { id: channelId },
      data: {
        name,
        description: texte(input.description, 300) || null,
        kind: "REGLES",
        audience: regles,
        membersCanPost: Boolean(input.membersCanPost),
      },
    }),
    prisma.communityChannelMember.deleteMany({ where: { channelId, userId: { notIn: [...membres, c.actor.userId] } } }),
    prisma.communityChannelMember.createMany({
      data: [...new Set([c.actor.userId, ...membres])].map((userId) => ({ channelId, userId })),
      skipDuplicates: true,
    }),
  ]);
  rafraichir();
  return { ok: true };
}

/** Archiver : le canal disparaît des listes ; rien n'est effacé (réversible en base). */
export async function archiverCanal(channelId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  if (!peutGererCanaux(c.actor.role)) return { ok: false, error: "Action réservée à la direction et au secrétariat." };
  const r = await prisma.communityChannel.updateMany({
    where: { id: channelId, schoolId: c.actor.schoolId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (!r.count) return { ok: false, error: "Canal introuvable." };
  rafraichir();
  return { ok: true };
}

/* ═══════════════════════ Notifications push ═══════════════════════ */

/** Enregistre l'appareil de l'utilisateur pour recevoir les notifications. */
export async function enregistrerAbonnementPush(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return { ok: false, error: "Abonnement invalide." };
  const p256dh = String(sub.keys?.p256dh ?? "").slice(0, 200);
  const auth = String(sub.keys?.auth ?? "").slice(0, 100);
  if (!p256dh || !auth) return { ok: false, error: "Abonnement invalide." };
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: c.actor.userId, schoolId: c.actor.schoolId, p256dh, auth },
    create: {
      endpoint,
      userId: c.actor.userId,
      schoolId: c.actor.schoolId,
      p256dh,
      auth,
      userAgent: sub.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { ok: true };
}

export async function supprimerAbonnementPush(endpoint: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: c.actor.userId } });
  return { ok: true };
}
