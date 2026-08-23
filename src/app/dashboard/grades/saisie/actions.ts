"use server";

import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { editableSubjectIds } from "@/lib/gradeEntry";

/**
 * Enregistrement d'une note, à l'unité — moteur de la sauvegarde automatique.
 *
 * ═══ ⚠️ UNE SERVER ACTION EST UN POINT D'ENTRÉE HTTP ═══
 *
 * Elle est appelable directement, avec n'importe quels arguments, par n'importe
 * quelle session valide. Les vérifications ci-dessous ne doublent donc pas
 * celles de l'écran : **elles sont les seules qui comptent**. C'est la règle du
 * lot 01, et elle s'applique ici avec un enjeu particulier — écrire une note,
 * c'est écrire dans le dossier scolaire d'un enfant.
 *
 * Quatre contrôles, dans cet ordre :
 *   ① la classe appartient bien à l'établissement de l'appelant ;
 *   ② la matière est rattachée à cette classe (`ClassSubject`) ;
 *   ③ l'appelant a le droit de saisir CETTE matière (`editableSubjectIds`) ;
 *   ④ l'élève est réellement inscrit dans cette classe.
 *
 * Sans ④, connaître un identifiant d'élève suffirait à lui coller une note dans
 * une classe où il n'est pas.
 */
export async function saveOneGrade(input: {
  gradeId: string | null;
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string;
  evaluationId: string;
  value: number | null;
  max: number;
  coefficient: number;
}): Promise<{ ok: true; gradeId: string | null } | { ok: false; error: string }> {
  const { schoolId, user } = await requireSchoolContext();

  const klass = await prisma.class.findFirst({
    where: { id: input.classId, schoolId },
    select: { id: true },
  });
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: klass.id },
    select: { subjectId: true },
  });
  const ids = classSubjects.map((c) => c.subjectId);
  if (!ids.includes(input.subjectId)) {
    return { ok: false, error: "Cette matière n'est pas rattachée à la classe." };
  }

  const editable = await editableSubjectIds({ id: user.id, role: user.role }, klass.id, ids);
  if (editable !== "ALL" && !editable.has(input.subjectId)) {
    return { ok: false, error: "Vous ne saisissez pas cette matière." };
  }

  const enrolled = await prisma.enrollment.findFirst({
    where: { classId: klass.id, studentId: input.studentId },
    select: { id: true },
  });
  if (!enrolled) return { ok: false, error: "Cet élève n'est pas inscrit dans cette classe." };

  const term = await prisma.term.findFirst({ where: { id: input.termId, schoolId }, select: { id: true } });
  const evaluation = await prisma.evaluation.findFirst({
    where: { id: input.evaluationId, schoolId, termId: input.termId },
    select: { id: true },
  });
  if (!term || !evaluation) return { ok: false, error: "Trimestre ou évaluation introuvable." };

  const max = Number.isFinite(input.max) && input.max > 0 ? input.max : 20;
  const coefficient = Number.isFinite(input.coefficient) && input.coefficient > 0 ? input.coefficient : 1;

  /**
   * ⚠️ Une note **effacée** supprime la ligne, elle n'écrit pas 0.
   *
   * C'est le bug de perte de données déjà rencontré dans « Par matière », mais
   * dans l'autre sens : un 0 est une note réelle — un élève qui a zéro doit
   * pouvoir l'avoir — et une case vide n'est pas un 0. Confondre les deux fausse
   * toutes les moyennes de la classe.
   */
  if (input.value === null) {
    if (input.gradeId) {
      await prisma.grade.deleteMany({
        where: { id: input.gradeId, classId: klass.id, subjectId: input.subjectId },
      });
    }
    return { ok: true, gradeId: null };
  }

  if (!Number.isFinite(input.value) || input.value < 0 || input.value > max) {
    return { ok: false, error: `La note doit être comprise entre 0 et ${max}.` };
  }

  if (input.gradeId) {
    const updated = await prisma.grade.updateMany({
      where: { id: input.gradeId, classId: klass.id, subjectId: input.subjectId },
      data: { value: input.value, max, coefficient },
    });
    // La ligne a pu disparaître entre deux frappes : on retombe sur une création
    // plutôt que de perdre la saisie en silence.
    if (updated.count > 0) return { ok: true, gradeId: input.gradeId };
  }

  const created = await prisma.grade.create({
    data: {
      value: input.value, max, coefficient, type: "EXAM",
      studentId: input.studentId, classId: klass.id, subjectId: input.subjectId,
      termId: input.termId, evaluationId: input.evaluationId, teacherId: user.id,
    },
    select: { id: true },
  });
  return { ok: true, gradeId: created.id };
}
