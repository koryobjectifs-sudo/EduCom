import { prisma } from "@/lib/prisma";
import { groupesMentionnables } from "@/lib/groupesMention";
import type { ActorContext } from "@/lib/audit";
import { teacherClassIds } from "@/lib/studentScope";
import { roleLabel } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";
import { signerMedias, type MediaVue } from "@/lib/communityMedia";
import { reglesDuCanal, regleConcerne, resoudreAudience, libelleRegle, type Regle } from "@/lib/audience";

/**
 * Communauté EduCom — règles d'accès. 25 sept. 2026 (« Product Change »).
 *
 * ═══ CE FICHIER EST LA SEULE AUTORITÉ SUR « QUI VOIT / QUI PUBLIE » ═══
 * Les écrans et les server actions l'appellent ; aucun ne décide seul.
 *
 *   Voit le fil de l'école : tout le monde dans l'établissement.
 *   Voit un espace de classe (« Parents par classe ») :
 *     - direction, secrétariat, assistant : toutes les classes ;
 *     - comptabilité : aucune (26 sept. 2026) ;
 *     - enseignant : SES classes (`teacherClassIds`, même règle que les notes) ;
 *     - parent : les classes de SES enfants (dernière inscription).
 *   Publie dans le fil de l'école : OWNER, ADMIN, SECRETARY.
 *   Publie dans une classe : OWNER, ADMIN, SECRETARY, ou l'ENSEIGNANT de la classe.
 *   Réagit / commente : quiconque voit la publication (si commentaires ouverts).
 *   Modère (masquer, voir le masqué, lire les signalements) : OWNER, ADMIN.
 *   Parent ↔ parent : aucun message direct (décision Kory).
 *
 *   Canaux (26 sept. 2026, refonte façon Slack) — `CommunityChannel.kind` :
 *     PARENTS   : vu par tout le personnel et tous les parents ;
 *     PERSONNEL : vu par le personnel uniquement ;
 *     MEMBRES   : vu par ses membres, son créateur et la direction.
 *   Crée / modifie / archive un canal : OWNER, ADMIN, SECRETARY.
 *   Publie dans un canal : OWNER, ADMIN, SECRETARY, son créateur ; les autres
 *   membres seulement si « les membres peuvent publier » est coché.
 *
 * ⚠️ Chaque requête commence par `schoolId` : l'isolation entre établissements
 * reste le premier verrou.
 */

export const REACTIONS = [
  { kind: "JAIME", emoji: "👍", label: "J'aime" },
  { kind: "BRAVO", emoji: "👏", label: "Bravo" },
  { kind: "MERCI", emoji: "🙏", label: "Merci" },
  { kind: "COEUR", emoji: "❤️", label: "J'adore" },
] as const;
export type TypeReaction = (typeof REACTIONS)[number]["kind"];

const TOUT_VOIR = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "ASSISTANT"];
const PUBLIE_ECOLE = ["OWNER", "ADMIN", "SECRETARY"];
const MODERE = ["OWNER", "ADMIN"];

/** "REGLES" : audience « à la @ » (26 sept. 2026, `lib/audience.ts`) ; les trois autres sont les anciens types. */
export type TypeCanal = "PARENTS" | "PERSONNEL" | "MEMBRES" | "REGLES";
export const TYPES_CANAL: { kind: TypeCanal; label: string; aide: string }[] = [
  { kind: "PARENTS", label: "Parents et école", aide: "Tous les parents et tout le personnel." },
  { kind: "PERSONNEL", label: "Personnel uniquement", aide: "L'équipe de l'école, sans les parents." },
  { kind: "MEMBRES", label: "Sur invitation", aide: "Seulement les personnes choisies (comité, APE…)." },
];

/** Canal accessible à l'acteur, avec ce qu'il faut pour décider s'il peut y publier. */
export type CanalAcces = {
  id: string;
  name: string;
  description: string | null;
  kind: TypeCanal;
  regles: Regle[];
  membersCanPost: boolean;
  createdById: string;
  estMembre: boolean;
};

