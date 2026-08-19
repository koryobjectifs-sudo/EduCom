import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActorContext } from "@/lib/audit";
import { canSeeCategory, canSeeStudent, scopeNotice, studentWhereFor, visibleCategories } from "@/lib/studentScope";
import { sanitizeFileName } from "@/lib/studentFileLimits";
import type {
  DocCategory, StudentKind, StudentDocStatus, EducationalCycle,
} from "../generated/prisma/client";

/**
 * Dossier numérique élève — lot 13.
 *
 * ═══ DEUX NOTIONS, JAMAIS CONFONDUES ═══
 *
 *   `DocumentRequirement`  ce que l'établissement EXIGE  (checklist configurable)
 *   `StudentDocument`      ce qu'il a RÉELLEMENT REÇU    (la pièce, dans Storage)
 *
 * Une pièce manquante n'a **aucune ligne** en base : elle n'existe que comme
 * exigence non satisfaite. C'est pour cela que la complétude se calcule depuis
 * la checklist, jamais depuis les documents reçus.
 *
 * ═══ AUCUNE LISTE NATIONALE N'EST CODÉE ═══
 *
 * Ce fichier ne connaît aucun nom de pièce. Les catégories (`DocCategory`) sont
 * des rayons de classement ; le contenu de chaque rayon est déclaré par chaque
 * école. Sans configuration, l'application dit « checklist non configurée » —
 * elle n'affiche pas 0 %, qui laisserait croire à un dossier vide alors que
 * c'est la règle qui manque.
 *
 * ═══ LE FICHIER N'EST JAMAIS EN BASE ═══
 *
 * Le binaire vit dans le bucket privé `student-documents`, sous
 * `{schoolId}/{studentId}/{documentId}/{nom}`. La base ne porte que les
 * métadonnées. Le base64 en colonne reste réservé au logo et au cachet (lot 00).
 */

export const BUCKET = "student-documents";

/* ═══════════════════ limites d'import (point 15) ═══════════════════ */

/**
 * ⚠️ Les limites d'import vivent dans `studentFileLimits.ts`, **sans import
 * Prisma** : l'écran de scan du lot 14 est un composant client et doit refuser
 * un fichier hors format ou trop lourd avant de l'envoyer. Ré-exportées ici pour
 * les appelants serveur, qui restent les seuls à décider.
 */
export {
  ALLOWED_MIME, MAX_BYTES, sanitizeFileName, checkFile, type FileCheck,
} from "@/lib/studentFileLimits";

/** Chemin Storage — construit côté serveur uniquement, jamais reçu du client. */
export function storagePathFor(schoolId: string, studentId: string, documentId: string, fileName: string): string {
  return `${schoolId}/${studentId}/${documentId}/${sanitizeFileName(fileName)}`;
}

/* ═══════════════════ type d'élève (point 9) ═══════════════════ */

