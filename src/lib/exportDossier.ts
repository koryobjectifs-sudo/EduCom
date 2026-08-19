import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { studentFile, currentAcademicYear } from "@/lib/studentFile";
import { studentWhereFor, visibleCategories } from "@/lib/studentScope";
import { DOC_CATEGORY_LABELS } from "@/lib/studentFileLabels";
import { safeSegment } from "@/lib/zip";
import type { DocCategory } from "../generated/prisma/client";

/**
 * Export des dossiers élèves — lot 16.
 *
 * ═══ L'EXPORT NE DÉCIDE RIEN : IL RECOPIE CE QUE L'ÉCRAN MONTRE ═══
 *
 * ⚠️ Tout part de `studentFile()`, la fonction du lot 13 déjà bornée par l'école,
 * par le périmètre du rôle (`studentWhereFor`) et par les catégories autorisées
 * (`visibleCategories`). L'export ne refait aucun de ces contrôles — il ne
 * pourrait que les affaiblir. Conséquences obtenues **gratuitement** et
 * vérifiées :
 *
 *   · un enseignant n'exporte que les élèves de ses classes ;
 *   · aucune pièce de santé n'entre dans son ZIP, même pour SON élève ;
 *   · un parent n'a pas d'export du tout — il n'a pas `/dashboard/students` ;
 *   · seules les versions COURANTES sortent (`supersededAt: null`) ;
 *   · l'expiration et les rejets sont ceux calculés au lot 13.1.
 *
 * ⚠️ **La complétude n'est pas recalculée.** Elle vient de `file.completeness`.
 * Une seconde arithmétique aurait fini par contredire l'écran du dossier — et
 * personne n'aurait su laquelle croire.
 *
 * ═══ EXPORTER N'EST PAS TRANSMETTRE ═══
 *
 * Télécharger un ZIP ne marque rien. La transmission est un **acte déclaré par
 * un humain**, enregistré séparément (voir `recordTransmission`). Confondre les
 * deux ferait qu'un secrétaire vérifiant un dossier le déclarerait transmis sans
 * le savoir.
 */

/* ═══════════════════ structure d'export ═══════════════════ */

/**
 * Ordre et numérotation des rayons de l'archive.
 *
 * ⚠️ **Structure d'EXPORT, pas structure du dossier.** Le dossier élève reste
 * organisé par la checklist configurable de l'école (lot 13) ; ceci ne fait que
 * ranger l'archive pour qu'un tiers s'y retrouve. La numérotation existe parce
 * qu'un explorateur de fichiers trie alphabétiquement : sans elle, « Santé »
 * arriverait avant « Scolarité ».
 *
 * ⚠️ Un rayon **vide n'est pas créé**. Un dossier « 04-Santé/ » vide dans une
 * archive laisse croire qu'on a perdu des pièces en route.
 */
export const EXPORT_FOLDERS: Record<DocCategory, string> = {
  IDENTITE: "01-Identité",
  INSCRIPTION: "02-Inscription",
  SCOLARITE: "03-Scolarité",
  TRANSFERT: "04-Transfert",
  SANTE: "05-Santé",
  EXAMENS: "06-Examens",
  AUTRES: "07-Autres",
};

/** Nom de fichier lisible : le libellé métier, jamais l'identifiant technique. */
export function exportFileName(label: string, fileName: string, suffix?: string): string {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const base = safeSegment(label) || safeSegment(fileName) || "document";
  const withSuffix = suffix ? `${base} (${suffix})` : base;
  // ⚠️ L'extension est reprise du fichier réel : la renommer mentirait sur son
  // type, et le binaire n'est jamais touché.
  return ext ? `${withSuffix}.${ext}` : withSuffix;
}

/* ═══════════════════ état d'un dossier ═══════════════════ */

export type DossierState = "PRET" | "INCOMPLET" | "A_VERIFIER" | "NON_CONFIGURE";

export const DOSSIER_STATE_LABELS: Record<DossierState, string> = {
  PRET: "Prêt",
  INCOMPLET: "Incomplet",
  A_VERIFIER: "À vérifier",
  NON_CONFIGURE: "Checklist non configurée",
};

/**
 * État d'un dossier, **dérivé** de la complétude du lot 13.
 *
 * ⚠️ Aucun état n'est stocké : il se déduit des pièces présentes. Une colonne
 * « prêt » pourrait contredire les pièces réelles, sans arbitre — le piège déjà
 * évité pour `StudentKind` et pour l'expiration.
 */
export function dossierState(c: { configured: boolean; missing: number; toVerify: number; rejected: number; expired: number }): DossierState {
  if (!c.configured) return "NON_CONFIGURE";
  if (c.missing > 0 || c.rejected > 0 || c.expired > 0) return "INCOMPLET";
  if (c.toVerify > 0) return "A_VERIFIER";
  return "PRET";
}

/* ═══════════════════ plan d'export ═══════════════════ */

export type ExportEntry = {
  documentId: string;
  storagePath: string;
  /** Chemin dans l'archive, relatif au dossier de l'élève. */
  path: string;
  sizeBytes: number;
  category: DocCategory;
};

export type StudentExportPlan = {
  studentId: string;
  studentName: string;
  folder: string;
  entries: ExportEntry[];
  /** Pièces exigées et absentes — listées, jamais fabriquées en faux fichiers. */
  missing: { label: string; category: string; reason: "MISSING" | "REJECTED" | "EXPIRED" }[];
  completeness: { configured: boolean; required: number; received: number; missing: number; toVerify: number; validated: number; rejected: number; expired: number; percent: number | null };
  state: DossierState;
  /** Catégories écartées par le périmètre du rôle. Annoncées, pas masquées. */
  excludedCategories: string[];
  /** Somme des tailles réelles en base — pas une estimation. */
  totalBytes: number;
};