export type Perimetre = { toutesClasses: boolean; classIds: string[]; canaux?: CanalAcces[] };

async function classesDuPerimetre(actor: ActorContext): Promise<Pick<Perimetre, "toutesClasses" | "classIds">> {
  // Comptabilité : pas d'espace de classe (devoirs, sorties, photos ne la
  // concernent pas) — « chaque métier ne voit que ce qui le concerne » (Kory, 26/09).
  if (actor.role === "ACCOUNTANT") return { toutesClasses: false, classIds: [] };
  if (TOUT_VOIR.includes(actor.role)) return { toutesClasses: true, classIds: [] };
  if (actor.role === "TEACHER") return { toutesClasses: false, classIds: await teacherClassIds(actor) };
  if (actor.role === "PARENT") {
    const enfants = await prisma.student.findMany({
      where: { schoolId: actor.schoolId, parentId: actor.userId },
      select: { enrollments: { select: { classId: true }, orderBy: { academicYear: "desc" }, take: 1 } },
    });
    const ids = enfants.map((e) => e.enrollments[0]?.classId).filter((x): x is string => Boolean(x));
    return { toutesClasses: false, classIds: [...new Set(ids)] };
  }
  return { toutesClasses: false, classIds: [] }; // rôle inconnu : fermé par défaut
}

/**
 * Un canal est-il visible ? (règle pure, testée sans base)
 * Membre nommé, créateur, direction (modération), ou une règle d'audience qui
 * le concerne. Un rôle inconnu (ou un futur rôle élève) ne correspond à aucune règle.
 * `classIds` : classes de ses enfants (parent) ou ses classes (enseignant).
 */
export function canalVisible(
  actor: ActorContext,
  c: Pick<CanalAcces, "kind" | "regles" | "createdById" | "estMembre">,
  classIds: string[] = [],
): boolean {
  if (c.estMembre || c.createdById === actor.userId || MODERE.includes(actor.role)) return true;
  return c.regles.some((r) => regleConcerne(r, actor.role, classIds));
}

async function canauxDuPerimetre(actor: ActorContext, classIds: string[]): Promise<CanalAcces[]> {
  const canaux = await prisma.communityChannel.findMany({
    where: { schoolId: actor.schoolId, archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      kind: true,
      audience: true,
      membersCanPost: true,
      createdById: true,
      members: { where: { userId: actor.userId }, select: { id: true } },
    },
  });
  return canaux
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      kind: (["PARENTS", "PERSONNEL", "MEMBRES", "REGLES"].includes(c.kind) ? c.kind : "MEMBRES") as TypeCanal,
      regles: reglesDuCanal(c),
      membersCanPost: c.membersCanPost,
      createdById: c.createdById,
      estMembre: c.members.length > 0,
    }))
    .filter((c) => canalVisible(actor, c, classIds));
}

export async function perimetre(actor: ActorContext): Promise<Perimetre> {
  const classes = await classesDuPerimetre(actor);
  return { ...classes, canaux: await canauxDuPerimetre(actor, classes.classIds) };
}

export const peutModerer = (role: string) => MODERE.includes(role);
export const peutGererCanaux = (role: string) => PUBLIE_ECOLE.includes(role);

export function peutPublier(
  actor: ActorContext,
  p: Perimetre,
  audience: "ECOLE" | "CLASSE" | "CANAL",
  cible?: string | null,
) {
  if (audience === "ECOLE") return PUBLIE_ECOLE.includes(actor.role);
  if (!cible) return false;
  if (audience === "CANAL") {
    const canal = (p.canaux ?? []).find((c) => c.id === cible);
    if (!canal) return false;
    if (PUBLIE_ECOLE.includes(actor.role) || canal.createdById === actor.userId) return true;
    if (!canal.membersCanPost) return false;
    return canal.kind === "MEMBRES" ? canal.estMembre : true;
  }
  if (PUBLIE_ECOLE.includes(actor.role)) return true;
  return actor.role === "TEACHER" && p.classIds.includes(cible);
}

