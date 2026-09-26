"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { hasAccess } from "@/lib/permissions";
import { perimetre } from "@/lib/community";
import { mediasRattachables } from "@/lib/communityMedia";
import { CANAUX, canalDuRole, conversationVisible, estPersonnel, type Canal } from "@/lib/messagerie";
import { notifierNouveauMessage } from "@/lib/notifications";
import { dateProgrammation, publierProgrammesEchus } from "@/lib/programmes";

/**
 * Messagerie privée — actions (personnel et familles). 25 sept. 2026.
 * Chaque identifiant reçu est revérifié contre `lib/messagerie.ts`.
 */
// 26 sept. 2026 : discussions et canaux vivent sur une seule page (refonte façon Slack).
const CHEMIN_PERSONNEL = "/dashboard/communications/communaute";
const CHEMIN_FAMILLE = "/famille/communaute";
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function contexte() {
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const { userId, schoolId, role } = auth.ctx;
  if (role !== "PARENT" && !hasAccess(role, CHEMIN_PERSONNEL)) {
    return { ok: false as const, error: "Vous n'avez pas accès à la messagerie." };
  }
  const actor = { userId, schoolId, role };
  return { ok: true as const, actor, p: await perimetre(actor) };
}

function rafraichir() {
  revalidatePath(CHEMIN_PERSONNEL);
  revalidatePath(CHEMIN_FAMILLE);
}

/**
 * Ouvre (ou retrouve) une discussion :
 *  - avec un service de l'école, à propos d'un élève (`studentId`) ;
 *  - entre deux membres du personnel (`collegueId`) — privée, même pour la direction.
 */
export async function ouvrirDiscussion(input: { studentId?: string; canal?: string; collegueId?: string }): Promise<R<{ id: string }>> {
  const c = await contexte();
  if (!c.ok) return c;
  const { actor, p } = c;

  if (input.collegueId) {
    if (!estPersonnel(actor.role)) return { ok: false, error: "Les messages entre collègues sont réservés au personnel." };
    if (input.collegueId === actor.userId) return { ok: false, error: "Choisissez un collègue." };
    const collegue = await prisma.user.findFirst({
      where: { id: input.collegueId, schoolId: actor.schoolId },
      select: { id: true, role: true },
    });
    if (!collegue || !estPersonnel(collegue.role)) return { ok: false, error: "Collègue introuvable." };
    const [userAId, userBId] = [actor.userId, collegue.id].sort();
    const existante = await prisma.communityConversation.findFirst({
      where: { schoolId: actor.schoolId, kind: "EQUIPE", userAId, userBId },
      select: { id: true },
    });
    if (existante) return { ok: true, id: existante.id };
    try {
      const conv = await prisma.communityConversation.create({
        data: { schoolId: actor.schoolId, kind: "EQUIPE", canal: "EQUIPE", userAId, userBId },
        select: { id: true },
      });
      rafraichir();
      return { ok: true, id: conv.id };
    } catch {
      // Création simultanée (double clic) : l'index unique a tranché, on relit.
      const deja = await prisma.communityConversation.findFirst({
        where: { schoolId: actor.schoolId, kind: "EQUIPE", userAId, userBId },
        select: { id: true },
      });
      return deja ? { ok: true, id: deja.id } : { ok: false, error: "Ouverture impossible. Réessayez." };
    }
  }

  if (!input.studentId) return { ok: false, error: "Choisissez un élève." };

  const eleve = await prisma.student.findFirst({
    where: { id: input.studentId, schoolId: actor.schoolId },
    select: {
      id: true,
      parentId: true,
      enrollments: { select: { classId: true }, orderBy: { academicYear: "desc" }, take: 1 },
    },
  });
  if (!eleve) return { ok: false, error: "Élève introuvable." };
  const classId = eleve.enrollments[0]?.classId ?? null;

  let canal: Canal;
  if (actor.role === "PARENT") {
    if (eleve.parentId !== actor.userId) return { ok: false, error: "Élève introuvable." };
    if (!CANAUX.some((x) => x.id === input.canal)) return { ok: false, error: "Choisissez à qui écrire." };
    canal = input.canal as Canal;
    if (canal === "ENSEIGNANT" && !classId) return { ok: false, error: "Votre enfant n'est rattaché à aucune classe pour l'instant." };
  } else {
    const propre = canalDuRole(actor.role);
    if (!propre) return { ok: false, error: "Votre rôle ne permet pas d'écrire aux familles." };
    canal = propre;
    if (!eleve.parentId) return { ok: false, error: "Aucun parent n'est rattaché à cet élève." };
    if (actor.role === "TEACHER" && (!classId || !p.classIds.includes(classId))) {
      return { ok: false, error: "Cet élève n'est pas dans l'une de vos classes." };
    }
  }

  const conv = await prisma.communityConversation.upsert({
    where: {
      schoolId_parentId_studentId_canal: { schoolId: actor.schoolId, parentId: eleve.parentId!, studentId: eleve.id, canal },
    },
    update: canal === "ENSEIGNANT" ? { classId } : {},
    create: { schoolId: actor.schoolId, parentId: eleve.parentId!, studentId: eleve.id, canal, classId },
    select: { id: true },
  });
  rafraichir();
  return { ok: true, id: conv.id };
}

