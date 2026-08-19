import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActorContext } from "@/lib/audit";
import { teacherClassIds } from "@/lib/studentScope";
import { BUCKET, currentAcademicYear } from "@/lib/studentFile";
import { sanitizeFileName } from "@/lib/studentFileLimits";
import type { Prisma, SchoolDocStatus, EducationalCycle } from "../generated/prisma/client";

/**
 * Centre documentaire de l'établissement — lot 15.
 *
 * ═══ CE N'EST PAS LE DOSSIER ÉLÈVE, ET CE NE DOIT JAMAIS LE DEVENIR ═══
 *
 *   `StudentDocument`  ce qui appartient à UN ENFANT  (extrait, certificat médical)
 *   `SchoolDocument`   ce que l'ÉCOLE produit         (fournitures, règlement, manuels)
 *
 * Les deux vivent dans le même bucket privé, sous deux préfixes distincts, et
 * n'ont **aucun chemin de lecture commun**. Rien ici ne lit `StudentDocument`,
 * et rien du dossier élève ne lit cette table. Une pièce ne se déplace pas de
 * l'une à l'autre : ce serait publier le dossier médical d'un enfant dans une
 * bibliothèque destinée aux familles.
 *
 * ═══ LE CHEMIN OUVRE LA PORTE, LA PORTÉE DÉCIDE DU CONTENU ═══
 *
 * `hasAccess()` dit qui peut ENTRER dans le centre. `documentScope()` dit ce que
 * chacun y VOIT — et c'est là que se joue le §23. Sans cette seconde borne, un
 * parent entrant dans le centre y verrait les brouillons de la direction, et un
 * enseignant les fournitures de classes qui ne sont pas les siennes.
 *
 * ⚠️ **Un document non publié n'existe pas hors de la direction.** C'est la
 * règle la plus importante du lot : un brouillon présenté à une famille serait
 * pris pour un document officiel.
 */

/** Préfixe Storage du centre. Un segment littéral : aucun UUID d'élève ne peut y ressembler. */
export const SCHOOL_PREFIX = "__etablissement__";

export const CENTRE_PATH = "/dashboard/documents/centre";
export const CENTRE_MANAGE_PATH = "/dashboard/documents/centre/gestion";

/** Chemin Storage d'un document d'établissement — construit côté serveur uniquement. */
export function schoolStoragePath(schoolId: string, documentId: string, fileName: string): string {
  return `${schoolId}/${SCHOOL_PREFIX}/${documentId}/${sanitizeFileName(fileName)}`;
}

/* ═══════════════════ portée : ce que chaque rôle voit ═══════════════════ */

/**
 * Filtre Prisma bornant les documents visibles par l'acteur.
 *
 * Il commence TOUJOURS par `schoolId` : la borne de rôle s'ajoute à l'isolation
 * multi-établissement, elle ne la remplace jamais.
 *
 *   direction (OWNER/ADMIN)  tout, y compris brouillons — c'est son autorité
 *   secrétariat              tout : il PRÉPARE les documents officiels
 *   assistance, comptabilité les documents PUBLIÉS
 *   enseignant               publiés, de portée établissement ou de SES classes
 *   parent                   publiés, destinés aux FAMILLES, de la portée de SES enfants
 *   tout autre rôle          rien
 *
 * ⚠️ Le cas `PARENT` n'est pas théorique : `PARENT` possède `/dashboard/documents`
 * et hérite donc du centre par préfixe. Sans cette borne, il verrait les
 * brouillons de la direction — la fuite exacte des lots 11.1 et 12.2.
 */