/**
 * Clé d'espace — dans l'URL (`?espace=`) et dans `CommunitySpaceRead` :
 * "ECOLE", "classe:<id>" ou "canal:<id>". "" = le fil d'actualité (tout).
 * Un identifiant nu (anciens liens) est lu comme une classe.
 */
export function lireEspace(espace: string | null | undefined): { type: "TOUT" | "ECOLE" | "CLASSE" | "CANAL"; id: string | null } {
  if (!espace) return { type: "TOUT", id: null };
  if (espace === "ECOLE") return { type: "ECOLE", id: null };
  if (espace.startsWith("canal:")) return { type: "CANAL", id: espace.slice(6) };
  if (espace.startsWith("classe:")) return { type: "CLASSE", id: espace.slice(7) };
  return { type: "CLASSE", id: espace };
}

export const cleEspace = (post: { audience: string; classId: string | null; channelId?: string | null }) =>
  post.audience === "CLASSE" ? `classe:${post.classId}` : post.audience === "CANAL" ? `canal:${post.channelId}` : "ECOLE";

/**
 * Filtre Prisma des publications visibles par l'acteur (`espace` : voir `lireEspace`).
 * Messages programmés (26 sept. 2026) : invisibles avant leur heure (`createdAt`), sauf pour leur auteur.
 */
export function filtreVisible(actor: ActorContext, p: Perimetre, espace?: string | null): Prisma.CommunityPostWhereInput {
  const base = filtreEspace(actor, p, espace);
  if ("id" in base && base.id === "__aucun__") return base;
  return { AND: [base, { OR: [{ createdAt: { lte: new Date() } }, { authorId: actor.userId }] }] };
}

function filtreEspace(actor: ActorContext, p: Perimetre, espace?: string | null): Prisma.CommunityPostWhereInput {
  const masques = peutModerer(actor.role) ? {} : { hiddenAt: null };
  const canalIds = (p.canaux ?? []).map((c) => c.id);
  const classesAutorisees: Prisma.CommunityPostWhereInput = p.toutesClasses
    ? { audience: "CLASSE" }
    : { audience: "CLASSE", classId: { in: p.classIds } };
  const e = lireEspace(espace);

  if (e.type === "ECOLE") return { schoolId: actor.schoolId, ...masques, audience: "ECOLE" };
  if (e.type === "CLASSE") {
    if (!e.id || (!p.toutesClasses && !p.classIds.includes(e.id))) return { id: "__aucun__" };
    return { schoolId: actor.schoolId, ...masques, audience: "CLASSE", classId: e.id };
  }
  if (e.type === "CANAL") {
    if (!e.id || !canalIds.includes(e.id)) return { id: "__aucun__" };
    return { schoolId: actor.schoolId, ...masques, audience: "CANAL", channelId: e.id };
  }
  return {
    schoolId: actor.schoolId,
    ...masques,
    OR: [{ audience: "ECOLE" }, classesAutorisees, { audience: "CANAL", channelId: { in: canalIds } }],
  };
}

/** La publication existe-t-elle dans le périmètre de l'acteur ? (garde des actions) */
export async function postVisible(actor: ActorContext, p: Perimetre, postId: string) {
  return prisma.communityPost.findFirst({
    where: { AND: [{ id: postId }, filtreVisible(actor, p)] },
    select: { id: true, authorId: true, commentsEnabled: true, hiddenAt: true, schoolId: true },
  });
}

/* ═══════════════════════ Chargement du fil ═══════════════════════ */

export type CommentaireVue = {
  id: string;
  body: string;
  auteur: string;
  role: string;
  createdAt: string;
  masque: boolean;
  estAMoi: boolean;
};

