import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { recordAudit, auditForEntity } from "@/lib/audit";
import { canSeeDocument, schoolDocUrl } from "@/lib/schoolDocuments";
import { canSeeStudent, canSeeCategory } from "@/lib/studentScope";
import { signedUrlFor } from "@/lib/studentFile";
import { categoryLabel } from "@/lib/studentFileLabels";
import { channel, normalizePhone, usableEmail, type ChannelId } from "@/lib/channels";

/**
 * Diffusion des documents — lot 17.
 *
 * ═══ QUATRE VERBES QU'IL NE FAUT JAMAIS CONFONDRE ═══
 *
 *   PRÉPARER   composer le texte, résoudre les destinataires, produire un lien
 *   PARTAGER   remettre ce paquet à un humain, qui s'en sert
 *   ENVOYER    un service extérieur transporte réellement le message
 *   CONFIRMER  ce service rapporte que le message est arrivé
 *
 * ⚠️ **EduCom s'arrête au premier.** Aucun canal n'envoie (voir
 * `src/lib/channels.ts`, dont le registre d'implémentations est vide et le
 * reste). Ce module prépare, et enregistre ce qu'un humain déclare avoir fait
 * de sa préparation. Il n'écrit jamais « transmis » à la place de quelqu'un.
 *
 * ═══ AUCUNE TABLE NOUVELLE ═══
 *
 * Même choix qu'au lot 16 pour les transmissions : `AuditLog` porte déjà
 * « qui / quoi / quand / avec quel résultat ». Une diffusion y écrit deux
 * sortes de lignes — l'acte (`diffusion`), et une ligne sur le document lui-même
 * pour que « ce règlement a-t-il été diffusé ? » se réponde par un index et non
 * par la relecture du journal.
 *
 * ═══ AUCUNE PERMISSION NOUVELLE ═══
 *
 * Diffuser n'ouvre rien. Un document d'établissement passe par
 * `canSeeDocument()` (lot 15) ; une pièce d'élève par `canSeeStudent()` +
 * `canSeeCategory()` (lot 13.1), exactement comme le téléchargement. Un
 * enseignant qui ne voit pas une pièce `SANTE` ne peut pas la diffuser — non
 * parce qu'un bouton est caché, mais parce que la résolution échoue.
 */

/* ═══════════════════ vocabulaire d'état ═══════════════════ */

/**
 * États qu'EduCom peut réellement produire.
 *
 *   PREPARE              un paquet a été composé ; rien n'est parti.
 *   REMIS_MANUELLEMENT   un humain déclare l'avoir transmis lui-même.
 *   ECHEC                la préparation n'a pas abouti (aucun destinataire, lien impossible).
 */
export type DiffusionState = "PREPARE" | "REMIS_MANUELLEMENT" | "ECHEC";

export const DIFFUSION_STATE_LABELS: Record<DiffusionState, string> = {
  PREPARE: "Préparé",
  REMIS_MANUELLEMENT: "Remis à la main",
  ECHEC: "Échec",
};

/**
 * États **interdits d'écriture** tant qu'aucun service réel n'existe.
 *
 * ⚠️ Ils sont nommés ici pour une raison précise : un vérificateur peut prouver
 * qu'aucun n'apparaît dans le journal. « EN_COURS » suppose un envoi commencé,
 * « TRANSMIS » un transport réalisé, « CONFIRME » un accusé de réception — trois
 * affirmations qu'aucune ligne de ce dépôt n'est en mesure de tenir.
 */
export const FORBIDDEN_STATES = ["EN_COURS", "TRANSMIS", "CONFIRME"] as const;

/** Méthode inscrite au journal. Explicite, pour que l'audit ne laisse aucun doute. */
export const MANUAL_DELIVERY = "DIFFUSION_MANUELLE";

/* ═══════════════════ liens ═══════════════════ */

/**
 * Durée de vie du lien remis. **Dix minutes.**
 *
 * ⚠️ Ce n'est pas un lien permanent, et il ne prouve rien. Le coller dans un
 * message le rend inutilisable dès qu'on tarde à envoyer ; le conserver comme
 * « preuve de transmission » serait doublement faux — il expire, et il n'atteste
 * que d'une autorisation de lecture, jamais d'une remise.
 */
export const LINK_TTL_SECONDS = 600;

/** Bornes affichées à l'écran. Un tableau de trois cents lignes n'aide personne. */
export const RECIPIENT_LIMIT = 300;