export async function documentScope(actor: ActorContext): Promise<Prisma.SchoolDocumentWhereInput> {
  const school = { schoolId: actor.schoolId };
  const published = { ...school, status: "PUBLISHED" as SchoolDocStatus };

  switch (actor.role) {
    case "OWNER":
    case "ADMIN":
    case "SECRETARY":
      return school;

    case "ASSISTANT":
    case "ACCOUNTANT":
      return published;

    case "TEACHER": {
      const classIds = await teacherClassIds(actor);
      const classes = classIds.length
        ? await prisma.class.findMany({
            where: { schoolId: actor.schoolId, id: { in: classIds } },
            select: { id: true, cycle: true },
          })
        : [];
      const cycles = [...new Set(classes.map((c) => c.cycle))];
      return {
        ...published,
        OR: [
          { scopeKind: "SCHOOL" },
          { scopeKind: "CYCLE", cycle: { in: cycles } },
          { scopeKind: "CLASS", classId: { in: classIds } },
        ],
      };
    }

    case "PARENT": {
      // Portée réelle des enfants : leurs classes et les cycles de ces classes.
      const enrollments = await prisma.enrollment.findMany({
        where: { student: { schoolId: actor.schoolId, parentId: actor.userId } },
        select: { classId: true, class: { select: { cycle: true } } },
      });
      const classIds = [...new Set(enrollments.map((e) => e.classId))];
      const cycles = [...new Set(enrollments.map((e) => e.class.cycle))];
      return {
        ...published,
        audience: "FAMILIES",
        OR: [
          { scopeKind: "SCHOOL" },
          { scopeKind: "CYCLE", cycle: { in: cycles } },
          { scopeKind: "CLASS", classId: { in: classIds } },
        ],
      };
    }

    default:
      // Fermeture par défaut : un rôle ajouté demain ne voit rien tant que sa
      // règle n'est pas écrite ici.
      return { ...school, id: { in: [] } };
  }
}

/** Vrai si l'acteur a le droit de voir CE document. */
export async function canSeeDocument(actor: ActorContext, documentId: string): Promise<boolean> {
  const scope = await documentScope(actor);
  // ⚠️ `AND`, jamais un étalement : `{ ...scope, id }` écraserait la clé `id` du
  // refus par défaut et retournerait la fermeture en ouverture (piège du lot 13.1).
  const n = await prisma.schoolDocument.count({
    where: { AND: [scope, { id: documentId, schoolId: actor.schoolId }] },
  });
  return n > 0;
}

/* ═══════════════════ recherche et filtres ═══════════════════ */

export type DocumentQuery = {
  q?: string;
  folderId?: string | null;
  status?: SchoolDocStatus | null;
  audience?: string | null;
  academicYear?: string | null;
  cycle?: EducationalCycle | null;
  classId?: string | null;
  /** `true` : uniquement les documents des 30 derniers jours. */
  recent?: boolean;
};

/** Fenêtre de « récent ». 30 jours : une rentrée se prépare sur ce rythme. */
export const RECENT_DAYS = 30;

/**
 * Documents visibles, filtrés.
 *
 * ⚠️ **La recherche porte sur les MÉTADONNÉES**, pas seulement sur le nom du
 * fichier : titre, description, matière, et nom de fichier en dernier recours.
 * Chercher « fournitures » doit trouver un document intitulé « Fournitures CM2 »
 * même si son fichier s'appelle `scan_0012.pdf`.
 *
 * ⚠️ Seules les versions COURANTES sont listées. Une version remplacée reste en
 * base et reste consultable depuis la lignée du document, mais elle n'encombre
 * pas la bibliothèque.
 */