export type PublicationVue = {
  id: string;
  body: string;
  audience: "ECOLE" | "CLASSE" | "CANAL";
  classe: string | null;
  /** Clé et nom de l'espace de publication (« général », classe ou canal). */
  espace: string;
  espaceNom: string;
  auteur: string;
  role: string;
  createdAt: string;
  pinned: boolean;
  mustRead: boolean;
  commentsEnabled: boolean;
  masque: boolean;
  reactions: Record<TypeReaction, number>;
  maReaction: TypeReaction | null;
  commentaires: CommentaireVue[];
  luParMoi: boolean;
  /** Publication de la personne connectée (pas de ligne « Nouveau » sur ses propres messages). */
  estAMoi: boolean;
  /** Texte modifié par son auteur après parution. */
  modifie: boolean;
  /** Programmé, pas encore paru (auteur seul) : heure de parution. */
  programme: string | null;
  /** Direction : « lu par X sur Y parents » pour les annonces obligatoires. */
  lecture: { lus: number; destinataires: number } | null;
  peutSupprimer: boolean;
  medias: MediaVue[];
  sondage: SondageVue | null;
};

/** Sondage tel qu'affiché : les noms des votants ne partent QUE vers le personnel, et jamais si le vote est anonyme. */
export type SondageVue = {
  id: string;
  question: string;
  multiple: boolean;
  anonyme: boolean;
  closesAt: string | null;
  clos: boolean;
  votants: number;
  mesChoix: string[];
  options: { id: string; label: string; votes: number; noms: string[] | null }[];
  peutClore: boolean;
};