/* ═══════════════════ destinataires ═══════════════════ */

export type DiffusionRecipient = {
  parentId: string;
  name: string;
  /** Numéro normalisé, ou `null` s'il n'est pas exploitable. */
  phone: string | null;
  /** Adresse exploitable, ou `null`. */
  email: string | null;
  /** Enfants concernés — c'est ce qui rend le destinataire compréhensible. */
  children: string[];
  /** Une adresse existe-t-elle pour LE canal demandé ? */
  available: boolean;
};

/** Adresse utile au canal, ou `null`. Un canal sans adresse = destinataire indisponible. */
function addressFor(ch: ChannelId, r: { phone: string | null; email: string | null }): string | null {
  if (ch === "whatsapp" || ch === "sms") return r.phone;
  if (ch === "email") return r.email;
  return null;
}

/* ═══════════════════ cibles ═══════════════════ */

export type DiffusionTarget =
  | { kind: "schoolDocument"; documentId: string }
  | { kind: "studentDocument"; documentId: string };

export type DiffusionPreparation = {
  kind: DiffusionTarget["kind"];
  documentId: string;
  title: string;
  scopeLabel: string;
  channel: ChannelId;
  channelLabel: string;
  /** Toujours `false` aujourd'hui — et c'est le serveur qui le dit, pas l'écran. */
  canSend: boolean;
  /** Phrase affichée telle quelle : ce qui a été fait, et ce qui ne l'a pas été. */
  notice: string;
  subject: string;
  text: string;
  link: { url: string; fileName: string; ttlSeconds: number; expiresAt: string };
  recipients: DiffusionRecipient[];
  /** Nombre total de familles concernées, y compris celles non listées. */
  totalRecipients: number;
  availableCount: number;
  unavailableCount: number;
  /** Élèves de la portée sans aucun parent rattaché : personne ne les joindra. */
  studentsWithoutParent: number;
  truncated: boolean;
};

/**
 * Prépare une diffusion — **et n'envoie rien**.
 *
 * ⚠️ L'ordre est celui du lot 16, et il n'est pas négociable :
 * **permission d'abord, préparation ensuite.** Résoudre les destinataires avant
 * d'avoir vérifié le droit de voir le document reviendrait à répondre « voici
 * les 43 familles de la 6ᵉ B » à quelqu'un qui n'a pas accès à ce document.
 */
export async function prepareDiffusion(
  actor: ActorContext,
  input: { target: DiffusionTarget; channel: ChannelId },
): Promise<DiffusionPreparation | { error: string }> {
  const ch = channel(input.channel);
  if (!ch.canPrepare) return { error: `${ch.label} ne peut pas recevoir un document préparé.` };

  const prepared =
    input.target.kind === "schoolDocument"
      ? await prepareSchoolDocument(actor, input.target.documentId, input.channel)
      : await prepareStudentDocument(actor, input.target.documentId, input.channel);

  if ("error" in prepared) {
    await recordAudit(actor, {
      action: "diffusion.prepare",
      entity: "diffusion",
      entityId: input.target.documentId,
      outcome: "failure",
      details: { state: "ECHEC" satisfies DiffusionState, kind: input.target.kind, channel: input.channel, reason: prepared.error },
    });
    return prepared;
  }

  await recordAudit(actor, {
    action: "diffusion.prepare",
    entity: "diffusion",
    entityId: input.target.documentId,
    outcome: "success",
    details: {
      state: "PREPARE" satisfies DiffusionState,
      kind: input.target.kind,
      channel: input.channel,
      title: prepared.title,
      recipients: prepared.totalRecipients,
      available: prepared.availableCount,
      unavailable: prepared.unavailableCount,
      ttlSeconds: LINK_TTL_SECONDS,
      // ⚠️ Écrit noir sur blanc : le journal ne doit pas laisser croire à un envoi.
      sentByEduCom: false,
    },
  });

  return prepared;
}

/* ─────────────── document d'établissement (lot 15) ─────────────── */

