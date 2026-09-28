import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import { roleLabel } from "@/lib/permissions";
import { signerMedias, type MediaVue } from "@/lib/communityMedia";
import type { Perimetre } from "@/lib/community";

/**
 * Messagerie privée de la Communauté — phase 3, 25 sept. 2026.
 * « Notre propre WhatsApp » (Kory), sans API tierce.
 *
 * ═══ RÈGLES (seule autorité) ═══
 * Une conversation = UN parent + UN service de l'école, à propos d'UN de ses
 * enfants. Côté école, boîte d'équipe :
 *   DIRECTION     → OWNER, ADMIN (qui voient aussi TOUTES les conversations)
 *   SECRETARIAT   → SECRETARY, ASSISTANT
 *   COMPTABILITE  → ACCOUNTANT
 *   ENSEIGNANT    → TEACHER, uniquement pour les classes qu'il couvre
 * Le parent ne voit que SES conversations. Aucun parent ↔ parent.
 *
 * 26 sept. 2026 — messages ENTRE MEMBRES DU PERSONNEL (kind « EQUIPE ») :
 * deux personnes, et elles seules. Même la direction ne les voit pas
 * (demande de Kory : « chaque métier ne voit que ce qui le concerne »).
 * Les élèves ne sont jamais destinataires : EduCom n'a pas de rôle élève.
 */
export const CANAUX = [
  { id: "ENSEIGNANT", label: "Enseignant de la classe" },
  { id: "SECRETARIAT", label: "Secrétariat" },
  { id: "COMPTABILITE", label: "Comptabilité" },
  { id: "DIRECTION", label: "Direction" },
] as const;
export type Canal = (typeof CANAUX)[number]["id"];
export const libelleCanal = (c: string) => CANAUX.find((x) => x.id === c)?.label ?? c;

/** Canal que représente un membre du personnel quand il écrit. */
export function canalDuRole(role: string): Canal | null {
  if (role === "OWNER" || role === "ADMIN") return "DIRECTION";
  if (role === "SECRETARY" || role === "ASSISTANT") return "SECRETARIAT";
  if (role === "ACCOUNTANT") return "COMPTABILITE";
  if (role === "TEACHER") return "ENSEIGNANT";
  return null;
}

const ROLES_PERSONNEL = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "TEACHER"];
export const estPersonnel = (role: string) => ROLES_PERSONNEL.includes(role);

export function filtreConversations(actor: ActorContext, p: Perimetre): Prisma.CommunityConversationWhereInput {
  const base = { schoolId: actor.schoolId };
  // Mes conversations privées avec un collègue — jamais celles des autres.
  const equipe: Prisma.CommunityConversationWhereInput = {
    kind: "EQUIPE",
    OR: [{ userAId: actor.userId }, { userBId: actor.userId }],
  };
  switch (actor.role) {
    case "PARENT":
      return { ...base, kind: "FAMILLE", parentId: actor.userId };
    case "OWNER":
    case "ADMIN":
      return { ...base, OR: [{ kind: "FAMILLE" }, equipe] };
    case "SECRETARY":
    case "ASSISTANT":
      return { ...base, OR: [{ kind: "FAMILLE", canal: "SECRETARIAT" }, equipe] };
    case "ACCOUNTANT":
      return { ...base, OR: [{ kind: "FAMILLE", canal: "COMPTABILITE" }, equipe] };
    case "TEACHER":
      return { ...base, OR: [{ kind: "FAMILLE", canal: "ENSEIGNANT", classId: { in: p.classIds } }, equipe] };
    default:
      return { id: "__aucun__" };
  }
}

export async function conversationVisible(actor: ActorContext, p: Perimetre, id: string) {
  return prisma.communityConversation.findFirst({
    where: { AND: [{ id }, filtreConversations(actor, p)] },
    select: { id: true, kind: true, parentId: true, canal: true, classId: true, studentId: true, userAId: true, userBId: true },
  });
}