const nom = (u: { firstName: string | null; lastName: string | null }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || "Membre de l'école";

async function nombreParents(schoolId: string, classId: string | null): Promise<number> {
  const eleves = await prisma.student.findMany({
    where: {
      schoolId,
      parentId: { not: null },
      ...(classId ? { enrollments: { some: { classId } } } : {}),
    },
    select: { parentId: true },
  });
  return new Set(eleves.map((e) => e.parentId)).size;
}

export async function chargerFil(
  actor: ActorContext,
  p: Perimetre,
  options: { espace?: string | null; limite?: number; sondagesSeulement?: boolean } = {},
): Promise<PublicationVue[]> {
  const moderateur = peutModerer(actor.role);
  const posts = await prisma.communityPost.findMany({
    where: options.sondagesSeulement
      ? { AND: [filtreVisible(actor, p), { poll: { isNot: null } }] }
      : filtreVisible(actor, p, options.espace),
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: options.limite ?? 30,
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
      class: { select: { name: true } },
      channel: { select: { name: true } },
      reactions: { select: { kind: true, userId: true } },
      reads: { where: { userId: actor.userId }, select: { id: true } },
      _count: { select: { reads: true } },
      medias: {
        orderBy: { position: "asc" },
        select: { id: true, kind: true, storagePath: true, mime: true, width: true, height: true, fileName: true },
      },
      comments: {
        where: moderateur ? {} : { hiddenAt: null },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { author: { select: { firstName: true, lastName: true, role: true } } },
      },
      poll: {
        include: {
          options: { orderBy: { position: "asc" }, select: { id: true, label: true } },
          votes: { select: { optionId: true, userId: true } },
        },
      },
    },
  });

  const signes = await signerMedias(posts.flatMap((p) => p.medias));

  // Noms des votants : personnel uniquement, sondages non anonymes uniquement.
  const voirNoms = actor.role !== "PARENT";
  const idsVotants = voirNoms
    ? [...new Set(posts.flatMap((x) => (x.poll && !x.poll.anonymous ? x.poll.votes.map((v) => v.userId) : [])))]
    : [];
  const votants = idsVotants.length
    ? new Map(
        (
          await prisma.user.findMany({ where: { id: { in: idsVotants } }, select: { id: true, firstName: true, lastName: true } })
        ).map((u) => [u.id, nom(u)]),
      )
    : new Map<string, string>();

  const sondageVue = (post: (typeof posts)[number]): SondageVue | null => {
    const poll = post.poll;
    if (!poll) return null;
    const clos = Boolean(poll.closesAt && poll.closesAt <= new Date());
    return {
      id: poll.id,
      question: poll.question,
      multiple: poll.multiple,
      anonyme: poll.anonymous,
      closesAt: poll.closesAt?.toISOString() ?? null,
      clos,
      votants: new Set(poll.votes.map((v) => v.userId)).size,
      mesChoix: poll.votes.filter((v) => v.userId === actor.userId).map((v) => v.optionId),
      options: poll.options.map((o) => {
        const votes = poll.votes.filter((v) => v.optionId === o.id);
        return {
          id: o.id,
          label: o.label,
          votes: votes.length,
          noms: voirNoms && !poll.anonymous ? votes.map((v) => votants.get(v.userId) ?? "Membre de l'école") : null,
        };
      }),
      peutClore: !clos && (moderateur || post.authorId === actor.userId),
    };
  };

  return Promise.all(
    posts.map(async (post) => {
      const reactions = Object.fromEntries(REACTIONS.map((r) => [r.kind, 0])) as Record<TypeReaction, number>;
      let maReaction: TypeReaction | null = null;
      for (const r of post.reactions) {
        if (r.kind in reactions) reactions[r.kind as TypeReaction]++;
        if (r.userId === actor.userId) maReaction = r.kind as TypeReaction;
      }
      const lecture =
        post.mustRead && actor.role !== "PARENT" && post.audience !== "CANAL"
          ? { lus: post._count.reads, destinataires: await nombreParents(actor.schoolId, post.classId) }
          : null;
      return {
        id: post.id,
        body: post.body,
        audience: post.audience === "CLASSE" ? "CLASSE" : post.audience === "CANAL" ? "CANAL" : "ECOLE",
        classe: post.class?.name ?? null,
        espace: cleEspace(post),
        espaceNom:
          post.audience === "CLASSE" ? post.class?.name ?? "Classe" : post.audience === "CANAL" ? post.channel?.name ?? "Canal" : "général",
        auteur: nom(post.author),
        role: roleLabel(post.author.role),
        createdAt: post.createdAt.toISOString(),
        pinned: post.pinned,
        mustRead: post.mustRead,
        commentsEnabled: post.commentsEnabled,
        masque: Boolean(post.hiddenAt),
        reactions,
        maReaction,
        commentaires: post.comments.map((c) => ({
          id: c.id,
          body: c.body,
          auteur: nom(c.author),
          role: roleLabel(c.author.role),
          createdAt: c.createdAt.toISOString(),
          masque: Boolean(c.hiddenAt),
          estAMoi: c.authorId === actor.userId,
        })),
        luParMoi: post.reads.length > 0,
        lecture,
        peutSupprimer: moderateur || post.authorId === actor.userId,
        estAMoi: post.authorId === actor.userId,
        modifie: Boolean(post.editedAt),
        programme: post.createdAt > new Date() ? post.createdAt.toISOString() : null,
        medias: post.medias.map((m) => signes.get(m.id)).filter((m): m is MediaVue => Boolean(m)),
        sondage: sondageVue(post),
      } satisfies PublicationVue;
    }),
  );
}

/* ═══════════════════════ Barre latérale ═══════════════════════ */

export type EspaceVue = {
  cle: string;
  nom: string;
  type: "ECOLE" | "CLASSE" | "CANAL";
  kind: TypeCanal | null;
  description: string | null;
  peutPublier: boolean;
  nonLus: number;
};

export type BarreLaterale = {
  general: EspaceVue;
  classes: EspaceVue[];
  canaux: EspaceVue[];
  gererCanaux: boolean;
};