async function prepareSchoolDocument(
  actor: ActorContext,
  documentId: string,
  ch: ChannelId,
): Promise<DiffusionPreparation | { error: string }> {
  const NOT_FOUND = { error: "Document introuvable dans votre établissement." };

  const doc = await prisma.schoolDocument.findFirst({
    where: { id: documentId, schoolId: actor.schoolId },
    select: {
      id: true, title: true, description: true, status: true, audience: true,
      scopeKind: true, cycle: true, classId: true, academicYear: true, supersededAt: true,
      class: { select: { name: true } },
      school: { select: { name: true } },
    },
  });
  if (!doc) return NOT_FOUND;
  // Message identique dans les deux cas : distinguer « pas le droit » de
  // « n'existe pas » confirmerait l'existence du document.
  if (!(await canSeeDocument(actor, documentId))) return NOT_FOUND;

  // §6 — seul un document PUBLIÉ circule. Un brouillon présenté à une famille
  // serait pris pour un document officiel ; un archivé pour un document courant.
  if (doc.status !== "PUBLISHED") {
    return { error: `Ce document est « ${doc.status} » : seul un document publié peut être diffusé.` };
  }
  if (doc.supersededAt) {
    return { error: "Cette version a été remplacée — diffusez la version courante." };
  }

  // Portée réelle, jamais estimée : la même expression que le lot 15.
  const where =
    doc.scopeKind === "CLASS" ? { classId: doc.classId ?? "" }
    : doc.scopeKind === "CYCLE" ? { class: { schoolId: actor.schoolId, cycle: doc.cycle ?? undefined } }
    : { class: { schoolId: actor.schoolId } };

  const enrollments = await prisma.enrollment.findMany({
    where: { ...where, student: { schoolId: actor.schoolId } },
    select: { student: { select: { id: true, firstName: true, lastName: true, parentId: true } } },
  });

  const studentsWithoutParent = new Set(
    enrollments.filter((e) => !e.student.parentId).map((e) => e.student.id),
  ).size;

  const childrenByParent = new Map<string, string[]>();
  for (const e of enrollments) {
    const p = e.student.parentId;
    if (!p) continue;
    const list = childrenByParent.get(p) ?? [];
    const name = `${e.student.firstName} ${e.student.lastName}`;
    if (!list.includes(name)) list.push(name);
    childrenByParent.set(p, list);
  }

  const parentIds = [...childrenByParent.keys()];
  const recipients = await loadRecipients(actor, parentIds, childrenByParent, ch);

  const scopeLabel =
    doc.scopeKind === "CLASS" ? doc.class?.name ?? "une classe"
    : doc.scopeKind === "CYCLE" ? String(doc.cycle)
    : "tout l'établissement";

  const signed = await schoolDocUrl(actor, documentId, LINK_TTL_SECONDS);
  if ("error" in signed) return signed;

  const text =
    `${doc.school.name}\n${doc.title}` +
    (doc.academicYear ? ` — ${doc.academicYear}` : "") +
    `\n${doc.description ? `${doc.description}\n` : ""}Concerne : ${scopeLabel}.`;

  return compose({
    kind: "schoolDocument", documentId, title: doc.title, scopeLabel, ch,
    subject: `${doc.school.name} — ${doc.title}`,
    text, signed, recipients, totalRecipients: parentIds.length, studentsWithoutParent,
  });
}

/* ─────────────── pièce du dossier élève (lot 13) ─────────────── */

/**
 * Prépare la diffusion d'une pièce d'élève.
 *
 * ⚠️ **Une pièce d'élève ne part jamais vers un groupe.** Le seul destinataire
 * possible est le parent de CET enfant. Ce n'est pas une commodité, c'est une
 * borne structurelle : un extrait de naissance ou un certificat médical n'a
 * aucune raison d'atteindre une liste de diffusion, et une erreur de sélection
 * n'est pas rattrapable une fois le message parti.
 *
 * Les droits sont ceux du lot 13.1, non rejoués : catégorie visible par le rôle,
 * élève dans le périmètre. `signedUrlFor()` les vérifie à nouveau avant de
 * remettre le lien — deux verrous valent mieux qu'un pour une pièce d'enfant.
 */
