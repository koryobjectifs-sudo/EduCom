"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit, type ActorContext } from "@/lib/audit";
import {
  BUCKET, checkFile, sanitizeFileName, storagePathFor, signedUrlFor, currentAcademicYear, expiryFor,
} from "@/lib/studentFile";
import { canSeeCategory, canSeeStudent } from "@/lib/studentScope";
import { analyzeDocument, ocrCapability } from "@/lib/documentProposals";
import { prepareDiffusion, recordManualDelivery } from "@/lib/diffusion";
import type { ChannelId } from "@/lib/channels";
import type { DocCategory } from "../../../../../generated/prisma/client";

/**
 * Dossier numérique élève — actions serveur. Lot 13.
 *
 * ═══ AUCUNE MATRICE DE PERMISSIONS PARALLÈLE ═══
 *
 * Deux chemins existants suffisent, et ils étaient déjà taillés pour ça :
 *
 *   `/dashboard/students`            consulter, déposer, remplacer, télécharger
 *                                    → OWNER, ADMIN, TEACHER, SECRETARY, ASSISTANT
 *   `/dashboard/documents/validation` valider, rejeter
 *                                    → OWNER, ADMIN, SECRETARY
 *                                    (refusé à TEACHER et ASSISTANT par ROLE_DENIALS)
 *
 * C'est exactement la séparation déjà en place pour les bulletins : celui qui
 * dépose n'est pas celui qui valide. Aucun rôle n'est cité dans ce fichier.
 *
 * ⚠️ `PARENT` n'a PAS `/dashboard/students` : il n'accède donc pas au dossier.
 * Lui ouvrir un accès aurait exigé d'inventer une permission — hors périmètre,
 * et contraire à « utiliser exclusivement les permissions existantes ».
 *
 * ═══ TROIS VÉRIFICATIONS AVANT TOUTE OPÉRATION ═══
 *
 *   session → schoolId → l'élève appartient-il à cette école ? → le document ?
 *
 * Aucun `schoolId` ni chemin Storage ne vient jamais du client.
 *
 * ═══ LOT 14 — CE QUI A CHANGÉ, ET CE QUI N'A PAS CHANGÉ ═══
 *
 * Le scan et l'import réutilisent `uploadStudentDocument()` **sans le
 * contourner** : mêmes contrôles, même bucket, même chaînage de remplacement,
 * même audit. Trois ajouts, aucun retrait :
 *
 *   `source` / `pages`   d'où vient la pièce (import, scan) — écrit dans l'audit
 *   `proposal`           ce que l'analyse avait proposé et ce qui a été retenu
 *   `confirmReplace`     ⚠️ **le remplacement exige désormais une confirmation**
 *
 * Ce dernier point durcit le lot 13, il ne l'affaiblit pas : auparavant, déposer
 * une pièce sur une exigence déjà servie remplaçait l'existante sans un mot.
 * Un parcours de scan, où l'on enchaîne les pièces vite, rendait ce silence
 * dangereux. L'ancienne version reste conservée exactement comme avant.
 */

const READ_PATH = "/dashboard/students";
const REVIEW_PATH = "/dashboard/documents/validation";

function revalidateFile(studentId: string) {
  revalidatePath(`/dashboard/students/${studentId}/dossier`);
  revalidatePath(`/dashboard/students/${studentId}`);
}

/**
 * Vérifie que l'élève est **visible par l'appelant**.
 *
 * ⚠️ Lot 13.1 — la vérification ne se contente plus de l'école. `canSeeStudent()`
 * y ajoute le périmètre du rôle : un enseignant ne peut agir que sur les élèves
 * de ses classes, un parent que sur ses enfants. La version du lot 13 ne bornait
 * que par `schoolId`, ce qui rendait chaque action de ce fichier appelable sur
 * n'importe quel élève de l'établissement — un identifiant d'élève venu de l'URL
 * ne prouve rien, et une server action s'appelle sans passer par l'écran.
 */
async function assertStudent(ctx: ActorContext, studentId: string) {
  if (!(await canSeeStudent(ctx, studentId))) return null;
  return prisma.student.findFirst({
    where: { id: studentId, schoolId: ctx.schoolId },
    select: { id: true, firstName: true, lastName: true },
  });
}

/* ═════════════════════ dépôt et remplacement ═════════════════════ */