/** Publications non lues par espace (hors les miennes), depuis ma dernière visite. */
async function nonLusParEspace(actor: ActorContext, p: Perimetre): Promise<Map<string, number>> {
  const depuis = new Date(Date.now() - 30 * 86400_000);
  const [posts, lus] = await Promise.all([
    prisma.communityPost.findMany({
      where: { AND: [filtreVisible(actor, p), { createdAt: { gt: depuis }, authorId: { not: actor.userId }, hiddenAt: null }] },
      select: { audience: true, classId: true, channelId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.communitySpaceRead.findMany({
      where: { userId: actor.userId, schoolId: actor.schoolId },
      select: { espace: true, lastReadAt: true },
    }),
  ]);
  const vu = new Map(lus.map((l) => [l.espace, l.lastReadAt]));
  // Premier passage : seules les publications de la dernière semaine comptent.
  const parDefaut = new Date(Date.now() - 7 * 86400_000);
  const n = new Map<string, number>();
  for (const post of posts) {
    const cle = cleEspace(post);
    if (post.createdAt > (vu.get(cle) ?? parDefaut)) n.set(cle, (n.get(cle) ?? 0) + 1);
  }
  return n;
}

export async function barreLaterale(actor: ActorContext, p: Perimetre): Promise<BarreLaterale> {
  const [classes, nonLus] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: actor.schoolId, ...(p.toutesClasses ? {} : { id: { in: p.classIds } }) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    nonLusParEspace(actor, p),
  ]);
  return {
    general: {
      cle: "ECOLE",
      nom: "général",
      type: "ECOLE",
      kind: null,
      description: "Les annonces de l'école, pour toutes les familles.",
      peutPublier: peutPublier(actor, p, "ECOLE"),
      nonLus: nonLus.get("ECOLE") ?? 0,
    },
    classes: classes.map((c) => ({
      cle: `classe:${c.id}`,
      nom: c.name,
      type: "CLASSE" as const,
      kind: null,
      description: `Les familles et l'équipe de la classe ${c.name}.`,
      peutPublier: peutPublier(actor, p, "CLASSE", c.id),
      nonLus: nonLus.get(`classe:${c.id}`) ?? 0,
    })),
    canaux: (p.canaux ?? []).map((c) => ({
      cle: `canal:${c.id}`,
      nom: c.name,
      type: "CANAL" as const,
      // Icône : cadenas si privé, mallette si réservé au personnel, # sinon.
      kind: (c.regles.length === 0
        ? "MEMBRES"
        : c.regles.some((r) => r === "PARENTS" || r.startsWith("PARENTS_CLASSE:"))
          ? "PARENTS"
          : "PERSONNEL") as TypeCanal,
      description: c.description,
      peutPublier: peutPublier(actor, p, "CANAL", c.id),
      nonLus: nonLus.get(`canal:${c.id}`) ?? 0,
    })),
    gererCanaux: peutGererCanaux(actor.role),
  };
}

/** L'espace est ouvert : ses publications ne comptent plus comme non lues. */
/** Marque l'espace comme lu ; renvoie la lecture PRÉCÉDENTE (ligne « Nouveaux messages » façon Slack). */
export async function marquerEspaceVu(actor: ActorContext, espace: string): Promise<Date | null> {
  if (!espace) return null;
  const avant = await prisma.communitySpaceRead.findUnique({
    where: { userId_espace: { userId: actor.userId, espace } },
    select: { lastReadAt: true },
  });
  await prisma.communitySpaceRead.upsert({
    where: { userId_espace: { userId: actor.userId, espace } },
    update: { lastReadAt: new Date() },
    create: { userId: actor.userId, schoolId: actor.schoolId, espace },
  });  return avant?.lastReadAt ?? null;
}

/* ═══════════════════════ Panneau « Infos » ═══════════════════════ */

export type PersonneVue = { id: string; nom: string; detail: string; groupe?: boolean };

export type InfoEspace = {
  titre: string;
  description: string | null;
  visibilite: string;
  creePar: string | null;
  creeLe: string | null;
  membresPeuventPublier: boolean;
  nbParents: number;
  nbPersonnel: number;
  personnes: PersonneVue[];
  /** Canal sur invitation : identifiants des membres (pour la modification). */
  membreIds: string[];
  /** Règles d'audience brutes (pour la modification). */
  regles: string[];
  kind: TypeCanal | null;
  gerable: boolean;
};

const ROLES_PERSONNEL = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "TEACHER"] as const;

async function compterPersonnel(schoolId: string) {
  return prisma.user.count({ where: { schoolId, role: { in: [...ROLES_PERSONNEL] } } });
}

