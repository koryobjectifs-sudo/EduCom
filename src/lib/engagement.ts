import { prisma } from "@/lib/prisma";
import { acteurPeut } from "@/lib/grants";
import type { ActorContext } from "@/lib/audit";
import { roleLabel } from "@/lib/permissions";
import { reglesDuCanal, resoudreAudience } from "@/lib/audience";
import { cleEspace } from "@/lib/community";

/**
 * Engagement — 26 sept. 2026 (« qui a vu, qui a lu, qui a voté »).
 *
 * « Vu » : la personne a ouvert l'espace de la publication (ou le fil
 * d'actualité) APRÈS sa parution — `CommunitySpaceRead`, déjà tenu pour les
 * pastilles « non lu ». Aucune écriture de plus à chaque affichage.
 * « Lu » : bouton « J'ai lu » des annonces à lire obligatoirement.
 *
 * Réservé à l'auteur de la publication et à la direction : un parent ne voit
 * jamais qui d'autre a vu ou voté.
 */
const DIRECTION = ["OWNER", "ADMIN"];
const nom = (u?: { firstName: string | null; lastName: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" : "—";

export type PostCible = { id: string; schoolId: string; authorId: string; audience: string; classId: string | null; channelId: string | null; createdAt: Date };

/** Personnes à qui s'adresse la publication (hors auteur). */
export async function destinatairesPublication(p: PostCible): Promise<string[]> {
  let ids: string[] = [];
  if (p.audience === "CANAL" && p.channelId) {
    const c = await prisma.communityChannel.findFirst({
      where: { id: p.channelId, schoolId: p.schoolId },
      select: { kind: true, audience: true, members: { select: { userId: true } } },
    });
    if (c) {
      const a = await resoudreAudience(p.schoolId, reglesDuCanal(c), c.members.map((m) => m.userId));
      ids = [...a.parents, ...a.personnel];
    }
  } else if (p.audience === "CLASSE" && p.classId) {
    const a = await resoudreAudience(p.schoolId, [`PARENTS_CLASSE:${p.classId}`, `PROFS_CLASSE:${p.classId}`], []);
    ids = [...a.parents, ...a.personnel];
  } else {
    const a = await resoudreAudience(p.schoolId, ["PARENTS", "PERSONNEL"], []);
    ids = [...a.parents, ...a.personnel];
  }
  return [...new Set(ids)].filter((id) => id !== p.authorId);
}

async function vusParmi(p: PostCible, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const lectures = await prisma.communitySpaceRead.findMany({
    where: { schoolId: p.schoolId, userId: { in: ids }, espace: { in: [cleEspace(p), "FIL"] }, lastReadAt: { gte: p.createdAt } },
    select: { userId: true },
  });
  return new Set(lectures.map((l) => l.userId));
}

export type EngagementPublication = {
  destinataires: number;
  vus: number;
  lus: number | null;
  reactions: number;
  reponses: number;
  votants: number | null;
  pasVus: { nom: string; detail: string }[];
};

export async function engagementPublication(actor: ActorContext, postId: string): Promise<EngagementPublication | null> {
  const p = await prisma.communityPost.findFirst({
    where: { id: postId, schoolId: actor.schoolId },
    select: {
      id: true,
      schoolId: true,
      authorId: true,
      audience: true,
      classId: true,
      channelId: true,
      createdAt: true,
      mustRead: true,
      _count: { select: { reactions: true, comments: true, reads: true } },
      poll: { select: { votes: { select: { userId: true } } } },
    },
  });
  if (!p || (p.authorId !== actor.userId && !DIRECTION.includes(actor.role) && !(await acteurPeut(actor, "MODERER")))) return null;
  const ids = await destinatairesPublication(p);
  const vus = await vusParmi(p, ids);
  const manquants = ids.filter((id) => !vus.has(id)).slice(0, 300);
  const users = await prisma.user.findMany({ where: { id: { in: manquants } }, select: { firstName: true, lastName: true, role: true } });
  return {
    destinataires: ids.length,
    vus: vus.size,
    lus: p.mustRead ? p._count.reads : null,
    reactions: p._count.reactions,
    reponses: p._count.comments,
    votants: p.poll ? new Set(p.poll.votes.map((v) => v.userId)).size : null,
    pasVus: users.map((u) => ({ nom: nom(u), detail: roleLabel(u.role) })).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
  };
}

export type TableauEngagement = {
  publications: {
    id: string;
    extrait: string;
    espace: string;
    date: string;
    destinataires: number;
    vus: number;
    reactions: number;
    reponses: number;
  }[];
  parents: { total: number; actifs30j: number; notifications: number; inactifs: { nom: string; enfants: string }[] };
  formulaires: { titre: string; reponses: number; destinataires: number }[];
};

/** Tableau de bord de la direction : 20 dernières publications, parents inactifs, formulaires. */
export async function tableauEngagement(actor: ActorContext): Promise<TableauEngagement | null> {
  if (!DIRECTION.includes(actor.role) && !(await acteurPeut(actor, "MODERER"))) return null;
  const depuis = new Date(Date.now() - 30 * 86400_000);
  const [posts, eleves, actifs, abonnes, forms] = await Promise.all([
    prisma.communityPost.findMany({
      where: { schoolId: actor.schoolId, hiddenAt: null, createdAt: { lte: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        schoolId: true,
        authorId: true,
        audience: true,
        classId: true,
        channelId: true,
        createdAt: true,
        body: true,
        class: { select: { name: true } },
        channel: { select: { name: true } },
        poll: { select: { question: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    }),
    prisma.student.findMany({
      where: { schoolId: actor.schoolId, parentId: { not: null } },
      select: { firstName: true, parent: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.communitySpaceRead.findMany({ where: { schoolId: actor.schoolId, lastReadAt: { gte: depuis } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.pushSubscription.findMany({ where: { schoolId: actor.schoolId }, select: { userId: true }, distinct: ["userId"] }),
    prisma.communityForm.findMany({
      where: { schoolId: actor.schoolId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { title: true, _count: { select: { responses: true, recipients: true } } },
    }),
  ]);

  const publications = await Promise.all(
    posts.map(async (p) => {
      const ids = await destinatairesPublication(p);
      const vus = await vusParmi(p, ids);
      return {
        id: p.id,
        extrait: (p.body || (p.poll ? `📊 ${p.poll.question}` : "📷 Photo")).slice(0, 90),
        espace: p.audience === "CLASSE" ? p.class?.name ?? "classe" : p.audience === "CANAL" ? `#${p.channel?.name ?? "canal"}` : "#général",
        date: p.createdAt.toISOString(),
        destinataires: ids.length,
        vus: vus.size,
        reactions: p._count.reactions,
        reponses: p._count.comments,
      };
    }),
  );

  const parParent = new Map<string, { nom: string; enfants: string[] }>();
  for (const e of eleves) {
    if (!e.parent) continue;
    const x = parParent.get(e.parent.id) ?? { nom: nom(e.parent), enfants: [] };
    x.enfants.push(e.firstName);
    parParent.set(e.parent.id, x);
  }
  const actifsSet = new Set(actifs.map((a) => a.userId));
  const abonnesSet = new Set(abonnes.map((a) => a.userId));
  const inactifs = [...parParent.entries()]
    .filter(([id]) => !actifsSet.has(id))
    .map(([, v]) => ({ nom: v.nom, enfants: v.enfants.join(", ") }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return {
    publications,
    parents: {
      total: parParent.size,
      actifs30j: [...parParent.keys()].filter((id) => actifsSet.has(id)).length,
      notifications: [...parParent.keys()].filter((id) => abonnesSet.has(id)).length,
      inactifs: inactifs.slice(0, 300),
    },
    formulaires: forms.map((f) => ({ titre: f.title, reponses: f._count.responses, destinataires: f._count.recipients })),
  };
}