/**
 * Construit le plan d'export d'un élève. `null` si l'élève n'est pas visible.
 *
 * @param includeVersions Action **explicite** (§21) : sans elle, seules les
 *   versions courantes sortent. Verser toutes les archives dans le dossier
 *   courant ferait douter de laquelle fait foi.
 */
export async function studentExportPlan(
  actor: ActorContext,
  studentId: string,
  opts: { includeVersions?: boolean } = {},
): Promise<StudentExportPlan | null> {
  const file = await studentFile(actor, studentId);
  if (!file) return null;

  const allowed = visibleCategories(actor);
  const excludedCategories = allowed === null
    ? []
    : (Object.keys(EXPORT_FOLDERS) as DocCategory[])
        .filter((c) => !allowed.includes(c))
        .map((c) => DOC_CATEGORY_LABELS[c]);

  const present = [
    ...file.lines.filter((l) => l.document).map((l) => ({
      id: l.document!.id, label: l.label, category: l.category, size: l.document!.sizeBytes, fileName: l.document!.fileName,
    })),
    ...file.loose.map((d) => ({ id: d.id, label: d.label, category: d.category, size: d.sizeBytes, fileName: d.fileName })),
  ];

  // ⚠️ Un seul aller-retour pour tous les chemins Storage : une requête par
  // pièce serait un N+1 qui se voit dès trente élèves.
  const ids = present.map((p) => p.id);
  const paths = ids.length
    ? await prisma.studentDocument.findMany({
        where: { id: { in: ids }, schoolId: actor.schoolId, studentId },
        select: { id: true, storagePath: true },
      })
    : [];
  const pathOf = new Map(paths.map((p) => [p.id, p.storagePath]));

  const entries: ExportEntry[] = [];
  for (const p of present) {
    const storagePath = pathOf.get(p.id);
    if (!storagePath) continue; // pièce sans objet : rien à écrire, rien à inventer
    entries.push({
      documentId: p.id,
      storagePath,
      path: `${EXPORT_FOLDERS[p.category]}/${exportFileName(p.label, p.fileName)}`,
      sizeBytes: p.size,
      category: p.category,
    });
  }

  if (opts.includeVersions) {
    const olds = await prisma.studentDocument.findMany({
      where: { schoolId: actor.schoolId, studentId, supersededAt: { not: null } },
      select: { id: true, label: true, category: true, fileName: true, storagePath: true, sizeBytes: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    // Les anciennes versions vivent à part, jamais mêlées aux courantes.
    olds
      .filter((o) => allowed === null || allowed.includes(o.category))
      .forEach((o, i) => {
        entries.push({
          documentId: o.id,
          storagePath: o.storagePath,
          path: `99-Versions antérieures/${EXPORT_FOLDERS[o.category]}/${exportFileName(o.label, o.fileName, `v${i + 1} — ${o.createdAt.toISOString().slice(0, 10)}`)}`,
          sizeBytes: o.sizeBytes,
          category: o.category,
        });
      });
  }

  const missing = file.lines
    .filter((l) => ["MISSING", "REJECTED", "EXPIRED"].includes(String(l.status)))
    .map((l) => ({ label: l.label, category: DOC_CATEGORY_LABELS[l.category], reason: String(l.status) as "MISSING" | "REJECTED" | "EXPIRED" }));

  const name = `${file.student.firstName} ${file.student.lastName}`;
  return {
    studentId,
    studentName: name,
    folder: safeSegment(name),
    entries,
    missing,
    completeness: file.completeness,
    state: dossierState(file.completeness),
    excludedCategories,
    totalBytes: entries.reduce((n, e) => n + e.sizeBytes, 0),
  };
}

/**
 * Plans d'export pour plusieurs élèves.
 *
 * ⚠️ **Les identifiants reçus sont filtrés AVANT tout** (§24) : une liste brute
 * venue du client ne prouve rien. `studentWhereFor()` réduit d'abord la liste
 * aux élèves réellement accessibles ; les autres disparaissent en silence — les
 * signaler confirmerait leur existence.
 */
export async function multiExportPlan(
  actor: ActorContext,
  studentIds: string[],
  opts: { includeVersions?: boolean } = {},
): Promise<{ plans: StudentExportPlan[]; requested: number; accessible: number }> {
  const unique = [...new Set(studentIds)].filter(Boolean).slice(0, 200);
  if (unique.length === 0) return { plans: [], requested: 0, accessible: 0 };

  const scope = await studentWhereFor(actor);
  const allowed = await prisma.student.findMany({
    where: { AND: [scope, { id: { in: unique }, schoolId: actor.schoolId }] },
    select: { id: true },
  });

  const plans: StudentExportPlan[] = [];
  for (const s of allowed) {
    const plan = await studentExportPlan(actor, s.id, opts);
    if (plan) plans.push(plan);
  }
  return { plans, requested: unique.length, accessible: plans.length };
}

/* ═══════════════════ nom de l'archive ═══════════════════ */

/** ⚠️ L'année vient du calendrier réel, jamais d'une constante. */
export function exportFileNameFor(plans: StudentExportPlan[], groupLabel?: string): string {
  const year = currentAcademicYear();
  if (plans.length === 1) return `Dossier-${safeSegment(plans[0].studentName).replace(/ /g, "-")}-${year}.zip`;
  const group = groupLabel ? safeSegment(groupLabel).replace(/ /g, "-") : `${plans.length}-eleves`;
  return `Dossiers-${group}-${year}.zip`;
}