export async function infoEspace(actor: ActorContext, p: Perimetre, espace: string): Promise<InfoEspace | null> {
  const e = lireEspace(espace);
  const vide = { creePar: null, creeLe: null, membresPeuventPublier: false, membreIds: [], regles: [], kind: null, gerable: false };
  if (e.type === "TOUT") return null;
  if (e.type === "ECOLE") {
    const [nbParents, nbPersonnel] = await Promise.all([nombreParents(actor.schoolId, null), compterPersonnel(actor.schoolId)]);
    return {
      ...vide,
      titre: "général",
      description: "Les annonces de l'école, pour toutes les familles.",
      visibilite: "Toute l'école",
      nbParents,
      nbPersonnel,
      personnes: [],
    };
  }
  if (e.type === "CLASSE") {
    if (!e.id || (!p.toutesClasses && !p.classIds.includes(e.id))) return null;
    const [classe, nbParents, affectations] = await Promise.all([
      prisma.class.findFirst({ where: { id: e.id, schoolId: actor.schoolId }, select: { name: true, teacher: { select: { id: true, firstName: true, lastName: true } } } }),
      nombreParents(actor.schoolId, e.id),
      prisma.teachingAssignment.findMany({
        where: { schoolId: actor.schoolId, classId: e.id },
        select: { teacher: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);
    if (!classe) return null;
    const profs = new Map<string, PersonneVue>();
    for (const t of [classe.teacher, ...affectations.map((a) => a.teacher)]) {
      if (t) profs.set(t.id, { id: t.id, nom: nom(t), detail: "Enseignant" });
    }
    return {
      ...vide,
      titre: classe.name,
      description: `Les familles et l'équipe de la classe ${classe.name}.`,
      visibilite: "Parents de la classe et équipe",
      nbParents,
      nbPersonnel: profs.size,
      personnes: [...profs.values()],
    };
  }
  const canal = (p.canaux ?? []).find((c) => c.id === e.id);
  if (!canal) return null;
  const complet = await prisma.communityChannel.findFirst({
    where: { id: canal.id, schoolId: actor.schoolId },
    select: { createdAt: true, createdById: true, members: { select: { userId: true } } },
  });
  if (!complet) return null;
  const ids = complet.members.map((m) => m.userId);
  const [createur, membres, audience, classes] = await Promise.all([
    prisma.user.findFirst({ where: { id: complet.createdById }, select: { firstName: true, lastName: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, role: true } }),
    resoudreAudience(actor.schoolId, canal.regles, ids),
    prisma.class.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true } }),
  ]);
  const nomsClasses = new Map(classes.map((c) => [c.id, c.name]));
  const groupes = canal.regles.map((r) => libelleRegle(r, nomsClasses));
  return {
    titre: canal.name,
    description: canal.description,
    visibilite: groupes.length ? groupes.join(", ") : "Personnes invitées uniquement",
    creePar: createur ? nom(createur) : null,
    creeLe: complet.createdAt.toISOString(),
    membresPeuventPublier: canal.membersCanPost,
    nbParents: audience.parents.length,
    nbPersonnel: audience.personnel.length,
    personnes: membres.map((m) => ({ id: m.id, nom: nom(m), detail: roleLabel(m.role) })),
    membreIds: ids,
    regles: canal.regles,
    kind: canal.kind,
    gerable: peutGererCanaux(actor.role),
  };
}

/** Personnes invitables dans un canal « sur invitation » (personnel et parents de l'école). */
export async function personnesInvitables(actor: ActorContext): Promise<PersonneVue[]> {
  if (!peutGererCanaux(actor.role)) return [];
  const [personnel, eleves] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: actor.schoolId, role: { in: [...ROLES_PERSONNEL] } },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    }),
    prisma.student.findMany({
      where: { schoolId: actor.schoolId, parentId: { not: null } },
      select: {
        firstName: true,
        parent: { select: { id: true, firstName: true, lastName: true } },
        enrollments: { select: { class: { select: { name: true } } }, orderBy: { academicYear: "desc" }, take: 1 },
      },
      take: 3000,
    }),
  ]);
  const parents = new Map<string, PersonneVue>();
  for (const e of eleves) {
    if (!e.parent) continue;
    const enfant = `${e.firstName}${e.enrollments[0]?.class?.name ? ` (${e.enrollments[0].class.name})` : ""}`;
    const deja = parents.get(e.parent.id);
    parents.set(e.parent.id, { id: e.parent.id, nom: nom(e.parent), detail: deja ? `${deja.detail}, ${enfant}` : `Parent de ${enfant}` });
  }
  return [
    ...personnel.map((u) => ({ id: u.id, nom: nom(u), detail: roleLabel(u.role) })),
    ...[...parents.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
  ];
}

