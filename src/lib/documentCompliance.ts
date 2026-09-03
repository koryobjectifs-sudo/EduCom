import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { studentWhereFor } from "@/lib/studentScope";
import { requirementsFor, resolveStudentKind, currentAcademicYear } from "@/lib/studentFile";

/**
 * Vue d'ensemble de la conformité documentaire — un rôle, toute l'école.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * `studentFile()` calcule la complétude d'UN élève. Le portail de conformité
 * (Rapports › Secrétariat) en a besoin pour TOUS les élèves à la fois — appeler
 * `studentFile()` en boucle ferait 243 × ~5 requêtes pour l'établissement de
 * Kory, exactement la « requête séquentielle en boucle » que la règle 10 du
 * projet interdit pour toute opération de masse.
 *
 * ═══ LE BATCHING RETENU ═══
 *
 * Les pièces exigées ne dépendent que de (classe, cycle, type d'élève, année) —
 * PAS de l'élève lui-même. Un établissement de 243 élèves n'a typiquement que
 * quelques dizaines de classes : on appelle donc `requirementsFor()`, la
 * fonction déjà testée par le dossier élève, **une fois par combinaison
 * distincte**, jamais par élève. Aucune règle de correspondance n'est
 * dupliquée — c'est exactement la fonction que `studentFile()` appelle.
 *
 * Les pièces reçues sont lues en UNE requête pour toute l'école, puis
 * réparties en mémoire.
 *
 * ⚠️ **La définition de « conforme » est celle de `Completeness.received`** :
 * une exigence est satisfaite dès qu'un document existe pour elle, quel que
 * soit son statut (à vérifier, validé, rejeté, expiré compris). C'est la
 * définition du dossier élève lui-même — le badge de la fiche 360 et ce
 * portail doivent toujours s'accorder, sinon un chiffre contredirait l'autre
 * pour le même élève.
 */

export type ComplianceRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  cycle: string | null;
  required: number;
  received: number;
  percent: number;
  /** Complet à 100 %. */
  compliant: boolean;
};

export type ComplianceOverview = {
  /** Élèves dont AU MOINS une exigence s'applique. Les autres n'entrent dans aucun taux. */
  configured: ComplianceRow[];
  /** Élèves pour qui aucune checklist ne s'applique — ni conformes ni non conformes. */
  unconfigured: { studentId: string; firstName: string; lastName: string; className: string | null }[];
  compliantCount: number;
  nonCompliantCount: number;
  /** `null` si aucun élève n'a de checklist applicable. */
  complianceRate: number | null;
};

export async function documentComplianceOverview(actor: ActorContext): Promise<ComplianceOverview> {
  const scope = await studentWhereFor(actor);
  const year = currentAcademicYear();

  const students = await prisma.student.findMany({
    where: { AND: [scope, { schoolId: actor.schoolId }] },
    select: {
      id: true, firstName: true, lastName: true, kindOverride: true,
      enrollments: {
        select: { academicYear: true, class: { select: { id: true, name: true, cycle: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { lastName: "asc" },
  });

  // ── requis, une fois par combinaison distincte (classe, cycle, type) ──
  const requisParCombinaison = new Map<string, Awaited<ReturnType<typeof requirementsFor>>>();
  const combinaisonDe = (s: (typeof students)[number]) => {
    const current = s.enrollments[0] ?? null;
    const kind = resolveStudentKind(s, year);
    const classId = current?.class.id ?? null;
    const cycle = current?.class.cycle ?? null;
    return { key: `${classId ?? "∅"}|${kind}`, classId, cycle, kind, className: current?.class.name ?? null };
  };

  for (const s of students) {
    const c = combinaisonDe(s);
    if (!requisParCombinaison.has(c.key)) {
      requisParCombinaison.set(c.key, await requirementsFor(actor, { classId: c.classId, cycle: c.cycle, kind: c.kind, year }));
    }
  }

  // ── pièces reçues, une seule requête pour toute l'école ──
  const documents = await prisma.studentDocument.findMany({
    where: { schoolId: actor.schoolId, studentId: { in: students.map((s) => s.id) }, requirementId: { not: null }, supersededAt: null },
    select: { studentId: true, requirementId: true },
  });
  const recuesParEleve = new Map<string, Set<string>>();
  for (const d of documents) {
    if (!d.requirementId) continue;
    const set = recuesParEleve.get(d.studentId) ?? new Set<string>();
    set.add(d.requirementId);
    recuesParEleve.set(d.studentId, set);
  }

  const configured: ComplianceRow[] = [];
  const unconfigured: ComplianceOverview["unconfigured"] = [];

  for (const s of students) {
    const c = combinaisonDe(s);
    const requirements = requisParCombinaison.get(c.key) ?? [];
    if (requirements.length === 0) {
      unconfigured.push({ studentId: s.id, firstName: s.firstName, lastName: s.lastName, className: c.className });
      continue;
    }
    const recues = recuesParEleve.get(s.id) ?? new Set<string>();
    const received = requirements.filter((r) => recues.has(r.id)).length;
    const required = requirements.length;
    configured.push({
      studentId: s.id, firstName: s.firstName, lastName: s.lastName, className: c.className, cycle: c.cycle,
      required, received, percent: Math.round((received / required) * 100), compliant: received === required,
    });
  }

  const compliantCount = configured.filter((r) => r.compliant).length;
  const nonCompliantCount = configured.length - compliantCount;

  return {
    configured, unconfigured, compliantCount, nonCompliantCount,
    complianceRate: configured.length > 0 ? Math.round((compliantCount / configured.length) * 100) : null,
  };
}
