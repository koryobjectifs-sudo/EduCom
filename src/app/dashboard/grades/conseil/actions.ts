"use server";

/**
 * Server Actions du Bloc Conseil de Classe — lot 18/3C.
 *
 * ⚠️ PERMISSIONS : Réservé STRICTEMENT à la direction et l'administration
 * (OWNER et ADMIN). Rejette immédiatement tout TEACHER, PARENT ou ACCOUNTANT.
 *
 * ⚠️ RÈGLES MÉTIER :
 *   - Distinctions : proposition automatique selon moyenne (≥12, ≥14, ≥16),
 *     modifiable ou retirable par le conseil.
 *   - Sanctions : travail et conduite totalement séparés.
 *   - Décision d'orientation : STRICTEMENT au 3e trimestre (rejet si soumis en T1/T2).
 *   - Absences : agrégées depuis le module Attendance si disponible, sinon saisies.
 *   - Observations : titulaire en élémentaire, conseil de classe en secondaire.
 */
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import {
  assertClassInSchool,
  assertCanManageConseilDeClasse,
  assertStudentEnrolled,
} from "@/lib/notes/entryPermissions";
import {
  proposerDistinction,
  isTroisiemeTrimestre,
  type DistinctionType,
  type SanctionType,
  type DecisionOrientationType,
} from "@/lib/notes/conseil";
import { calculerClasseElementaire } from "@/lib/notes/elementaire-classe";
import { calculerClasseSecondaire } from "@/lib/notes/secondaire-classe";
import { pickCurrentTerm } from "@/lib/terms";

const PATH = "/dashboard/grades";

type Actor = { userId: string; role: string; schoolId: string };

export type ConseilEleveLigne = {
  studentId: string;
  firstName: string;
  lastName: string;
  moyenneGenerale: number | null;
  rang: number | null;
  distinctionProposee: DistinctionType | null;
  distinctionRetenue: DistinctionType | "AUCUNE" | null;
  sanctionTravail: SanctionType | "AUCUNE" | null;
  sanctionConduite: SanctionType | "AUCUNE" | null;
  decisionOrientation: DecisionOrientationType | "EN_ATTENTE" | null;
  absencesJustifiees: number;
  absencesNonJustifiees: number;
  hasAttendanceData: boolean;
  observation: string;
};

export type ConseilContext =
  | {
      ok: true;
      classId: string;
      className: string;
      cycle: "ELEMENTAIRE" | "SECONDAIRE";
      termId: string;
      termName: string;
      isT3: boolean;
      allTerms: { id: string; name: string }[];
      allClasses: { id: string; name: string; cycle: string }[];
      eleves: ConseilEleveLigne[];
    }
  | { ok: false; error: string };

export type SaveConseilReviewInput = {
  classId: string;
  termId: string;
  studentId: string;
  distinctionRetenue?: string | null;
  sanctionTravail?: string | null;
  sanctionConduite?: string | null;
  decisionOrientation?: string | null;
  absencesJustifiees?: number | null;
  absencesNonJustifiees?: number | null;
  observation?: string | null;
};