export async function listDocuments(actor: ActorContext, query: DocumentQuery = {}) {
  const scope = await documentScope(actor);

  const filters: Prisma.SchoolDocumentWhereInput[] = [scope, { supersededAt: null }];

  if (query.q?.trim()) {
    const q = query.q.trim();
    filters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { fileName: { contains: q, mode: "insensitive" } },
        { academicYear: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (query.folderId !== undefined && query.folderId !== null) filters.push({ folderId: query.folderId });
  if (query.status) filters.push({ status: query.status });
  if (query.audience) filters.push({ audience: query.audience as never });
  if (query.academicYear) filters.push({ academicYear: query.academicYear });
  if (query.cycle) filters.push({ cycle: query.cycle });
  if (query.classId) filters.push({ classId: query.classId });
  if (query.recent) {
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
    filters.push({ updatedAt: { gte: since } });
  }

  return prisma.schoolDocument.findMany({
    where: { AND: filters },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    select: {
      id: true, title: true, description: true, status: true, audience: true,
      scopeKind: true, cycle: true, classId: true, academicYear: true, subject: true,
      fileName: true, mimeType: true, sizeBytes: true, version: true,
      folderId: true, publishedAt: true, createdAt: true, updatedAt: true,
      supersedesId: true,
      class: { select: { name: true } },
      folder: { select: { name: true } },
    },
  });
}

/** Dossiers de l'école, avec le nombre de documents VISIBLES par l'acteur. */
export async function listFolders(actor: ActorContext) {
  const scope = await documentScope(actor);
  const [folders, counts] = await Promise.all([
    prisma.documentFolder.findMany({
      where: { schoolId: actor.schoolId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, icon: true, parentId: true, position: true },
    }),
    prisma.schoolDocument.groupBy({
      by: ["folderId"],
      where: { AND: [scope, { supersededAt: null }] },
      _count: { _all: true },
    }),
  ]);
  // ⚠️ Le compteur porte sur ce que l'acteur voit, pas sur ce qui existe : un
  // parent lisant « Fournitures (12) » puis n'en voyant que deux croirait à un bogue.
  const byFolder = new Map(counts.map((c) => [c.folderId ?? "", c._count._all]));
  return folders.map((f) => ({ ...f, documentCount: byFolder.get(f.id) ?? 0 }));
}

/** Valeurs réellement présentes en base, pour peupler les filtres. */
export async function filterFacets(actor: ActorContext) {
  const scope = await documentScope(actor);
  const [years, classes] = await Promise.all([
    prisma.schoolDocument.findMany({
      where: { AND: [scope, { supersededAt: null }, { academicYear: { not: null } }] },
      select: { academicYear: true },
      distinct: ["academicYear"],
      orderBy: { academicYear: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: actor.schoolId },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    // ⚠️ Aucune année codée en dur. Les années proposées sont celles réellement
    // portées par des documents, plus l'année courante déduite du calendrier.
    years: [...new Set([currentAcademicYear(), ...years.map((y) => y.academicYear!)])].sort().reverse(),
    classes,
  };
}

/** Lignée complète d'un document : version courante et versions antérieures. */
export async function documentVersions(actor: ActorContext, documentId: string) {
  if (!(await canSeeDocument(actor, documentId))) return null;

  const chain: { id: string; version: number; fileName: string; createdAt: Date; status: SchoolDocStatus; current: boolean }[] = [];
  let cursor: string | null = documentId;
  const seen = new Set<string>();

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const doc: { id: string; version: number; fileName: string; createdAt: Date; status: SchoolDocStatus; supersedesId: string | null; supersededAt: Date | null } | null =
      await prisma.schoolDocument.findFirst({
        where: { id: cursor, schoolId: actor.schoolId },
        select: { id: true, version: true, fileName: true, createdAt: true, status: true, supersedesId: true, supersededAt: true },
      });
    if (!doc) break;
    chain.push({ id: doc.id, version: doc.version, fileName: doc.fileName, createdAt: doc.createdAt, status: doc.status, current: doc.supersededAt === null });
    cursor = doc.supersedesId;
  }
  return chain;
}

/* ═══════════════════ accès au fichier ═══════════════════ */

/**
 * URL de téléchargement temporaire.
 *
 * ⚠️ Même règle qu'au lot 13 : bucket privé, URL signée courte, jamais d'URL
 * publique. Le chemin n'est pas reçu du client — il est relu depuis la ligne,
 * elle-même bornée par la portée. Deviner un chemin Storage ne donne rien.
 */
export async function schoolDocUrl(
  actor: ActorContext,
  documentId: string,
  expiresInSeconds = 120,
): Promise<{ url: string; fileName: string; mimeType: string } | { error: string }> {
  const NOT_FOUND = { error: "Document introuvable dans votre établissement." };

  const doc = await prisma.schoolDocument.findFirst({
    where: { id: documentId, schoolId: actor.schoolId },
    select: { storagePath: true, fileName: true, mimeType: true },
  });
  if (!doc) return NOT_FOUND;
  // Message identique dans les deux cas : distinguer « pas le droit » de
  // « n'existe pas » confirmerait l'existence du document.
  if (!(await canSeeDocument(actor, documentId))) return NOT_FOUND;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storagePath, expiresInSeconds);
  if (error || !data) return { error: `Le lien n'a pas pu être créé (${error?.message ?? "inconnu"}).` };
  return { url: data.signedUrl, fileName: doc.fileName, mimeType: doc.mimeType };
}
