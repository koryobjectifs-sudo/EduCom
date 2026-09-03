import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { studentWhereFor } from "@/lib/studentScope";
import { studentFile } from "@/lib/studentFile";

/**
 * Chargement de la fiche élève « Student 360 ».
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * La fiche montrait cinq cartes tirées d'UNE seule lecture. Les données qui
 * font le quotidien d'un établissement — présences, notes, bulletins,
 * échanges avec la famille — existaient depuis longtemps dans le schéma et
 * n'étaient affichées NULLE PART sur l'élève. La recherche sur les systèmes
 * d'information scolaires dit la même chose : la valeur d'une fiche 360 vient
 * de voir la présence, la scolarité et l'argent AU MÊME ENDROIT, parce que
 * c'est ce qui permet d'intervenir tôt.
 *
 * ⚠️ **Aucune donnée n'est inventée et aucune règle métier n'est écrite ici.**
 * Ce module ne fait que LIRE des tables existantes. Les agrégats (taux de
 * présence, moyenne) sont des calculs d'affichage sur les lignes lues, pas des
 * indicateurs stockés.
 *
 * ⚠️ **La borne de rôle reste `studentWhereFor()`**, appliquée à l'élève
 * lui-même. Tout le reste est rattaché à cet élève : si l'acteur n'a pas le
 * droit de le voir, la fonction renvoie `null` et rien d'autre n'est lu.
 */

/** Sections de la fiche. L'ordre est celui de la barre de navigation. */
export const SECTIONS = [
  { cle: "apercu", label: "Vue générale" },
  { cle: "scolarite", label: "Scolarité" },
  { cle: "presence", label: "Présence" },
  { cle: "notes", label: "Notes" },
  { cle: "finance", label: "Finance" },
  { cle: "famille", label: "Famille & santé" },
  { cle: "documents", label: "Documents" },
] as const;

export type SectionCle = (typeof SECTIONS)[number]["cle"];

export function sectionValide(v: string | undefined): SectionCle {
  return SECTIONS.some((s) => s.cle === v) ? (v as SectionCle) : "apercu";
}

export async function loadStudent360(actor: ActorContext, id: string) {
  const scope = await studentWhereFor(actor);

  const student = await prisma.student.findFirst({
    where: { AND: [scope, { id, schoolId: actor.schoolId }] },
    include: {
      parent: true,
      enrollments: {
        include: { class: { include: { teacher: true } } },
        orderBy: { academicYear: "desc" },
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!student) return null;

  const classeCourante = student.enrollments[0]?.class ?? null;

  const [presencesParStatut, presencesRecentes, notes, bulletins, nbDocuments, conversations, matieres, dossier] =
    await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where: { studentId: id, schoolId: actor.schoolId },
        _count: { _all: true },
      }),
      prisma.attendance.findMany({
        where: { studentId: id, schoolId: actor.schoolId },
        orderBy: { date: "desc" },
        take: 10,
        include: { class: { select: { name: true } } },
      }),
      // Grade n'a pas de `schoolId` : il est rattaché par l'élève, déjà borné.
      prisma.grade.findMany({
        where: { studentId: id },
        orderBy: { date: "desc" },
        take: 40,
        include: { subject: { select: { name: true } }, term: { select: { name: true } } },
      }),
      prisma.reportCard.findMany({
        where: { studentId: id, schoolId: actor.schoolId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { term: { select: { name: true } }, class: { select: { name: true } } },
      }),
      prisma.studentDocument.count({
        where: { studentId: id, schoolId: actor.schoolId, supersededAt: null },
      }),
      prisma.whatsAppConversation.findMany({
        where: { schoolId: actor.schoolId, resolvedStudentId: id },
        orderBy: { lastActivityAt: "desc" },
        take: 5,
      }),
      classeCourante
        ? prisma.classSubject.findMany({
            where: { classId: classeCourante.id },
            include: { subject: { select: { name: true } } },
          })
        : Promise.resolve([]),
      // ⚠️ **Aucun calcul de complétude n'est écrit ici.** `studentFile()` est
      // la SEULE source de vérité pour la checklist documentaire — c'est elle
      // que le dossier lui-même affiche. Le badge de la fiche 360 lit son
      // `completeness`, il ne le recalcule pas : deux implémentations du même
      // pourcentage finiraient par diverger silencieusement.
      studentFile(actor, id),
    ]);

  /* ── agrégats d'AFFICHAGE, calculés sur les lignes lues ── */

  const compte = (s: string) => presencesParStatut.find((p) => p.status === s)?._count._all ?? 0;
  const present = compte("PRESENT");
  const absent = compte("ABSENT");
  const retard = compte("LATE");
  const excuse = compte("EXCUSED");
  const totalPresences = present + absent + retard + excuse;
  // Présent et excusé ne pénalisent pas : un absent justifié n'est pas un
  // décrochage. Retard compté comme présence, mais suivi à part.
  const tauxPresence =
    totalPresences > 0 ? Math.round(((present + retard + excuse) / totalPresences) * 100) : null;

  const surVingt = (v: number, max: number) => (max > 0 ? (v / max) * 20 : 0);
  const moyenne =
    notes.length > 0
      ? notes.reduce((s, n) => s + surVingt(n.value, n.max) * n.coefficient, 0) /
        notes.reduce((s, n) => s + n.coefficient, 0)
      : null;

  /** Moyenne par matière, sur les notes lues. */
  const parMatiere = [...
    notes.reduce((m, n) => {
      const nom = n.subject?.name ?? "Sans matière";
      const e = m.get(nom) ?? { nom, somme: 0, poids: 0, nombre: 0 };
      e.somme += surVingt(n.value, n.max) * n.coefficient;
      e.poids += n.coefficient;
      e.nombre += 1;
      m.set(nom, e);
      return m;
    }, new Map<string, { nom: string; somme: number; poids: number; nombre: number }>()).values(),
  ]
    .map((e) => ({ nom: e.nom, moyenne: e.poids > 0 ? e.somme / e.poids : 0, nombre: e.nombre }))
    .sort((a, b) => b.moyenne - a.moyenne);

  const duCumule = student.invoices
    .filter((i) => i.status === "PENDING" || i.status === "OVERDUE")
    .reduce((s, i) => s + i.totalAmount, 0);
  const enRetard = student.invoices.filter((i) => i.status === "OVERDUE").length;

  // ⚠️ L'âge est calculé ICI et non au rendu : `Date.now()` pendant le rendu
  // est une lecture impure que le linter React refuse, à juste titre.
  const age = student.dateOfBirth
    ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / 31_557_600_000)
    : null;

  return {
    student,
    age,
    classeCourante,
    matieres,
    presences: { present, absent, retard, excuse, total: totalPresences, taux: tauxPresence, recentes: presencesRecentes },
    notes: { liste: notes, moyenne, parMatiere },
    bulletins,
    nbDocuments,
    conversations,
    finance: { duCumule, enRetard, factures: student.invoices },
    // `dossier` est `null` seulement si `studentWhereFor()` refuse l'élève —
    // impossible ici puisque `student` a déjà été résolu avec la même borne.
    completeness: dossier?.completeness ?? null,
  };
}

export type Student360 = NonNullable<Awaited<ReturnType<typeof loadStudent360>>>;
