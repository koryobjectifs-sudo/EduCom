"use server";

/**
 * Saisie secondaire — lot 18/3. Par matière et par trimestre : Devoir 1/2/3,
 * Composition, MM en lecture seule (calculée par `src/lib/notes/secondaire.ts`,
 * lot 2 — non réécrit ici), appréciation du professeur.
 *
 * ⚠️ Un devoir n'est pas rattaché à une `Evaluation` : `Grade.evaluationId`
 * reste `null` ici (voir `Grade.type` : QUIZ/HOMEWORK = devoir, EXAM =
 * composition). Le "slot" (Devoir 1/2/3) est un rang d'affichage — ordre de
 * création parmi les devoirs de cette matière/trimestre/élève — jamais une
 * colonne stockée : chaque cellule reste identifiée par son `gradeId` propre,
 * exactement le principe déjà en place dans `saveOneGrade`.
 *
 * ⚠️ Même découpage `...WithActor` qu'`elementaire/actions.ts` — voir sa
 * note en tête pour la raison (session HTTP non simulable hors navigateur).
 */
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import {
  assertClassInSchool,
  assertCanEditSecondaireSubject,
  assertStudentEnrolled,
} from "@/lib/notes/entryPermissions";
import { calculerMatiereSecondaire } from "@/lib/notes/secondaire";
import { deriverNiveau } from "@/lib/notes/secondaire-classe";
import { resoudreCoefficient } from "@/lib/notes/coefficients";
import { pickCurrentTerm } from "@/lib/terms";

import { editableSubjectIds } from "@/lib/gradeEntry";

const PATH = "/dashboard/grades/secondaire";
const MAX_DEVOIRS = 3;

type Actor = { userId: string; role: string; schoolId: string };

export type SecondaireEleveLigne = {
  studentId: string;
  firstName: string;
  lastName: string;
  devoirs: { gradeId: string; value: number }[]; // 0 à 3, dans l'ordre de saisie
  composition: { gradeId: string; value: number } | null;
  appreciation: string;
  md: number | null;
  mm: number | null;
};

export type SecondaireContext =
  | {
      ok: true;
      classId: string; className: string;
      subjectId: string; subjectName: string; coefficient: number;
      termId: string; termName: string;
      allTerms: { id: string; name: string }[];
      allSubjects: { id: string; name: string; coefficient: number | null }[];
      allClasses: { id: string; name: string }[];
      lignes: SecondaireEleveLigne[];
    }
  | { ok: false; error: string; noSubjects?: boolean };