/**
 * Dépose une pièce, ou remplace celle déjà présente pour la même exigence.
 *
 * ⚠️ **Le remplacement n'écrase rien.** L'ancienne ligne est conservée, reçoit
 * `supersededAt`, et la nouvelle pointe vers elle. Le fichier précédent reste
 * dans le bucket : l'historique métier doit survivre au remplacement, et
 * supprimer le binaire rendrait une trace de rejet invérifiable.
 *
 * Le fichier arrive en `FormData` — un `File` traverse la frontière client →
 * server action nativement, sans passer par du base64.
 */
export async function uploadStudentDocument(formData: FormData) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const studentId = String(formData.get("studentId") ?? "");
  const requirementId = String(formData.get("requirementId") ?? "") || null;
  const label = String(formData.get("label") ?? "").trim();
  const category = (String(formData.get("category") ?? "AUTRES") || "AUTRES") as DocCategory;
  const file = formData.get("file");
  const source = String(formData.get("source") ?? "manuel");
  const folderId = String(formData.get("folderId") ?? "") || null;
  const pages = Number(formData.get("pages") ?? 0) || 0;
  // Ce que l'analyse avait proposé, et ce que l'humain en a fait. Conservé tel
  // quel : c'est la preuve que la décision finale n'a pas été prise par la machine.
  const proposal = (() => {
    const raw = String(formData.get("proposal") ?? "");
    if (!raw) return null;
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  })();

  const student = await assertStudent(ctx, studentId);
  if (!student) return { error: "Élève introuvable dans votre établissement." };
  if (!(file instanceof File)) return { error: "Aucun fichier reçu." };
  if (!label) return { error: "Le libellé de la pièce est obligatoire." };

  // Une pièce ne peut être versée que dans une catégorie que l'appelant a le
  // droit de voir : sans cela, un enseignant déposerait dans « Santé » un rayon
  // qui lui est ensuite invisible — et qu'il ne pourrait donc plus corriger.
  if (!canSeeCategory(ctx, category)) {
    return { error: "Cette catégorie de pièce ne relève pas de votre périmètre." };
  }

  // L'exigence citée doit elle aussi appartenir à l'école. On relit sa durée de
  // validité au passage : c'est elle, et elle seule, qui fixe l'échéance.
  let requirement: { category: DocCategory; validityMonths: number | null } | null = null;
  if (requirementId) {
    requirement = await prisma.documentRequirement.findFirst({
      where: { id: requirementId, schoolId: ctx.schoolId },
      select: { category: true, validityMonths: true },
    });
    if (!requirement) return { error: "Exigence introuvable dans votre établissement." };
    if (!canSeeCategory(ctx, requirement.category)) {
      return { error: "Cette catégorie de pièce ne relève pas de votre périmètre." };
    }
  }

  // ⚠️ Le rayon doit appartenir à l'école : l'identifiant vient du navigateur et
  // ne prouve rien. Sans ce contrôle, une pièce se rangerait dans le classeur
  // d'un autre établissement — invisible ici, visible là-bas.
  if (folderId) {
    const f = await prisma.studentDocFolder.count({ where: { id: folderId, schoolId: ctx.schoolId } });
    if (f === 0) return { error: "Dossier introuvable dans votre établissement." };
    // Un rayon personnalisé ne reçoit que des pièces hors checklist : une
    // exigence vise une catégorie, jamais un classeur.
    if (requirementId) return { error: "Une pièce exigée se range dans sa catégorie, pas dans un dossier personnalisé." };
  }

  const check = checkFile(file.type, file.name, file.size);
  if (!check.ok) return { error: check.error };

  // Pièce courante pour cette exigence, s'il y en a une.
  const previous = requirementId
    ? await prisma.studentDocument.findFirst({
        where: { schoolId: ctx.schoolId, studentId, requirementId, supersededAt: null },
        select: { id: true, fileName: true, status: true },
      })
    : null;

  // ⚠️ **Avant tout envoi.** Refuser après avoir déposé le binaire laisserait un
  // objet orphelin dans le bucket, que plus aucune ligne ne désignerait.
  if (previous && String(formData.get("confirmReplace") ?? "") !== "1") {
    return {
      needsConfirmation: {
        documentId: previous.id,
        fileName: previous.fileName,
        status: String(previous.status),
      },
    };
  }

  const id = crypto.randomUUID();
  // ⚠️ Lot 13.1 — l'échéance est écrite au dépôt, jamais devinée : `expiryFor()`
  // renvoie `null` quand l'exigence ne fixe aucune durée. La colonne est une
  // copie datée ; la lecture du dossier recalcule depuis la règle en vigueur,
  // qui reste l'arbitre si la direction change la durée plus tard.
  const receivedAt = new Date();
  const expiresAt = expiryFor(receivedAt, requirement?.validityMonths ?? null);
  const cleanName = sanitizeFileName(file.name);
  const path = storagePathFor(ctx.schoolId, studentId, id, cleanName);

  // 1. Le binaire part d'abord : si l'envoi échoue, aucune ligne orpheline ne
  //    reste en base à pointer vers un objet inexistant.
  const supabase = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (up.error) return { error: `Envoi du fichier impossible : ${up.error.message}` };

  // 2. Puis les métadonnées, et le chaînage du remplacement dans la même
  //    transaction — sinon une panne laisserait deux pièces « courantes ».
  try {
    await prisma.$transaction([
      prisma.studentDocument.create({
        data: {
          id, studentId, requirementId, label, category,
          storagePath: path, fileName: cleanName, mimeType: file.type, sizeBytes: file.size,
          status: "TO_VERIFY",
          academicYear: currentAcademicYear(),
          expiresAt,
          uploadedById: ctx.userId,
          schoolId: ctx.schoolId,
          folderId,
          supersedesId: previous?.id ?? null,
        },
      }),
      ...(previous
        ? [prisma.studentDocument.updateMany({
            where: { id: previous.id, schoolId: ctx.schoolId },
            data: { supersededAt: new Date() },
          })]
        : []),
    ]);
  } catch (e) {
    // La ligne n'a pas pu être écrite : le binaire est retiré pour ne pas
    // laisser un objet inaccessible dans le bucket.
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: `Enregistrement impossible : ${e instanceof Error ? e.message : "erreur inconnue"}` };
  }

  await recordAudit(ctx, {
    action: previous ? "studentDocument.replace" : "studentDocument.upload",
    entity: "studentDocument",
    entityId: id,
    outcome: "success",
    details: {
      studentId, label, fileName: cleanName, sizeBytes: file.size, mimeType: file.type,
      // Lot 14 — la provenance fait partie de l'histoire de la pièce : « scannée
      // en 3 pages depuis un téléphone » et « importée » ne se contrôlent pas de
      // la même façon. `AuditLog.details` porte déjà des objets libres ; aucune
      // table d'historique nouvelle n'est créée.
      source: ["scan", "import"].includes(source) ? source : "manuel",
      ...(pages > 0 ? { pages } : {}),
      ...(proposal ? { proposal } : {}),
      ...(previous ? { replacedId: previous.id, replacedFileName: previous.fileName, replacedStatus: previous.status } : {}),
    },
  });

  revalidateFile(studentId);
  return { data: { id, replaced: Boolean(previous) } };
}

