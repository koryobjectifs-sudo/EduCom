"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit, auditForEntity } from "@/lib/audit";
import { WORKFLOWS, type SchoolDocState } from "@/lib/workflow";
import { authorizeTransition, recordTransition } from "@/lib/workflowHistory";
import { BUCKET } from "@/lib/studentFile";
import { checkFile } from "@/lib/studentFileLimits";
import {
  CENTRE_PATH, CENTRE_MANAGE_PATH, canSeeDocument, schoolDocUrl, schoolStoragePath, documentVersions,
} from "@/lib/schoolDocuments";
import { prepareDiffusion, recordManualDelivery, diffusionHistory } from "@/lib/diffusion";
import type { ChannelId } from "@/lib/channels";
import type { DocAudience, DocScopeKind, EducationalCycle } from "../../../../generated/prisma/client";

/**
 * Centre documentaire — actions serveur. Lot 15.
 *
 * ═══ DEUX CHEMINS, DEUX AUTORITÉS — AUCUNE MATRICE NOUVELLE ═══
 *
 *   `/dashboard/documents/centre`          consulter, déposer un brouillon,
 *                                          modifier un brouillon, remplacer
 *   `/dashboard/documents/centre/gestion`  publier, dépublier, archiver
 *                                          → refusé à tous sauf la direction
 *
 * C'est la séparation déjà en place pour les bulletins et pour le dossier
 * élève : celui qui prépare n'approuve pas. Aucun rôle n'est cité ici.
 *
 * ═══ UN DOCUMENT PUBLIÉ NE SE MODIFIE PAS ═══
 *
 * ⚠️ Modifier le fichier d'un document publié **crée une nouvelle version** ;
 * l'ancienne conserve sa ligne, son fichier et son numéro. Écraser en place
 * ferait qu'une famille ayant téléchargé « Fournitures CM2 » hier détiendrait
 * un document que plus rien en base ne permet de retrouver.
 */

const wf = WORKFLOWS.schoolDocument;

function refresh() {
  revalidatePath(CENTRE_PATH);
}

/* ═════════════════════ dossiers ═════════════════════ */

/**
 * Crée un rayon du centre.
 *
 * ⚠️ Aucun rayon n'est imposé : « Fournitures », « Manuels », « Uniformes » sont
 * des dossiers que l'établissement crée lui-même. Coder l'arborescence en dur
 * aurait empêché une école d'en ajouter un — et aucune école ne classe comme
 * une autre.
 */