async function prepareStudentDocument(
  actor: ActorContext,
  documentId: string,
  ch: ChannelId,
): Promise<DiffusionPreparation | { error: string }> {
  const NOT_FOUND = { error: "Document introuvable dans votre établissement." };

  const doc = await prisma.studentDocument.findFirst({
    where: { id: documentId, schoolId: actor.schoolId, student: { schoolId: actor.schoolId } },
    select: {
      id: true, label: true, category: true, status: true, studentId: true,
      student: {
        select: {
          id: true, firstName: true, lastName: true, parentId: true,
          school: { select: { name: true } },
        },
      },
    },
  });
  if (!doc) return NOT_FOUND;
  if (!canSeeCategory(actor, doc.category)) return NOT_FOUND;
  if (!(await canSeeStudent(actor, doc.studentId))) return NOT_FOUND;

  const childName = `${doc.student.firstName} ${doc.student.lastName}`;
  const parentIds = doc.student.parentId ? [doc.student.parentId] : [];
  const childrenByParent = new Map(parentIds.map((p) => [p, [childName]]));
  const recipients = await loadRecipients(actor, parentIds, childrenByParent, ch);

  const signed = await signedUrlFor(actor, documentId, LINK_TTL_SECONDS);
  if ("error" in signed) return signed;

  const text =
    `${doc.student.school.name}\n${doc.label}\n` +
    `Pièce du dossier de ${childName} (${categoryLabel(doc.category)}).`;

  return compose({
    kind: "studentDocument", documentId, title: doc.label, scopeLabel: childName, ch,
    subject: `${doc.student.school.name} — ${doc.label} (${childName})`,
    text,
    signed: { url: signed.url, fileName: signed.fileName },
    recipients,
    totalRecipients: parentIds.length,
    studentsWithoutParent: doc.student.parentId ? 0 : 1,
  });
}

/* ─────────────── fabrique commune ─────────────── */