/* ═════════════════════ validation / rejet ═════════════════════ */

/**
 * Contrôle d'une pièce par le secrétariat.
 *
 * ⚠️ Exige `REVIEW_PATH`, refusé à TEACHER et ASSISTANT dans `ROLE_DENIALS` :
 * celui qui dépose une pièce ne la valide pas lui-même. Un rejet doit être
 * motivé — sans motif, l'élève ne saurait pas quoi refaire.
 */
export async function reviewStudentDocument(input: { id: string; accept: boolean; note?: string }) {
  const auth = await requireActionContext(REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const doc = await prisma.studentDocument.findFirst({
    where: { id: input.id, schoolId: ctx.schoolId, student: { schoolId: ctx.schoolId } },
    select: { id: true, studentId: true, label: true, status: true, supersededAt: true, category: true },
  });
  // Message identique dans les trois cas : distinguer « pas le droit » de
  // « n'existe pas » confirmerait l'existence de la pièce, donc de l'élève.
  const NOT_FOUND = { error: "Document introuvable dans votre établissement." };
  if (!doc) return NOT_FOUND;
  if (!canSeeCategory(ctx, doc.category)) return NOT_FOUND;
  if (!(await canSeeStudent(ctx, doc.studentId))) return NOT_FOUND;
  if (doc.supersededAt) return { error: "Cette version a été remplacée — contrôlez la version courante." };
  if (!input.accept && !input.note?.trim()) return { error: "Un rejet doit être motivé." };

  const status = input.accept ? "VALIDATED" : "REJECTED";
  await prisma.studentDocument.updateMany({
    where: { id: doc.id, schoolId: ctx.schoolId },
    data: { status, reviewedById: ctx.userId, reviewedAt: new Date(), reviewNote: input.note?.trim() || null },
  });

  await recordAudit(ctx, {
    action: input.accept ? "studentDocument.validate" : "studentDocument.reject",
    entity: "studentDocument",
    entityId: doc.id,
    outcome: "success",
    details: { studentId: doc.studentId, label: doc.label, from: doc.status, to: status, note: input.note?.trim() ?? null },
  });

  revalidateFile(doc.studentId);
  return { success: true };
}

/* ═════════════════════ téléchargement ═════════════════════ */

/**
 * Lien de téléchargement temporaire.
 *
 * ⚠️ Le téléchargement est **tracé** : c'est un accès à une pièce
 * administrative d'un mineur, et « qui a téléchargé quoi, quand » fait partie de
 * l'historique exigé. La trace est écrite avant la remise du lien.
 */
export async function downloadStudentDocument(id: string) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const doc = await prisma.studentDocument.findFirst({
    where: { id, schoolId: ctx.schoolId, student: { schoolId: ctx.schoolId } },
    select: { id: true, studentId: true, label: true, fileName: true, category: true },
  });
  const NOT_FOUND = { error: "Document introuvable dans votre établissement." };
  if (!doc) return NOT_FOUND;
  // `signedUrlFor()` refait ces deux contrôles — c'est voulu : la fonction qui
  // fabrique le lien ne doit dépendre de la vigilance d'aucun appelant.
  if (!canSeeCategory(ctx, doc.category)) return NOT_FOUND;
  if (!(await canSeeStudent(ctx, doc.studentId))) return NOT_FOUND;

  const signed = await signedUrlFor(ctx, id, 120);
  if ("error" in signed) return { error: signed.error };

  await recordAudit(ctx, {
    action: "studentDocument.download",
    entity: "studentDocument",
    entityId: doc.id,
    outcome: "success",
    details: { studentId: doc.studentId, label: doc.label, fileName: doc.fileName, ttlSeconds: 120 },
  });

  return { data: { url: signed.url, fileName: signed.fileName } };
}