export async function createFolder(input: { name: string; parentId?: string | null; icon?: string | null }) {
  const auth = await requireActionContext(CENTRE_MANAGE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const name = input.name.trim();
  if (!name) return { error: "Le nom du dossier est obligatoire." };

  if (input.parentId) {
    const parent = await prisma.documentFolder.count({ where: { id: input.parentId, schoolId: ctx.schoolId } });
    if (parent === 0) return { error: "Dossier parent introuvable dans votre établissement." };
  }

  const position = await prisma.documentFolder.count({ where: { schoolId: ctx.schoolId } });
  const folder = await prisma.documentFolder.create({
    data: { name, icon: input.icon ?? null, parentId: input.parentId ?? null, schoolId: ctx.schoolId, position },
    select: { id: true },
  });

  await recordAudit(ctx, {
    action: "documentFolder.create", entity: "schoolDocument", entityId: folder.id,
    outcome: "success", details: { name },
  });
  refresh();
  return { data: { id: folder.id } };
}

/**
 * Supprime un rayon. Les documents ne sont PAS supprimés — ils retombent à la
 * racine (`onDelete: SetNull`). Un rangement qui détruit ce qu'il range serait
 * un piège.
 */
export async function deleteFolder(id: string) {
  const auth = await requireActionContext(CENTRE_MANAGE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const folder = await prisma.documentFolder.findFirst({
    where: { id, schoolId: ctx.schoolId },
    select: { id: true, name: true, _count: { select: { documents: true } } },
  });
  if (!folder) return { error: "Dossier introuvable dans votre établissement." };

  await prisma.documentFolder.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  await recordAudit(ctx, {
    action: "documentFolder.delete", entity: "schoolDocument", entityId: id,
    outcome: "success", details: { name: folder.name, releasedDocuments: folder._count.documents },
  });
  refresh();
  return { data: { releasedDocuments: folder._count.documents } };
}

/* ═════════════════════ dépôt et remplacement ═════════════════════ */

type DocFields = {
  title: string;
  description: string | null;
  folderId: string | null;
  audience: DocAudience;
  scopeKind: DocScopeKind;
  cycle: EducationalCycle | null;
  classId: string | null;
  academicYear: string | null;
  subject: string | null;
};

function readFields(fd: FormData): DocFields {
  const scopeKind = (String(fd.get("scopeKind") ?? "SCHOOL") || "SCHOOL") as DocScopeKind;
  return {
    title: String(fd.get("title") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim() || null,
    folderId: String(fd.get("folderId") ?? "") || null,
    audience: (String(fd.get("audience") ?? "STAFF") || "STAFF") as DocAudience,
    scopeKind,
    // ⚠️ Les champs de portée sont vidés quand ils ne s'appliquent pas : un
    // `classId` resté sur un document « tout l'établissement » ferait mentir
    // toute requête de portée par la suite.
    cycle: scopeKind === "CYCLE" ? ((String(fd.get("cycle") ?? "") || null) as EducationalCycle | null) : null,
    classId: scopeKind === "CLASS" ? (String(fd.get("classId") ?? "") || null) : null,
    academicYear: String(fd.get("academicYear") ?? "").trim() || null,
    subject: String(fd.get("subject") ?? "").trim() || null,
  };
}

/** Vérifie que la portée déclarée désigne des données réelles de l'école. */
async function checkScope(schoolId: string, f: DocFields): Promise<string | null> {
  if (f.scopeKind === "CLASS") {
    if (!f.classId) return "Une portée « classe » exige de choisir la classe.";
    const n = await prisma.class.count({ where: { id: f.classId, schoolId } });
    if (n === 0) return "Classe introuvable dans votre établissement.";
  }
  if (f.scopeKind === "CYCLE" && !f.cycle) return "Une portée « cycle » exige de choisir le cycle.";
  if (f.folderId) {
    const n = await prisma.documentFolder.count({ where: { id: f.folderId, schoolId } });
    if (n === 0) return "Dossier introuvable dans votre établissement.";
  }
  return null;
}

/**
 * Dépose un document, ou une NOUVELLE VERSION d'un document existant.
 *
 * ⚠️ Le binaire part d'abord : si l'envoi échoue, aucune ligne orpheline ne
 * reste en base à pointer vers un objet inexistant. Si la base échoue ensuite,
 * l'objet est retiré. Même ordre qu'au lot 13, pour la même raison.
 *
 * ⚠️ Une nouvelle version **hérite du statut BROUILLON**. Remplacer le fichier
 * d'un règlement publié ne republie pas automatiquement : la publication reste
 * un acte de direction, explicite.
 */
export async function uploadSchoolDocument(formData: FormData) {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const f = readFields(formData);
  const file = formData.get("file");
  const replacesId = String(formData.get("replacesId") ?? "") || null;

  if (!f.title) return { error: "Le titre du document est obligatoire." };
  if (!(file instanceof File)) return { error: "Aucun fichier reçu." };

  const verdict = checkFile(file.type, file.name, file.size);
  if (!verdict.ok) return { error: verdict.error };

  const scopeError = await checkScope(ctx.schoolId, f);
  if (scopeError) return { error: scopeError };

  let previous: { id: string; version: number; title: string; status: string } | null = null;
  if (replacesId) {
    previous = await prisma.schoolDocument.findFirst({
      where: { id: replacesId, schoolId: ctx.schoolId, supersededAt: null },
      select: { id: true, version: true, title: true, status: true },
    });
    if (!previous) return { error: "Document à remplacer introuvable dans votre établissement." };
    if (!(await canSeeDocument(ctx, previous.id))) return { error: "Document à remplacer introuvable dans votre établissement." };
  }

  const id = crypto.randomUUID();
  const path = schoolStoragePath(ctx.schoolId, id, file.name);

  const supabase = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return { error: `Envoi du fichier impossible : ${up.error.message}` };

  try {
    await prisma.$transaction([
      prisma.schoolDocument.create({
        data: {
          id, ...f,
          status: "DRAFT",
          storagePath: path,
          fileName: file.name.slice(0, 120),
          mimeType: file.type,
          sizeBytes: file.size,
          version: (previous?.version ?? 0) + 1,
          supersedesId: previous?.id ?? null,
          createdById: ctx.userId,
          schoolId: ctx.schoolId,
        },
      }),
      ...(previous
        ? [prisma.schoolDocument.updateMany({
            where: { id: previous.id, schoolId: ctx.schoolId },
            data: { supersededAt: new Date() },
          })]
        : []),
    ]);
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: `Enregistrement impossible : ${e instanceof Error ? e.message : "erreur inconnue"}` };
  }

  await recordAudit(ctx, {
    action: previous ? "schoolDocument.newVersion" : "schoolDocument.create",
    entity: "schoolDocument", entityId: id, outcome: "success",
    details: {
      title: f.title, fileName: file.name, sizeBytes: file.size, mimeType: file.type,
      version: (previous?.version ?? 0) + 1, scopeKind: f.scopeKind, audience: f.audience,
      ...(previous ? { replacedId: previous.id, replacedVersion: previous.version, replacedStatus: previous.status } : {}),
    },
  });

  refresh();
  return { data: { id, version: (previous?.version ?? 0) + 1, replaced: Boolean(previous) } };
}

/** Modifie les métadonnées d'un document. Le fichier, lui, passe par une version. */
export async function updateSchoolDocument(formData: FormData) {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const id = String(formData.get("id") ?? "");
  const f = readFields(formData);
  if (!f.title) return { error: "Le titre du document est obligatoire." };

  const doc = await prisma.schoolDocument.findFirst({
    where: { id, schoolId: ctx.schoolId },
    select: { id: true, status: true, title: true },
  });
  if (!doc || !(await canSeeDocument(ctx, id))) return { error: "Document introuvable dans votre établissement." };

  // ⚠️ §11 — un document PUBLIÉ ne se modifie pas en silence. Le corriger exige
  // le droit de publication : sinon un employé changerait la portée d'un
  // règlement officiel sans que la direction en sache rien.
  if (doc.status === "PUBLISHED" && !(await requireActionContext(CENTRE_MANAGE_PATH)).ok) {
    return { error: "Ce document est publié : seule la direction peut le modifier, ou déposez-en une nouvelle version." };
  }

  const scopeError = await checkScope(ctx.schoolId, f);
  if (scopeError) return { error: scopeError };

  await prisma.schoolDocument.updateMany({ where: { id, schoolId: ctx.schoolId }, data: f });
  await recordAudit(ctx, {
    action: "schoolDocument.update", entity: "schoolDocument", entityId: id,
    outcome: "success", details: { from: doc.title, to: f.title, scopeKind: f.scopeKind, audience: f.audience },
  });
  refresh();
  return { success: true };
}

/* ═════════════════════ cycle de vie ═════════════════════ */

/**
 * Fait passer un document d'un état à un autre.
 *
 * ⚠️ **Aucune règle de transition n'est écrite ici.** Elles vivent dans
 * `WORKFLOWS.schoolDocument` ; `authorizeTransition()` vérifie l'état de départ,
 * l'existence de la transition, le droit d'accès au chemin exigé et le motif
 * obligatoire. Réécrire ces contrôles ici aurait créé une seconde vérité.
 */
export async function transitionSchoolDocument(input: { id: string; to: SchoolDocState; comment?: string }) {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const doc = await prisma.schoolDocument.findFirst({
    where: { id: input.id, schoolId: ctx.schoolId },
    select: { id: true, status: true, title: true, supersededAt: true },
  });
  if (!doc || !(await canSeeDocument(ctx, input.id))) return { error: "Document introuvable dans votre établissement." };
  if (doc.supersededAt) return { error: "Cette version a été remplacée — agissez sur la version courante." };

  const decision = await authorizeTransition(ctx, wf, {
    entityId: doc.id,
    from: doc.status as SchoolDocState,
    to: input.to,
    comment: input.comment,
  });
  if (!decision.ok) return { error: decision.error };

  const now = new Date();
  await prisma.schoolDocument.updateMany({
    where: { id: doc.id, schoolId: ctx.schoolId },
    data: {
      status: input.to,
      ...(input.to === "PUBLISHED" ? { publishedAt: now, publishedById: ctx.userId, archivedAt: null } : {}),
      ...(input.to === "ARCHIVED" ? { archivedAt: now } : {}),
    },
  });

  await recordTransition(ctx, wf, {
    entityId: doc.id, from: doc.status as SchoolDocState, to: input.to, comment: input.comment,
  });
  refresh();
  return { success: true };
}

/* ═════════════════════ consultation du fichier ═════════════════════ */

/**
 * Lien temporaire, pour l'aperçu comme pour le téléchargement.
 *
 * ⚠️ Tracé : savoir qui a récupéré quel document officiel fait partie de
 * l'historique exigé. La trace est écrite avant la remise du lien.
 */
export async function getSchoolDocumentUrl(id: string, purpose: "preview" | "download" = "download") {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const signed = await schoolDocUrl(ctx, id, 120);
  if ("error" in signed) return { error: signed.error };

  await recordAudit(ctx, {
    action: purpose === "preview" ? "schoolDocument.preview" : "schoolDocument.download",
    entity: "schoolDocument", entityId: id, outcome: "success",
    details: { fileName: signed.fileName, ttlSeconds: 120 },
  });

  return { data: signed };
}

/* ═════════════════════ diffusion (lot 17) ═════════════════════ */

/**
 * Prépare la diffusion d'un document publié — **et n'envoie rien**.
 *
 * ⚠️ Remplace `prepareShare()` du lot 15 : une seule voie, pas deux. Toute la
 * logique vit dans `src/lib/diffusion.ts`, partagée avec le dossier élève —
 * dupliquer la résolution des destinataires ici aurait produit deux réponses
 * possibles à « qui est concerné ? », donc, tôt ou tard, deux réponses
 * différentes.
 *
 * ⚠️ **Aucun canal n'envoie** : `src/lib/channels.ts` le dit, et c'est lui
 * l'autorité. Cette action remet un texte, des destinataires réels et un lien
 * temporaire ; la remise se fait ensuite depuis le téléphone ou la messagerie de
 * l'établissement.
 */
export async function prepareDocumentDiffusion(id: string, channel: ChannelId) {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };

  const prepared = await prepareDiffusion(auth.ctx, { target: { kind: "schoolDocument", documentId: id }, channel });
  if ("error" in prepared) return { error: prepared.error };

  // ⚠️ Affirmé au point de sortie, pas seulement à l'intérieur : `sent: false`
  // traverse la frontière serveur → client avec le reste du paquet.
  return { data: { ...prepared, sent: false } };
}

/**
 * Enregistre que l'utilisateur a **lui-même** transmis le document.
 *
 * ⚠️ EduCom n'a rien envoyé ; il consigne une déclaration humaine, exactement
 * comme le lot 16 consigne la remise d'un dossier à l'inspection. La liste des
 * destinataires est re-résolue côté serveur — celle du client ne sert qu'à
 * filtrer.
 */
export async function confirmDocumentDiffusion(input: {
  id: string; channel: ChannelId; parentIds: string[]; note?: string | null;
}) {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };

  const done = await recordManualDelivery(auth.ctx, {
    target: { kind: "schoolDocument", documentId: input.id },
    channel: input.channel,
    parentIds: input.parentIds,
    note: input.note ?? null,
  });
  if ("error" in done) return { error: done.error };

  refresh();
  return { data: done };
}