export async function getConseilContextWithActor(
  actor: Actor,
  classId: string,
  termId?: string,
): Promise<ConseilContext> {
  const perm = assertCanManageConseilDeClasse(actor);
  if (!perm.ok) return { ok: false, error: perm.error };

  const klass = await assertClassInSchool(classId, actor.schoolId);
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const [classe, allSchoolClasses, terms, enrollments] = await Promise.all([
    prisma.class.findUniqueOrThrow({
      where: { id: classId },
      select: { id: true, name: true, cycle: true, serie: true },
    }),
    prisma.class.findMany({
      where: { schoolId: actor.schoolId },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    }),
    prisma.term.findMany({
      where: { schoolId: actor.schoolId },
      select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
      orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    prisma.enrollment.findMany({
      where: { classId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
  ]);

  if (terms.length === 0) return { ok: false, error: "Aucun trimestre n'est encore déclaré." };
  if (enrollments.length === 0) return { ok: false, error: "Aucun élève n'est inscrit dans cette classe." };

  const { current } = pickCurrentTerm(terms);
  const term = terms.find((t) => t.id === termId) ?? current!;
  const isT3 = isTroisiemeTrimestre(term, terms);

  const isElementaire =
    classe.cycle === "ELEMENTAIRE" ||
    classe.cycle === "PRESCOLAIRE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
      classe.name.toLowerCase().trim().startsWith(l),
    );

  // Calcul des moyennes générales et rangs de la classe
  const studentIds = enrollments.map((e) => e.studentId);
  let moyennesMap = new Map<string, { mg: number | null; rang: number | null }>();

  if (isElementaire) {
    try {
      const calculElem = await calculerClasseElementaire({
        schoolId: actor.schoolId,
        classId,
        termId: term.id,
      });
      for (const el of calculElem.eleves) {
        moyennesMap.set(el.studentId, { mg: el.moyenneGenerale, rang: el.rang });
      }
    } catch {
      // Si pas encore de notes élémentaires
    }
  } else {
    try {
      const calculSec = await calculerClasseSecondaire({
        schoolId: actor.schoolId,
        classId,
        termId: term.id,
      });
      for (const el of calculSec.eleves) {
        moyennesMap.set(el.studentId, { mg: el.moyenneGenerale, rang: el.rang });
      }
    } catch {
      // Si pas encore de notes secondaires
    }
  }

  // Présences automatiques consolidées depuis le registre d'appel (Attendance)
  const attendanceCountsMap = new Map<string, { excuses: number; absents: number }>();
  let hasAttendanceModuleData = false;

  const dateFilter = term.startDate && term.endDate ? { gte: term.startDate, lte: term.endDate } : undefined;
  const agg = await prisma.attendance.groupBy({
    by: ["studentId", "status"],
    where: {
      schoolId: actor.schoolId,
      classId,
      studentId: { in: studentIds },
      ...(dateFilter ? { date: dateFilter } : {}),
      status: { in: ["ABSENT", "EXCUSED"] },
    },
    _count: { _all: true },
  });

  if (agg.length > 0) {
    hasAttendanceModuleData = true;
    for (const row of agg) {
      const cur = attendanceCountsMap.get(row.studentId) ?? { excuses: 0, absents: 0 };
      if (row.status === "EXCUSED") cur.excuses += row._count._all;
      if (row.status === "ABSENT") cur.absents += row._count._all;
      attendanceCountsMap.set(row.studentId, cur);
    }
  }

  // TermReviews existantes (délibérations du conseil)
  const reviews = await prisma.termReview.findMany({
    where: { classId, termId: term.id, studentId: { in: studentIds } },
  });
  const reviewMap = new Map(reviews.map((r) => [r.studentId, r]));

  const eleves: ConseilEleveLigne[] = enrollments.map((e) => {
    const rev = reviewMap.get(e.studentId);
    const mInfo = moyennesMap.get(e.studentId);
    const mg = mInfo?.mg ?? null;
    const rang = mInfo?.rang ?? null;
    const prop = proposerDistinction(mg);

    const att = attendanceCountsMap.get(e.studentId);
    // Les absences proviennent strictement du registre d'appel
    const absJust = att?.excuses ?? rev?.absencesJustifiees ?? 0;
    const absNonJust = att?.absents ?? rev?.absencesNonJustifiees ?? 0;

    return {
      studentId: e.studentId,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      moyenneGenerale: mg,
      rang,
      distinctionProposee: prop,
      distinctionRetenue: (rev?.distinctionRetenue as ConseilEleveLigne["distinctionRetenue"]) ?? null,
      sanctionTravail: (rev?.sanctionTravail as ConseilEleveLigne["sanctionTravail"]) ?? null,
      sanctionConduite: (rev?.sanctionConduite as ConseilEleveLigne["sanctionConduite"]) ?? null,
      decisionOrientation: isT3
        ? ((rev?.decisionOrientation as ConseilEleveLigne["decisionOrientation"]) ?? null)
        : null,
      absencesJustifiees: absJust,
      absencesNonJustifiees: absNonJust,
      hasAttendanceData: !!att,
      observation: isElementaire
        ? rev?.appreciationTitulaire ?? ""
        : rev?.observationsConseil ?? "",
    };
  });

  return {
    ok: true,
    classId,
    className: classe.name,
    cycle: isElementaire ? "ELEMENTAIRE" : "SECONDAIRE",
    termId: term.id,
    termName: term.name,
    isT3,
    allTerms: terms.map((t) => ({ id: t.id, name: t.name })),
    allClasses: allSchoolClasses.map((c) => ({ id: c.id, name: c.name, cycle: c.cycle })),
    eleves,
  };
}

export async function saveConseilReviewWithActor(
  actor: Actor,
  input: SaveConseilReviewInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const perm = assertCanManageConseilDeClasse(actor);
  if (!perm.ok) return { ok: false, error: perm.error };

  const klass = await assertClassInSchool(input.classId, actor.schoolId);
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const enrolled = await assertStudentEnrolled(input.studentId, input.classId);
  if (!enrolled) return { ok: false, error: "Cet élève n'est pas inscrit dans cette classe." };

  const terms = await prisma.term.findMany({
    where: { schoolId: actor.schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  const term = terms.find((t) => t.id === input.termId);
  if (!term) return { ok: false, error: "Trimestre introuvable." };

  const isT3 = isTroisiemeTrimestre(term, terms);

  // Garde-fou absolu : l'orientation n'existe qu'au 3e trimestre
  if (input.decisionOrientation && input.decisionOrientation !== "EN_ATTENTE" && !isT3) {
    return {
      ok: false,
      error: "La décision d'orientation est strictement réservée au 3e trimestre.",
    };
  }

  const classe = await prisma.class.findUniqueOrThrow({
    where: { id: input.classId },
    select: { cycle: true, name: true },
  });
  const isElementaire =
    classe.cycle === "ELEMENTAIRE" ||
    classe.cycle === "PRESCOLAIRE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
      classe.name.toLowerCase().trim().startsWith(l),
    );

  const cleanDistinction =
    input.distinctionRetenue === "AUCUNE" || !input.distinctionRetenue
      ? null
      : input.distinctionRetenue;

  const cleanSanctionTravail =
    input.sanctionTravail === "AUCUNE" || !input.sanctionTravail
      ? null
      : input.sanctionTravail;

  const cleanSanctionConduite =
    input.sanctionConduite === "AUCUNE" || !input.sanctionConduite
      ? null
      : input.sanctionConduite;

  const cleanOrientation =
    !isT3 || input.decisionOrientation === "EN_ATTENTE" || !input.decisionOrientation
      ? null
      : input.decisionOrientation;

  const cleanObs = input.observation?.trim() || null;

  await prisma.termReview.upsert({
    where: {
      studentId_termId: {
        studentId: input.studentId,
        termId: input.termId,
      },
    },
    create: {
      studentId: input.studentId,
      classId: input.classId,
      termId: input.termId,
      schoolId: actor.schoolId,
      distinctionRetenue: cleanDistinction,
      sanctionTravail: cleanSanctionTravail,
      sanctionConduite: cleanSanctionConduite,
      decisionOrientation: cleanOrientation,
      absencesJustifiees: Math.max(0, Number(input.absencesJustifiees ?? 0)),
      absencesNonJustifiees: Math.max(0, Number(input.absencesNonJustifiees ?? 0)),
      appreciationTitulaire: isElementaire ? cleanObs : null,
      observationsConseil: !isElementaire ? cleanObs : null,
      updatedById: actor.userId,
    },
    update: {
      distinctionRetenue: cleanDistinction,
      sanctionTravail: cleanSanctionTravail,
      sanctionConduite: cleanSanctionConduite,
      decisionOrientation: cleanOrientation,
      absencesJustifiees: Math.max(0, Number(input.absencesJustifiees ?? 0)),
      absencesNonJustifiees: Math.max(0, Number(input.absencesNonJustifiees ?? 0)),
      ...(isElementaire
        ? { appreciationTitulaire: cleanObs }
        : { observationsConseil: cleanObs }),
      updatedById: actor.userId,
    },
  });

  return { ok: true };
}

export async function getConseilContext(classId: string, termId?: string) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return getConseilContextWithActor(auth.ctx, classId, termId);
}

export async function saveConseilReview(input: SaveConseilReviewInput) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return saveConseilReviewWithActor(auth.ctx, input);
}