/* ═════════════════════ type d'élève ═════════════════════ */

/**
 * Déclare explicitement le type d'un élève.
 *
 * `null` remet la dérivation automatique (ancien / nouveau depuis les
 * inscriptions). Seul moyen d'exprimer TRANSFERT, qu'aucune donnée existante ne
 * permet de deviner.
 */
export async function setStudentKind(studentId: string, kind: "NOUVEAU" | "ANCIEN" | "TRANSFERT" | null) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const student = await assertStudent(ctx, studentId);
  if (!student) return { error: "Élève introuvable dans votre établissement." };

  await prisma.student.updateMany({
    where: { id: studentId, schoolId: ctx.schoolId },
    data: { kindOverride: kind },
  });

  await recordAudit(ctx, {
    action: "student.kind.set",
    entity: "student",
    entityId: studentId,
    outcome: "success",
    details: { kind },
  });

  revalidateFile(studentId);
  return { success: true };
}

/* ═════════════════════ analyse assistée (lot 14) ═════════════════════ */

/**
 * Propositions de classement pour une pièce à déposer.
 *
 * ⚠️ **Ne reçoit pas le fichier.** Seulement son nom. Aucun octet du document ne
 * quitte l'appareil pour être analysé — il n'y a d'ailleurs aujourd'hui aucun
 * service à qui l'envoyer, et c'est une propriété à préserver le jour où l'on
 * branchera une reconnaissance de texte.
 *
 * ⚠️ Ce que renvoie cette action est une **proposition**, jamais une décision :
 * rien n'est classé, rien n'est validé, rien n'est remplacé ici. L'action ne
 * modifie aucune donnée — elle n'écrit donc pas non plus dans l'audit, qui
 * enregistre les actes, pas les suggestions. Ce qui a été proposé ET retenu est
 * consigné au moment du dépôt, avec l'acteur qui l'a confirmé.
 */
export async function analyzeStudentDocument(input: { studentId: string; fileName: string }) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const analysis = await analyzeDocument(ctx, input);
  if (!analysis) return { error: "Élève introuvable dans votre établissement." };

  return { data: analysis };
}

/** État de la reconnaissance de texte, pour que l'écran n'ait rien à deviner. */
export async function documentOcrStatus() {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  return { data: ocrCapability() };
}