/** Historique des diffusions de l'établissement — relu depuis `AuditLog`. */
export async function listDiffusions() {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };
  const rows = await diffusionHistory(auth.ctx, 30);
  return { data: rows.map((r) => ({ ...r, at: r.at.toISOString() })) };
}

/* ═════════════════════ détail : versions et historique ═════════════════════ */

/**
 * Lignée et historique d'un document.
 *
 * ⚠️ **Aucune table d'historique nouvelle.** `WorkflowTransition` porte les
 * changements d'état, `AuditLog` le reste (création, nouvelle version,
 * téléchargement, préparation de partage). Les deux sont fusionnés à la lecture
 * et triés par date : l'écran montre une seule chronologie, la base n'en stocke
 * pas une de plus.
 */
export async function schoolDocumentDetail(id: string) {
  const auth = await requireActionContext(CENTRE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  if (!(await canSeeDocument(ctx, id))) return { error: "Document introuvable dans votre établissement." };

  const versions = await documentVersions(ctx, id);
  const chainIds = (versions ?? []).map((v) => v.id);

  const [auditsByVersion, transitions] = await Promise.all([
    // ⚠️ `auditForEntity()` et non une requête directe : `AuditLog.details` est
    // stocké sérialisé, et ce helper le décode déjà. Le relire à la main aurait
    // dupliqué — donc fait diverger — la façon de lire le journal.
    Promise.all(chainIds.map((cid) => auditForEntity(ctx, "schoolDocument", cid, 20))),
    prisma.workflowTransition.findMany({
      where: { schoolId: ctx.schoolId, entity: "schoolDocument", entityId: { in: chainIds } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, fromState: true, toState: true, comment: true, createdAt: true, actorId: true },
    }),
  ]);

  const audits = auditsByVersion.flat();
  const actorIds = [...new Set([...audits.map((a) => a.userId), ...transitions.map((t) => t.actorId)])].filter(Boolean) as string[];
  const users = actorIds.length
    ? await prisma.user.findMany({
        // Borné à l'école : un identifiant d'acteur ne doit pas permettre de lire
        // l'annuaire d'un autre établissement.
        where: { schoolId: ctx.schoolId, id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const nameOf = (uid: string | null) => {
    const u = users.find((x) => x.id === uid);
    return u ? `${u.firstName} ${u.lastName}` : "Compte supprimé";
  };

  const events = [
    ...audits.map((a) => ({
      id: `a-${a.id}`, at: a.createdAt.toISOString(), who: nameOf(a.userId),
      action: a.action,
      detail: typeof a.details.fileName === "string" ? a.details.fileName : null,
    })),
    ...transitions.map((t) => ({
      id: `t-${t.id}`, at: t.createdAt.toISOString(), who: nameOf(t.actorId),
      action: `${t.fromState} → ${t.toState}`,
      detail: t.comment,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);

  return {
    data: {
      versions: (versions ?? []).map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
      events,
    },
  };
}