/* ═══════════════════════ @mentions ═══════════════════════ */

/**
 * Personnes que l'on peut mentionner (« @ ») — 26 sept. 2026.
 * Personnel : l'équipe et les parents de l'école. Parent : l'équipe seulement
 * (jamais d'autres parents). Qu'une personne mentionnée VOIE la publication
 * est revérifié à l'envoi (`mentionsVisibles`).
 */
export async function mentionnables(actor: ActorContext): Promise<PersonneVue[]> {
  const personnel = await prisma.user.findMany({
    where: { schoolId: actor.schoolId, role: { in: [...ROLES_PERSONNEL] }, id: { not: actor.userId } },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
  });
  const equipe = personnel.map((u) => ({ id: u.id, nom: nom(u), detail: roleLabel(u.role) }));
  if (actor.role === "PARENT") return equipe;
  // Groupes (@parents-CM2, @profs…) en tête de liste — 26 sept. 2026.
  const p = await perimetre(actor);
  const groupes = (await groupesMentionnables(actor, p.classIds, p.toutesClasses)).map((g) => ({ id: g.id, nom: g.nom, detail: g.detail, groupe: true }));
  const eleves = await prisma.student.findMany({
    where: { schoolId: actor.schoolId, parentId: { not: null } },
    select: {
      firstName: true,
      parent: { select: { id: true, firstName: true, lastName: true } },
      enrollments: { select: { class: { select: { name: true } } }, orderBy: { academicYear: "desc" }, take: 1 },
    },
    take: 3000,
  });
  const parents = new Map<string, PersonneVue>();
  for (const e of eleves) {
    if (!e.parent || e.parent.id === actor.userId) continue;
    const enfant = `${e.firstName}${e.enrollments[0]?.class?.name ? ` (${e.enrollments[0].class.name})` : ""}`;
    const deja = parents.get(e.parent.id);
    parents.set(e.parent.id, { id: e.parent.id, nom: nom(e.parent), detail: deja ? `${deja.detail}, ${enfant}` : `Parent de ${enfant}` });
  }
  return [...groupes, ...equipe, ...parents.values()];
}

/** Parmi les personnes mentionnées, celles qui voient réellement la publication (10 au plus). */
export async function mentionsVisibles(schoolId: string, postId: string, ids: unknown, auteurId: string): Promise<string[]> {
  const liste = [...new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [])]
    .filter((id) => id !== auteurId)
    .slice(0, 10);
  if (!liste.length) return [];
  // Uniquement des personnes DE l'école : personnel rattaché, ou parent d'un élève inscrit.
  const [users, parentsEcole] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: liste } }, select: { id: true, role: true, schoolId: true } }),
    prisma.student.findMany({ where: { schoolId, parentId: { in: liste } }, select: { parentId: true } }),
  ]);
  const parentsIci = new Set(parentsEcole.map((e) => e.parentId));
  const deLEcole = users.filter((u) => (u.role === "PARENT" ? parentsIci.has(u.id) : u.schoolId === schoolId));
  const visibles = await Promise.all(
    deLEcole.map(async (u) => {
      const acteur = { userId: u.id, schoolId, role: u.role };
      return (await postVisible(acteur, await perimetre(acteur), postId)) ? u.id : null;
    }),
  );
  return visibles.filter((x): x is string => Boolean(x));
}