const nom = (u?: { firstName: string | null; lastName: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" : "—";

export type ConversationResume = {
  id: string;
  kind: "FAMILLE" | "EQUIPE";
  titre: string;
  sousTitre: string;
  canal: string;
  apercu: string;
  dernierMessage: string;
  nonLus: number;
  avatar?: string | null;
};

export async function listerConversations(actor: ActorContext, p: Perimetre): Promise<ConversationResume[]> {
  const convs = await prisma.communityConversation.findMany({
    where: filtreConversations(actor, p),
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      reads: { where: { userId: actor.userId }, select: { lastReadAt: true } },
      messages: { where: { createdAt: { lte: new Date() } }, orderBy: { createdAt: "desc" }, take: 1, select: { body: true, authorId: true, deletedAt: true, _count: { select: { medias: true } } } },
    },
  });
  if (convs.length === 0) return [];

  const idsEleves = [...new Set(convs.map((c) => c.studentId).filter((x): x is string => Boolean(x)))];
  const idsPersonnes = [
    ...new Set(convs.flatMap((c) => [c.parentId, c.userAId, c.userBId]).filter((x): x is string => Boolean(x))),
  ];
  const [eleves, personnes, nonLus] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: idsEleves }, schoolId: actor.schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        enrollments: { select: { class: { select: { name: true } } }, orderBy: { academicYear: "desc" }, take: 1 },
      },
    }),
    prisma.user.findMany({
      where: { id: { in: idsPersonnes } },
      select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
    }),
    // Non lus : messages des autres, postérieurs à ma dernière lecture — un seul aller-retour.
    prisma.$transaction(
      convs.map((c) =>
        prisma.communityMessage.count({
          where: {
            conversationId: c.id,
            authorId: { not: actor.userId },
            deletedAt: null,
            createdAt: { ...(c.reads[0] ? { gt: c.reads[0].lastReadAt } : {}), lte: new Date() },
          },
        }),
      ),
    ),
  ]);
  const eleve = new Map(eleves.map((e) => [e.id, e]));
  const personne = new Map(personnes.map((u) => [u.id, u]));

  return convs.map((c, i) => {
    const dernier = c.messages[0];
    const apercu = !dernier
      ? "Nouvelle discussion"
      : dernier.deletedAt
        ? "Message supprimé"
        : dernier.body || (dernier._count.medias ? "📎 Pièce jointe" : "");
    let titre: string;
    let sousTitre: string;
    let avatar: string | null = null;
    if (c.kind === "EQUIPE") {
      const autre = personne.get(c.userAId === actor.userId ? c.userBId ?? "" : c.userAId ?? "");
      titre = nom(autre);
      sousTitre = `${autre ? roleLabel(autre.role) : "Équipe"} · privé`;
      avatar = autre?.avatar ?? null;
    } else {
      const e = c.studentId ? eleve.get(c.studentId) : undefined;
      const enfant = e ? `${nom(e)}${e.enrollments[0]?.class?.name ? ` (${e.enrollments[0].class.name})` : ""}` : "—";
      if (actor.role === "PARENT") {
        titre = libelleCanal(c.canal);
        sousTitre = `À propos de ${enfant}`;
      } else {
        const p = c.parentId ? personne.get(c.parentId) : null;
        titre = nom(p);
        sousTitre = `${enfant} · ${libelleCanal(c.canal)}`;
        avatar = p?.avatar ?? null;
      }
    }
    return {
      id: c.id,
      kind: c.kind === "EQUIPE" ? ("EQUIPE" as const) : ("FAMILLE" as const),
      titre,
      sousTitre,
      canal: c.canal,
      apercu: `${dernier && dernier.authorId === actor.userId ? "Vous : " : ""}${apercu}`.slice(0, 120),
      dernierMessage: c.lastMessageAt.toISOString(),
      nonLus: nonLus[i],
      avatar,
    };
  });
}

export type MessageVue = {
  id: string;
  body: string;
  auteur: string;
  auteurAvatar?: string | null;
  role: string;
  estAMoi: boolean;
  supprime: boolean;
  createdAt: string;
  medias: MediaVue[];
  /** Arrivé depuis ma dernière lecture (ligne « Nouveaux messages »). */
  nonLu: boolean;
  modifie: boolean;
  /** Programmé et pas encore paru (visible de l'auteur seul) : heure de parution. */
  programme: string | null;
};