export async function envoyerMessage(conversationId: string, body: string, mediaIds: string[] = [], programmeLe: string | null = null): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const conv = await conversationVisible(c.actor, c.p, conversationId);
  if (!conv) return { ok: false, error: "Discussion introuvable." };
  const texte = typeof body === "string" ? body.trim().slice(0, 4000) : "";
  const ids = Array.isArray(mediaIds) ? mediaIds.filter((x) => typeof x === "string") : [];
  if (!texte && ids.length === 0) return { ok: false, error: "Le message est vide." };
  const rattachables = await mediasRattachables(c.actor, ids);
  if (rattachables === null) return { ok: false, error: "Un fichier n'a pas fini de s'envoyer. Réessayez." };
  const programme = programmeLe ? dateProgrammation(programmeLe) : null;
  if (programmeLe && !programme) return { ok: false, error: "Choisissez une heure dans le futur (60 jours au plus)." };

  const maintenant = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const m = await tx.communityMessage.create({
      data: {
        conversationId,
        schoolId: c.actor.schoolId,
        authorId: c.actor.userId,
        body: texte,
        // Programmé : paraît à l'heure dite (invisible pour l'autre personne avant).
        ...(programme ? { createdAt: programme, scheduledAt: maintenant } : {}),
      },
      select: { id: true },
    });
    for (const [i, id] of rattachables.entries()) {
      await tx.communityMedia.updateMany({
        where: { id, uploaderId: c.actor.userId, postId: null, messageId: null },
        data: { messageId: m.id, position: i },
      });
    }
    if (!programme) await tx.communityConversation.update({ where: { id: conversationId }, data: { lastMessageAt: maintenant } });
    await tx.communityConversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId: c.actor.userId } },
      update: { lastReadAt: maintenant },
      create: { conversationId, userId: c.actor.userId, lastReadAt: maintenant },
    });
    return m;
  });

  if (programme) {
    rafraichir();
    return { ok: true };
  }
  // Notification push aux destinataires (sans bloquer l'envoi si elle échoue).
  await notifierNouveauMessage(c.actor, conversationId, texte || "📎 Pièce jointe").catch((e) =>
    console.error("[messagerie] notification impossible :", (e as Error).message),
  );
  void message;
  rafraichir();
  return { ok: true };
}

/** L'auteur retire son message (« Message supprimé » reste visible). */
export async function supprimerMessage(messageId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const m = await prisma.communityMessage.findFirst({
    where: { id: messageId, schoolId: c.actor.schoolId, authorId: c.actor.userId, deletedAt: null },
    select: { id: true, conversationId: true },
  });
  if (!m || !(await conversationVisible(c.actor, c.p, m.conversationId))) return { ok: false, error: "Message introuvable." };
  await prisma.communityMessage.update({ where: { id: m.id }, data: { deletedAt: new Date() } });
  rafraichir();
  return { ok: true };
}

/** Modifier son message (l'auteur seulement). */
export async function modifierMessage(messageId: string, body: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const m = await prisma.communityMessage.findFirst({
    where: { id: typeof messageId === "string" ? messageId : "", schoolId: c.actor.schoolId, authorId: c.actor.userId, deletedAt: null },
    select: { id: true, conversationId: true, createdAt: true, _count: { select: { medias: true } } },
  });
  if (!m || !(await conversationVisible(c.actor, c.p, m.conversationId))) return { ok: false, error: "Message introuvable." };
  const texte = typeof body === "string" ? body.trim().slice(0, 4000) : "";
  if (!texte && !m._count.medias) return { ok: false, error: "Le message ne peut pas être vide." };
  await prisma.communityMessage.update({ where: { id: m.id }, data: { body: texte, ...(m.createdAt <= new Date() ? { editedAt: new Date() } : {}) } });
  rafraichir();
  return { ok: true };
}

/** Message programmé : changer l'heure, ou l'envoyer tout de suite (`quand` = null). */
export async function reprogrammerMessage(messageId: string, quand: string | null): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const m = await prisma.communityMessage.findFirst({
    where: { id: typeof messageId === "string" ? messageId : "", schoolId: c.actor.schoolId, authorId: c.actor.userId, deletedAt: null, scheduledAt: { not: null }, announcedAt: null },
    select: { id: true, conversationId: true, createdAt: true },
  });
  if (!m || m.createdAt <= new Date() || !(await conversationVisible(c.actor, c.p, m.conversationId))) return { ok: false, error: "Ce message n'est plus programmé." };
  const d = quand === null ? new Date() : dateProgrammation(quand);
  if (!d) return { ok: false, error: "Choisissez une heure dans le futur (60 jours au plus)." };
  await prisma.communityMessage.update({ where: { id: m.id }, data: { createdAt: d } });
  if (quand === null) await publierProgrammesEchus(c.actor.schoolId);
  rafraichir();
  return { ok: true };
}