export async function getSecondaireContextWithActor(
  actor: Actor, classId: string, subjectId?: string, termId?: string,
): Promise<SecondaireContext> {
  const klass = await assertClassInSchool(classId, actor.schoolId);
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  let activeSubjectId = subjectId;
  if (!activeSubjectId) {
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { subject: { name: "asc" } },
    });
    if (classSubjects.length === 0) {
      return {
        ok: false,
        error: "Cette classe n'a aucune matière assignée. Veuillez lui affecter ses matières dans la configuration pédagogique pour pouvoir saisir les notes.",
        noSubjects: true,
      };
    }
    const editable = await editableSubjectIds(
      { id: actor.userId, role: actor.role },
      classId,
      classSubjects.map((cs) => cs.subjectId),
    );
    const firstAllowed = classSubjects.find((cs) =>
      editable === "ALL" ? true : editable.has(cs.subjectId),
    );
    if (!firstAllowed) return { ok: false, error: "Aucune matière ne vous est affectée dans cette classe." };
    activeSubjectId = firstAllowed.subjectId;
  }

  const perm = await assertCanEditSecondaireSubject({ userId: actor.userId, role: actor.role }, classId, activeSubjectId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const [classe, subject, enrollments, terms] = await Promise.all([
    prisma.class.findUniqueOrThrow({ where: { id: classId }, select: { name: true } }),
    prisma.subject.findUnique({ where: { id: activeSubjectId }, select: { name: true } }),
    prisma.enrollment.findMany({
      where: { classId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.term.findMany({
      where: { schoolId: actor.schoolId },
      select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
      orderBy: { startDate: "asc" },
    }),
  ]);
  if (!subject) return { ok: false, error: "Matière introuvable." };
  if (enrollments.length === 0) return { ok: false, error: "Aucun élève n'est inscrit dans cette classe." };
  if (terms.length === 0) return { ok: false, error: "Aucun trimestre n'est encore déclaré." };

  const { current } = pickCurrentTerm(terms);
  const term = terms.find((t) => t.id === termId) ?? current!;
  const studentIds = enrollments.map((e) => e.studentId);

  const [grades, appreciations, coefficient] = await Promise.all([
    prisma.grade.findMany({
      where: { classId, subjectId: activeSubjectId, termId: term.id, studentId: { in: studentIds } },
      select: { id: true, studentId: true, value: true, type: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subjectAppreciation.findMany({
      where: { subjectId: activeSubjectId, termId: term.id, studentId: { in: studentIds } },
      select: { studentId: true, comment: true },
    }),
    resoudreCoefficient(actor.schoolId, classId, activeSubjectId),
  ]);
  if (coefficient === null) {
    return {
      ok: false,
      error: `Le coefficient de la matière « ${subject.name} » n'est pas défini pour cette classe. Veuillez le configurer dans les paramètres pédagogiques.`,
    };
  }
  const appreciationParEleve = new Map(appreciations.map((a) => [a.studentId, a.comment]));

  const lignes: SecondaireEleveLigne[] = enrollments.map((e) => {
    const mesNotes = grades.filter((g) => g.studentId === e.studentId);
    const devoirs = mesNotes.filter((g) => g.type !== "EXAM").map((g) => ({ gradeId: g.id, value: g.value }));
    const compo = mesNotes.find((g) => g.type === "EXAM");

    const resultat = calculerMatiereSecondaire({
      subjectId: activeSubjectId, name: subject.name, coefficient,
      devoirs: devoirs.map((d) => d.value),
      composition: compo?.value ?? null,
    });

    return {
      studentId: e.studentId, firstName: e.student.firstName, lastName: e.student.lastName,
      devoirs,
      composition: compo ? { gradeId: compo.id, value: compo.value } : null,
      appreciation: appreciationParEleve.get(e.studentId) ?? "",
      md: resultat.md, mm: resultat.mm,
    };
  });

  // 1. Liste des trimestres
  const allTerms = terms.map((t) => ({ id: t.id, name: t.name }));

  // 2. Matières autorisées pour cet acteur dans cette classe
  const classSubjects = await prisma.classSubject.findMany({
    where: { classId },
    include: { subject: { select: { id: true, name: true, code: true } } },
    orderBy: { subject: { name: "asc" } },
  });
  const editable = await editableSubjectIds(
    { id: actor.userId, role: actor.role },
    classId,
    classSubjects.map((cs) => cs.subjectId),
  );
  const allowedClassSubjects = classSubjects.filter((cs) =>
    editable === "ALL" ? true : editable.has(cs.subjectId),
  );
  const allSubjects = await Promise.all(
    allowedClassSubjects.map(async (cs) => {
      const coef = await resoudreCoefficient(actor.schoolId, classId, cs.subjectId);
      return { id: cs.subjectId, name: cs.subject.name, coefficient: coef };
    }),
  );

  // 3. Classes secondaires accessibles par cet acteur
  const accessibleClassesDb = await prisma.class.findMany({
    where: {
      schoolId: actor.schoolId,
      ...(actor.role === "TEACHER"
        ? {
            OR: [
              { teacherId: actor.userId },
              { assignments: { some: { teacherId: actor.userId } } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, cycle: true },
    orderBy: { name: "asc" },
  });
  const allClasses = accessibleClassesDb
    .filter(
      (c) =>
        c.cycle === "SECONDAIRE" ||
        c.cycle === "MOYEN" ||
        !["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
          c.name.toLowerCase().trim().startsWith(l),
        ),
    )
    .map((c) => ({ id: c.id, name: c.name }));

  return {
    ok: true,
    classId, className: classe.name,
    subjectId: activeSubjectId, subjectName: subject.name, coefficient,
    termId: term.id, termName: term.name,
    allTerms,
    allSubjects,
    allClasses,
    lignes,
  };
}

export async function getSecondaireContext(classId: string, subjectId?: string, termId?: string): Promise<SecondaireContext> {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false, error: auth.error };
  return getSecondaireContextWithActor(auth.ctx, classId, subjectId, termId);
}

async function chargerContexteCommun(actor: Actor, classId: string, subjectId: string, studentId: string, termId: string) {
  const klass = await assertClassInSchool(classId, actor.schoolId);
  if (!klass) return { ok: false as const, error: "Classe introuvable dans votre établissement." };

  const perm = await assertCanEditSecondaireSubject(actor, classId, subjectId);
  if (!perm.ok) return { ok: false as const, error: perm.error };

  const enrolled = await assertStudentEnrolled(studentId, classId);
  if (!enrolled) return { ok: false as const, error: "Cet élève n'est pas inscrit dans cette classe." };

  const term = await prisma.term.findFirst({ where: { id: termId, schoolId: actor.schoolId }, select: { id: true } });
  if (!term) return { ok: false as const, error: "Trimestre introuvable." };

  return { ok: true as const };
}

type SaveNoteInput = {
  gradeId: string | null;
  studentId: string; classId: string; subjectId: string; termId: string;
  value: number | null;
};

/** Devoir (D1/D2/D3) — la note reste sur 20. */
export async function saveDevoirGradeWithActor(
  actor: Actor, input: SaveNoteInput,
): Promise<{ ok: true; gradeId: string | null } | { ok: false; error: string }> {
  const commun = await chargerContexteCommun(actor, input.classId, input.subjectId, input.studentId, input.termId);
  if (!commun.ok) return commun;

  if (input.value === null) {
    if (input.gradeId) {
      await prisma.grade.deleteMany({ where: { id: input.gradeId, classId: input.classId, subjectId: input.subjectId, type: { not: "EXAM" } } });
    }
    return { ok: true, gradeId: null };
  }
  if (!Number.isFinite(input.value) || input.value < 0 || input.value > 20) {
    return { ok: false, error: "La note doit être comprise entre 0 et 20." };
  }

  if (input.gradeId) {
    const updated = await prisma.grade.updateMany({
      where: { id: input.gradeId, classId: input.classId, subjectId: input.subjectId, type: { not: "EXAM" } },
      data: { value: input.value },
    });
    if (updated.count > 0) return { ok: true, gradeId: input.gradeId };
  }

  const existants = await prisma.grade.count({
    where: { classId: input.classId, subjectId: input.subjectId, termId: input.termId, studentId: input.studentId, type: { not: "EXAM" } },
  });
  if (existants >= MAX_DEVOIRS) return { ok: false, error: `Trois devoirs au maximum par matière et par trimestre.` };

  const created = await prisma.grade.create({
    data: {
      value: input.value, max: 20, type: "QUIZ",
      studentId: input.studentId, classId: input.classId, subjectId: input.subjectId,
      termId: input.termId, teacherId: actor.userId,
    },
    select: { id: true },
  });
  return { ok: true, gradeId: created.id };
}

export async function saveDevoirGrade(input: SaveNoteInput) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return saveDevoirGradeWithActor(auth.ctx, input);
}

/** Composition — au plus une par matière et par trimestre. */
export async function saveCompositionGradeWithActor(
  actor: Actor, input: SaveNoteInput,
): Promise<{ ok: true; gradeId: string | null } | { ok: false; error: string }> {
  const commun = await chargerContexteCommun(actor, input.classId, input.subjectId, input.studentId, input.termId);
  if (!commun.ok) return commun;

  if (input.value === null) {
    if (input.gradeId) {
      await prisma.grade.deleteMany({ where: { id: input.gradeId, classId: input.classId, subjectId: input.subjectId, type: "EXAM" } });
    }
    return { ok: true, gradeId: null };
  }
  if (!Number.isFinite(input.value) || input.value < 0 || input.value > 20) {
    return { ok: false, error: "La note doit être comprise entre 0 et 20." };
  }

  if (input.gradeId) {
    const updated = await prisma.grade.updateMany({
      where: { id: input.gradeId, classId: input.classId, subjectId: input.subjectId, type: "EXAM" },
      data: { value: input.value },
    });
    if (updated.count > 0) return { ok: true, gradeId: input.gradeId };
  }

  const created = await prisma.grade.create({
    data: {
      value: input.value, max: 20, type: "EXAM",
      studentId: input.studentId, classId: input.classId, subjectId: input.subjectId,
      termId: input.termId, teacherId: actor.userId,
    },
    select: { id: true },
  });
  return { ok: true, gradeId: created.id };
}

export async function saveCompositionGrade(input: SaveNoteInput) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return saveCompositionGradeWithActor(auth.ctx, input);
}

/** Appréciation du professeur pour SA matière, un élève, un trimestre. */
export async function saveSubjectAppreciationWithActor(actor: Actor, input: {
  studentId: string; classId: string; subjectId: string; termId: string; comment: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const commun = await chargerContexteCommun(actor, input.classId, input.subjectId, input.studentId, input.termId);
  if (!commun.ok) return commun;

  await prisma.subjectAppreciation.upsert({
    where: { studentId_subjectId_termId: { studentId: input.studentId, subjectId: input.subjectId, termId: input.termId } },
    create: {
      studentId: input.studentId, subjectId: input.subjectId, termId: input.termId, schoolId: actor.schoolId,
      comment: input.comment, authorId: actor.userId,
    },
    update: { comment: input.comment, authorId: actor.userId },
  });
  return { ok: true };
}

export async function saveSubjectAppreciation(input: {
  studentId: string; classId: string; subjectId: string; termId: string; comment: string;
}) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return saveSubjectAppreciationWithActor(auth.ctx, input);
}