/* ═════════════════════ diffusion d'une pièce (lot 17) ═════════════════════ */

/**
 * Prépare la remise d'une pièce **au parent de cet enfant** — et n'envoie rien.
 *
 * ⚠️ **Aucun droit nouveau, et surtout aucun élargissement.** Les bornes sont
 * celles du lot 13.1, appliquées par `prepareDiffusion()` : catégorie visible
 * par le rôle, élève dans le périmètre. Un enseignant ne voit pas les pièces
 * `SANTE` — il ne peut donc pas les diffuser, et le message d'erreur est le même
 * que pour une pièce inexistante. En distinguer un confirmerait ce qu'on cache.
 *
 * ⚠️ **Le destinataire n'est jamais choisi.** Une pièce d'élève ne part que vers
 * le parent de cet élève : il n'existe pas de liste de diffusion pour un extrait
 * de naissance. Une erreur de sélection sur ce type de document ne se rattrape
 * pas.
 */
export async function prepareStudentDocumentDiffusion(id: string, channel: ChannelId) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };

  const prepared = await prepareDiffusion(auth.ctx, {
    target: { kind: "studentDocument", documentId: id },
    channel,
  });
  if ("error" in prepared) return { error: prepared.error };

  return { data: { ...prepared, sent: false } };
}

/** Enregistre que l'utilisateur a lui-même remis la pièce au parent. */
export async function confirmStudentDocumentDiffusion(input: {
  id: string; channel: ChannelId; parentIds: string[]; note?: string | null;
}) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };

  const done = await recordManualDelivery(auth.ctx, {
    target: { kind: "studentDocument", documentId: input.id },
    channel: input.channel,
    parentIds: input.parentIds,
    note: input.note ?? null,
  });
  if ("error" in done) return { error: done.error };

  return { data: done };
}

/* ═════════════════════ rayons personnalisés ═════════════════════ */

/**
 * Crée un rayon propre à l'établissement — « Bourse », « Cantine », « Transport ».
 *
 * ⚠️ **Un rayon personnalisé ne remplace aucune catégorie.** Les sept
 * `DocCategory` restent la classification officielle : elles portent les
 * exigences, les droits (`canSeeCategory`), la validation et l'export. Un rayon
 * est un classeur en plus, et il ne peut contenir que des pièces versées hors
 * checklist — une exigence vise une catégorie, jamais un classeur.
 *
 * ⚠️ Le rayon appartient à l'ÉCOLE, pas à l'élève depuis lequel on l'a créé :
 * un « Bourse » par enfant serait ingérable au bout de trois inscriptions.
 * L'unicité `(schoolId, name)` est portée par le schéma ; elle est vérifiée ici
 * aussi pour rendre un message lisible plutôt qu'une violation de contrainte.
 */
export async function createStudentDocFolder(name: string) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const propre = name.trim().replace(/\s+/g, " ");
  if (!propre) return { error: "Le nom du dossier est obligatoire." };
  if (propre.length > 40) return { error: "Le nom du dossier ne doit pas dépasser 40 caractères." };

  // ⚠️ Un rayon personnalisé qui reprend le nom d'une catégorie officielle
  // produirait deux « Santé » côte à côte, dont un seul reçoit les exigences.
  const officielles = ["identité", "identite", "inscription", "scolarité", "scolarite", "santé", "sante", "transfert", "examens", "autres"];
  if (officielles.includes(propre.toLowerCase())) {
    return { error: `« ${propre} » est déjà un dossier officiel. Choisissez un autre nom.` };
  }

  const existe = await prisma.studentDocFolder.findFirst({
    where: { schoolId: ctx.schoolId, name: propre },
    select: { id: true },
  });
  if (existe) return { error: `Le dossier « ${propre} » existe déjà.` };

  const dernier = await prisma.studentDocFolder.findFirst({
    where: { schoolId: ctx.schoolId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const folder = await prisma.studentDocFolder.create({
    data: { name: propre, schoolId: ctx.schoolId, position: (dernier?.position ?? -1) + 1 },
    select: { id: true, name: true },
  });

  await recordAudit(ctx, {
    action: "studentDocFolder.create",
    entity: "studentDocFolder",
    entityId: folder.id,
    details: { label: folder.name },
  });

  revalidatePath("/dashboard/students", "layout");
  return { data: folder };
}