export async function chargerMessages(actor: ActorContext, conversationId: string): Promise<MessageVue[]> {
  const msgs = await prisma.communityMessage.findMany({
    // Programmés : visibles de leur seul auteur avant l'heure dite.
    where: { conversationId, schoolId: actor.schoolId, OR: [{ createdAt: { lte: new Date() } }, { authorId: actor.userId }] },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      medias: {
        orderBy: { position: "asc" },
        select: { id: true, kind: true, storagePath: true, mime: true, width: true, height: true, fileName: true },
      },
    },
  });
  msgs.reverse();
  const auteurs = await prisma.user.findMany({
    where: { id: { in: [...new Set(msgs.map((m) => m.authorId))] } },
    select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
  });
  const parAuteur = new Map(auteurs.map((a) => [a.id, a]));
  const signes = await signerMedias(msgs.filter((m) => !m.deletedAt).flatMap((m) => m.medias));

  // Lecture : la conversation est lue jusqu'à maintenant (on garde la lecture précédente pour la ligne « Nouveaux »).
  const avant = await prisma.communityConversationRead.findUnique({
    where: { conversationId_userId: { conversationId, userId: actor.userId } },
    select: { lastReadAt: true },
  });
  await prisma.communityConversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId: actor.userId } },
    update: { lastReadAt: new Date() },
    create: { conversationId, userId: actor.userId },
  });

  return msgs.map((m) => {
    const a = parAuteur.get(m.authorId);
    return {
      id: m.id,
      body: m.deletedAt ? "" : m.body,
      auteur: nom(a),
      auteurAvatar: a?.avatar ?? null,
      role: a ? roleLabel(a.role) : "",
      estAMoi: m.authorId === actor.userId,
      supprime: Boolean(m.deletedAt),
      createdAt: m.createdAt.toISOString(),
      medias: m.deletedAt ? [] : m.medias.map((x) => signes.get(x.id)).filter((x): x is MediaVue => Boolean(x)),
      nonLu: Boolean(avant && m.authorId !== actor.userId && m.createdAt > avant.lastReadAt),
      modifie: Boolean(m.editedAt) && !m.deletedAt,
      programme: m.createdAt > new Date() ? m.createdAt.toISOString() : null,
    };
  });
}

/** Total des messages non lus (pastille de navigation). */
export async function totalNonLus(actor: ActorContext, p: Perimetre): Promise<number> {
  const liste = await listerConversations(actor, p);
  return liste.reduce((t, c) => t + c.nonLus, 0);
}

/** Collègues à qui écrire en privé : le personnel de l'école, sauf soi-même. */
export async function collegues(actor: ActorContext) {
  if (!estPersonnel(actor.role)) return [];
  const users = await prisma.user.findMany({
    where: { schoolId: actor.schoolId, role: { in: ROLES_PERSONNEL as never[] }, id: { not: actor.userId } },
    select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
  });
  return users.map((u) => ({ id: u.id, nom: nom(u), role: roleLabel(u.role), avatar: u.avatar ?? null }));
}

/**
 * Élèves avec qui l'acteur peut ouvrir une discussion (leur parent) :
 *  - parent : ses enfants ;
 *  - enseignant : élèves de ses classes ;
 *  - autre personnel : tous les élèves ayant un parent rattaché.
 */
export async function elevesJoignables(actor: ActorContext, p: Perimetre) {
  const where: Prisma.StudentWhereInput =
    actor.role === "PARENT"
      ? { schoolId: actor.schoolId, parentId: actor.userId }
      : actor.role === "TEACHER"
        ? { schoolId: actor.schoolId, parentId: { not: null }, enrollments: { some: { classId: { in: p.classIds } } } }
        : { schoolId: actor.schoolId, parentId: { not: null } };
  const eleves = await prisma.student.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: { select: { class: { select: { name: true } } }, orderBy: { academicYear: "desc" }, take: 1 },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 1000,
  });
  return eleves.map((e) => ({
    id: e.id,
    nom: `${e.firstName} ${e.lastName}`,
    classe: e.enrollments[0]?.class?.name ?? "",
  }));
}