async function loadRecipients(
  actor: ActorContext,
  parentIds: string[],
  childrenByParent: Map<string, string[]>,
  ch: ChannelId,
): Promise<DiffusionRecipient[]> {
  if (parentIds.length === 0) return [];

  // ⚠️ Toujours borné à l'école : un identifiant de parent ne doit jamais servir
  // à lire l'annuaire d'un autre établissement.
  const users = await prisma.user.findMany({
    where: { id: { in: parentIds.slice(0, RECIPIENT_LIMIT) }, schoolId: actor.schoolId, role: "PARENT" },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return users.map((u) => {
    const phone = normalizePhone(u.phone);
    const email = usableEmail(u.email);
    return {
      parentId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      phone, email,
      children: childrenByParent.get(u.id) ?? [],
      available: addressFor(ch, { phone, email }) !== null,
    };
  });
}

function compose(a: {
  kind: DiffusionTarget["kind"];
  documentId: string;
  title: string;
  scopeLabel: string;
  ch: ChannelId;
  subject: string;
  text: string;
  signed: { url: string; fileName: string };
  recipients: DiffusionRecipient[];
  totalRecipients: number;
  studentsWithoutParent: number;
}): DiffusionPreparation {
  const c = channel(a.ch);
  const available = a.recipients.filter((r) => r.available).length;

  return {
    kind: a.kind,
    documentId: a.documentId,
    title: a.title,
    scopeLabel: a.scopeLabel,
    channel: a.ch,
    channelLabel: c.label,
    canSend: c.canSend,
    notice: c.canSend
      ? c.reason
      : `Aucun message n'a été envoyé par EduCom. ${c.reason} Le texte et le lien ci-dessous sont à transmettre depuis votre propre ${c.id === "email" ? "messagerie" : "téléphone"}.`,
    subject: a.subject,
    text: a.text,
    link: {
      url: a.signed.url,
      fileName: a.signed.fileName,
      ttlSeconds: LINK_TTL_SECONDS,
      expiresAt: new Date(Date.now() + LINK_TTL_SECONDS * 1000).toISOString(),
    },
    recipients: a.recipients,
    totalRecipients: a.totalRecipients,
    availableCount: available,
    unavailableCount: a.recipients.length - available,
    studentsWithoutParent: a.studentsWithoutParent,
    truncated: a.totalRecipients > a.recipients.length,
  };
}

/* ═══════════════════ ce qu'un humain déclare avoir fait ═══════════════════ */

/**
 * Enregistre une remise effectuée **par un humain**, hors EduCom.
 *
 * ⚠️ C'est le seul acte de « transmission » que ce module connaisse, et il porte
 * son nom : `DIFFUSION_MANUELLE`, `sentByEduCom: false`. Le produit n'a rien
 * transporté ; il enregistre une déclaration, comme le lot 16 enregistre la
 * remise d'un dossier à l'inspection.
 *
 * ⚠️ **La liste des destinataires est re-résolue côté serveur.** Celle qui
 * arrive du client ne sert qu'à filtrer : sans cela, on pourrait déclarer avoir
 * remis un document à un parent d'un autre établissement, et polluer son
 * historique.
 */
export async function recordManualDelivery(
  actor: ActorContext,
  input: { target: DiffusionTarget; channel: ChannelId; parentIds: string[]; note?: string | null },
): Promise<{ diffusionId: string; recipients: { id: string; name: string }[] } | { error: string }> {
  const prepared = await prepareDiffusion(actor, { target: input.target, channel: input.channel });
  if ("error" in prepared) return prepared;

  const asked = new Set(input.parentIds);
  const kept = prepared.recipients.filter((r) => r.available && asked.has(r.parentId));
  if (kept.length === 0) {
    return { error: "Aucun destinataire joignable parmi ceux sélectionnés." };
  }

  const diffusionId = crypto.randomUUID();
  const list = kept.map((r) => ({ id: r.parentId, name: r.name }));

  await recordAudit(actor, {
    action: "diffusion.manualDelivery",
    entity: "diffusion",
    entityId: diffusionId,
    outcome: "success",
    details: {
      state: "REMIS_MANUELLEMENT" satisfies DiffusionState,
      method: MANUAL_DELIVERY,
      kind: input.target.kind,
      documentId: input.target.documentId,
      title: prepared.title,
      channel: input.channel,
      count: list.length,
      recipients: list,
      note: input.note?.trim() || null,
      sentByEduCom: false,
    },
  });

  // Une ligne sur le document lui-même : c'est elle qui rend « ce document
  // a-t-il été diffusé ? » interrogeable par index, sans relire `details`.
  await recordAudit(actor, {
    action: DIFFUSED_ACTION,
    entity: input.target.kind,
    entityId: input.target.documentId,
    outcome: "success",
    details: { diffusionId, method: MANUAL_DELIVERY, channel: input.channel, count: list.length },
  });

  return { diffusionId, recipients: list };
}

/** Action portée par la ligne « ce document a été diffusé ». */
export const DIFFUSED_ACTION = "document.diffuse";

/** Identifiants des documents déjà déclarés diffusés (dans l'ensemble demandé). */
export async function diffusedDocumentIds(
  actor: ActorContext,
  kind: DiffusionTarget["kind"],
  among?: string[],
): Promise<Set<string>> {
  const rows = await prisma.auditLog.groupBy({
    by: ["entityId"],
    where: {
      schoolId: actor.schoolId,
      entity: kind,
      action: DIFFUSED_ACTION,
      ...(among?.length ? { entityId: { in: among } } : {}),
    },
  });
  return new Set(rows.map((r) => r.entityId).filter((v): v is string => Boolean(v)));
}

/**
 * Historique des diffusions de l'établissement.
 *
 * Relu depuis `AuditLog`, borné par `schoolId` comme tout le reste du projet.
 */
export async function diffusionHistory(actor: ActorContext, take = 30) {
  const rows = await prisma.auditLog.findMany({
    where: {
      schoolId: actor.schoolId,
      entity: "diffusion",
      action: { in: ["diffusion.prepare", "diffusion.manualDelivery"] },
    },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, entityId: true, userId: true, action: true, createdAt: true },
  });
  if (rows.length === 0) return [];

  const detailed = await Promise.all(
    rows.map((r) => auditForEntity(actor, "diffusion", r.entityId!, 5)),
  );
  const userIds = [...new Set(rows.map((r) => r.userId))].filter((v): v is string => Boolean(v));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { schoolId: actor.schoolId, id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : [];

  return rows.map((r, i) => {
    // La ligne recherchée est celle qui porte cet identifiant d'audit précis.
    const d = detailed[i].find((x) => x.id === r.id)?.details ?? detailed[i][0]?.details ?? {};
    const u = users.find((x) => x.id === r.userId);
    const state = typeof d.state === "string" ? (d.state as DiffusionState) : "PREPARE";
    return {
      id: r.id,
      at: r.createdAt,
      who: u ? `${u.firstName} ${u.lastName}` : "Compte supprimé",
      role: u?.role ?? null,
      state,
      kind: typeof d.kind === "string" ? d.kind : null,
      channel: typeof d.channel === "string" ? d.channel : null,
      title: typeof d.title === "string" ? d.title : null,
      count: typeof d.count === "number" ? d.count : typeof d.available === "number" ? d.available : 0,
      note: typeof d.note === "string" ? d.note : null,
      reason: typeof d.reason === "string" ? d.reason : null,
      sentByEduCom: d.sentByEduCom === true,
    };
  });
}