/** Année scolaire courante, au format des `Enrollment` déjà en base. */
export function currentAcademicYear(ref: Date = new Date()): string {
  // L'année scolaire sénégalaise commence en octobre : avant septembre, on est
  // encore sur l'année ouverte l'automne précédent.
  const y = ref.getFullYear();
  return ref.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/**
 * Type d'un élève.
 *
 * ⚠️ **Dérivé des inscriptions réelles**, sauf déclaration explicite. Un élève
 * ayant une inscription sur une année antérieure est ANCIEN — c'est un fait,
 * pas une convention. Stocker ce type dans une colonne aurait créé une seconde
 * vérité pouvant contredire `Enrollment`.
 *
 * TRANSFERT n'est dérivable d'aucune donnée : rien ne dit qu'un élève vient
 * d'un autre établissement. Il ne peut venir que de `kindOverride`.
 */
export function resolveStudentKind(
  student: { kindOverride: StudentKind | null; enrollments: { academicYear: string }[] },
  year = currentAcademicYear(),
): StudentKind {
  if (student.kindOverride) return student.kindOverride;
  return student.enrollments.some((e) => e.academicYear !== year) ? "ANCIEN" : "NOUVEAU";
}

/* ═══════════════════ expiration (lot 13.1) ═══════════════════ */

/**
 * Date de péremption d'une pièce.
 *
 * ⚠️ **Aucune durée n'est supposée.** Sans `validityMonths` sur l'exigence, la
 * fonction renvoie `null` : la pièce ne périme pas. C'est la règle de
 * l'établissement qui décide, jamais ce fichier — un extrait de naissance ne
 * périme nulle part, un certificat médical périme dans certaines écoles et pas
 * dans d'autres.
 *
 * ⚠️ **Débordement de fin de mois.** `setMonth()` fait glisser le 31 janvier
 * + 1 mois au 3 mars, parce que février n'a pas de 31. On ramène alors au
 * dernier jour du mois visé : trois jours de validité offerts sur une pièce
 * d'identité, c'est peu ; sur un certificat médical de sept jours, c'est 40 %.
 */
export function expiryFor(receivedAt: Date, validityMonths: number | null | undefined): Date | null {
  if (validityMonths == null || validityMonths <= 0) return null;
  const d = new Date(receivedAt);
  const day = d.getDate();
  d.setMonth(d.getMonth() + validityMonths);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

/**
 * État réellement affiché d'une pièce, expiration comprise.
 *
 * ═══ POURQUOI L'EXPIRATION SE CALCULE ET NE SE STOCKE PAS ═══
 *
 * `EXPIRED` n'est jamais écrit dans `status`. Le faire créerait une seconde
 * vérité pouvant contredire la première : le jour où la direction passe la
 * validité de 12 à 6 mois, la colonne resterait sur l'ancienne règle, et rien
 * ne dirait laquelle des deux fait foi. Même raisonnement que `StudentKind`,
 * dérivé des inscriptions, et que l'ordre des trimestres, dérivé des dates.
 *
 * Écrire `EXPIRED` détruirait en outre l'information de contrôle : une pièce
 * validée puis périmée redeviendrait indistinguable d'une pièce jamais relue.
 * Ici `status` garde la trace du contrôle, l'expiration s'ajoute par-dessus.
 *
 * ⚠️ **Un rejet l'emporte sur une expiration.** Les deux demandent une nouvelle
 * pièce, mais seul le rejet porte un motif à lire. Afficher « expiré » sur une
 * pièce rejetée ferait disparaître ce motif de l'écran.
 *
 * Aucun cron, aucune tâche de fond : la comparaison se fait à la lecture, côté
 * serveur, et le résultat est vrai à la seconde où il est affiché. Un balayage
 * nocturne, lui, serait faux jusqu'à onze heures de suite.
 */
export function effectiveStatus(
  raw: StudentDocStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): StudentDocStatus {
  if (raw === "REJECTED") return raw;
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return raw;
}

/* ═══════════════════ checklist et complétude ═══════════════════ */

export type ChecklistLine = {
  requirementId: string;
  label: string;
  category: DocCategory;
  /** Durée de validité exigée, en mois. `null` = la pièce ne périme pas. */
  validityMonths: number | null;
  /** La pièce courante, ou `null` si aucune n'a jamais été reçue. */
  document: {
    id: string; fileName: string; mimeType: string; sizeBytes: number;
    status: StudentDocStatus; uploadedAt: Date; expiresAt: Date | null;
    reviewNote: string | null; academicYear: string | null;
    /** Nombre de versions antérieures conservées. */
    previousVersions: number;
  } | null;
  /** État affiché : celui du document, ou MISSING si aucun. */
  status: StudentDocStatus;
  /** Vrai si la pièce existe mais provient d'une année scolaire antérieure. */
  needsUpdate: boolean;
};

export type Completeness = {
  /** `null` = aucune checklist configurée. À distinguer d'un dossier vide. */
  configured: boolean;
  required: number;
  received: number;
  toVerify: number;
  validated: number;
  rejected: number;
  expired: number;
  missing: number;
  /** Pourcentage sur la checklist réelle. `null` si non configurée. */
  percent: number | null;
};

/**
 * Exigences applicables à un élève.
 *
 * Une exigence s'applique si **chacun** de ses filtres renseignés correspond ;
 * un filtre NULL signifie « tous ». C'est un ET, pas un OU : une exigence visant
 * le collège ET l'année 2025-2026 ne s'applique pas à un élémentaire.
 */
export async function requirementsFor(
  actor: ActorContext,
  opts: { classId: string | null; cycle: EducationalCycle | null; kind: StudentKind; year: string },
) {
  const rows = await prisma.documentRequirement.findMany({
    where: {
      schoolId: actor.schoolId,
      active: true,
      AND: [
        { OR: [{ cycle: null }, { cycle: opts.cycle ?? undefined }] },
        { OR: [{ classId: null }, { classId: opts.classId ?? undefined }] },
        { OR: [{ academicYear: null }, { academicYear: opts.year }] },
        { OR: [{ studentKind: null }, { studentKind: opts.kind }] },
      ],
    },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });
  return rows;
}

/**
 * Dossier complet d'un élève : checklist résolue + pièces hors checklist.
 *
 * ⚠️ `schoolId` de la session est appliqué **et** l'appartenance de l'élève est
 * vérifiée : un identifiant d'élève venu de l'URL ne prouve rien.
 */
export async function studentFile(actor: ActorContext, studentId: string) {
  // ⚠️ **Deux bornes, pas une.** `schoolId` interdit de lire l'élève d'un autre
  // établissement ; `studentWhereFor()` interdit à un enseignant de lire un
  // élève de SON école qui n'est pas dans ses classes. La seconde manquait au
  // lot 13 : l'audit a montré qu'un enseignant ouvrait alors le dossier complet
  // — pièces de santé comprises — de n'importe quel élève.
  //
  // `AND` et non un étalement : `{ ...scope, id }` écraserait la clé `id` du
  // refus par défaut et retournerait la fermeture en ouverture.
  const scope = await studentWhereFor(actor);
  const student = await prisma.student.findFirst({
    where: { AND: [scope, { id: studentId, schoolId: actor.schoolId }] },
    select: {
      id: true, firstName: true, lastName: true, status: true, kindOverride: true,
      dateOfBirth: true, address: true, bloodGroup: true, emergencyContact: true, emergencyPhone: true,
      createdAt: true,
      parent: { select: { firstName: true, lastName: true, email: true, phone: true } },
      enrollments: {
        select: { academicYear: true, createdAt: true, class: { select: { id: true, name: true, cycle: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!student) return null;

  const year = currentAcademicYear();
  const now = new Date();
  const kind = resolveStudentKind(student, year);
  const current = student.enrollments[0] ?? null;

  // `null` = aucune restriction. Distinct d'une liste complète : il permet de
  // ne PAS annoncer une vue partielle à qui voit tout.
  const allowed = visibleCategories(actor);

  const [allRequirements, allDocuments] = await Promise.all([
    requirementsFor(actor, {
      classId: current?.class.id ?? null,
      cycle: current?.class.cycle ?? null,
      kind,
      year,
    }),
    prisma.studentDocument.findMany({
      // Seules les pièces COURANTES : une version remplacée reste en base pour
      // l'historique mais ne doit pas apparaître deux fois dans le dossier.
      where: { schoolId: actor.schoolId, studentId, supersededAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // ⚠️ Le filtre porte sur les DEUX tables, pas seulement sur les exigences.
  // La catégorie d'une pièce est enregistrée sur la pièce elle-même : rien ne
  // garantit qu'elle soit restée celle de son exigence. Filtrer d'un seul côté
  // laisserait passer une pièce de santé versée sous une exigence de scolarité.
  const requirements = allowed === null ? allRequirements : allRequirements.filter((r) => allowed.includes(r.category));
  const documents = allowed === null ? allDocuments : allDocuments.filter((d) => allowed.includes(d.category));

  // Compte des versions antérieures, par pièce courante.
  const superseded = await prisma.studentDocument.groupBy({
    by: ["requirementId"],
    where: { schoolId: actor.schoolId, studentId, supersededAt: { not: null } },
    _count: { _all: true },
  });
  const previousByReq = new Map(superseded.map((s) => [s.requirementId ?? "", s._count._all]));

  const byRequirement = new Map(documents.filter((d) => d.requirementId).map((d) => [d.requirementId!, d]));

  const lines: ChecklistLine[] = requirements.map((r) => {
    const d = byRequirement.get(r.id) ?? null;
    // ⚠️ L'échéance est RECALCULÉE depuis la règle en vigueur, pas relue dans la
    // colonne. La colonne est une copie datée du dépôt : si la direction change
    // la durée de validité, c'est la nouvelle règle qui doit s'appliquer, sinon
    // deux vérités coexistent sans arbitre.
    const expiresAt = d ? expiryFor(d.createdAt, r.validityMonths) : null;
    return {
      requirementId: r.id,
      label: r.label,
      category: r.category,
      validityMonths: r.validityMonths,
      document: d
        ? {
            id: d.id, fileName: d.fileName, mimeType: d.mimeType, sizeBytes: d.sizeBytes,
            status: d.status, uploadedAt: d.createdAt, expiresAt,
            reviewNote: d.reviewNote, academicYear: d.academicYear,
            previousVersions: previousByReq.get(r.id) ?? 0,
          }
        : null,
      status: d ? effectiveStatus(d.status, expiresAt, now) : "MISSING",
      // Point 9 : une pièce d'une année antérieure n'est pas manquante, elle est
      // à mettre à jour. La distinction évite de faire tout recommencer à un ancien.
      needsUpdate: Boolean(d && d.academicYear && d.academicYear !== year),
    };
  });

  // Pièce hors checklist : aucune exigence ne la régit, donc aucune règle de
  // validité à appliquer. Le seul élément disponible est la date éventuellement
  // portée par la ligne — on l'honore, sans en inventer une quand elle manque.
  const loose = documents
    .filter((d) => !d.requirementId)
    .map((d) => ({ ...d, status: effectiveStatus(d.status, d.expiresAt, now) }));

  const count = (st: StudentDocStatus) => lines.filter((l) => l.status === st).length;
  const received = lines.filter((l) => l.document !== null).length;
  const completeness: Completeness = {
    configured: requirements.length > 0,
    required: requirements.length,
    received,
    toVerify: count("TO_VERIFY"),
    validated: count("VALIDATED"),
    rejected: count("REJECTED"),
    expired: count("EXPIRED"),
    missing: count("MISSING"),
    percent: requirements.length === 0
      ? null // ⚠️ jamais 0 % : c'est la règle qui manque, pas les pièces.
      : Math.round((received / requirements.length) * 100),
  };

  return {
    student, kind, year, currentEnrollment: current, lines, loose, completeness,
    // Une vue partielle qui ne se présente pas comme telle est un mensonge par
    // omission : l'enseignant croirait le dossier vide alors qu'il est filtré.
    restricted: allowed !== null,
    notice: scopeNotice(actor),
  };
}

/* ═══════════════════ accès au fichier ═══════════════════ */

/**
 * URL de téléchargement temporaire.
 *
 * ⚠️ **Jamais d'URL publique permanente.** Le bucket est privé ; une URL signée
 * expire, ce qui limite la portée d'un lien qui fuiterait. L'appelant DOIT avoir
 * vérifié la session, l'école et l'appartenance de l'élève avant d'appeler.
 *
 * Le chemin n'est pas reçu du client : il est relu depuis la ligne, elle-même
 * filtrée par `schoolId`. Deviner un chemin Storage ne donne donc rien.
 */
export async function signedUrlFor(
  actor: ActorContext,
  documentId: string,
  expiresInSeconds = 120,
): Promise<{ url: string; fileName: string } | { error: string }> {
  const NOT_FOUND = { error: "Document introuvable dans votre établissement." };

  const doc = await prisma.studentDocument.findFirst({
    where: {
      id: documentId,
      schoolId: actor.schoolId,
      // Double verrou : l'élève doit lui aussi appartenir à l'école.
      student: { schoolId: actor.schoolId },
    },
    select: { storagePath: true, fileName: true, studentId: true, category: true },
  });
  if (!doc) return NOT_FOUND;

  // ⚠️ Lot 13.1 — les mêmes bornes que la lecture du dossier, appliquées ici
  // aussi. Une server action est un point d'entrée HTTP : elle est appelable
  // avec un `documentId` deviné, sans jamais ouvrir l'écran qui l'invoque.
  //
  // Le message d'erreur est **identique** dans les trois cas. En distinguer un
  // (« vous n'avez pas le droit ») confirmerait l'existence du document, donc
  // celle de l'élève, donc celle de la pièce de santé qu'on cherchait à cacher.
  if (!canSeeCategory(actor, doc.category)) return NOT_FOUND;
  if (!(await canSeeStudent(actor, doc.studentId))) return NOT_FOUND;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storagePath, expiresInSeconds, { download: doc.fileName });

  if (error || !data) return { error: `Le lien de téléchargement n'a pas pu être créé (${error?.message ?? "inconnu"}).` };
  return { url: data.signedUrl, fileName: doc.fileName };
}

/* ═══════════════════ libellés ═══════════════════ */

/**
 * ⚠️ Les libellés vivent désormais dans `studentFileLabels.ts`, **sans import
 * Prisma**. Ils sont ré-exportés ici pour les appelants serveur, mais un
 * composant `"use client"` doit importer le module de libellés directement :
 * passer par ce fichier lui ferait embarquer Prisma, `pg` et `dns` dans le
 * bundle navigateur, ce qui empêche la route de se compiler (lot 13.1).
 */
export {
  DOC_CATEGORY_LABELS, STUDENT_KIND_LABELS, categoryLabel, formatSize,
} from "@/lib/studentFileLabels";
