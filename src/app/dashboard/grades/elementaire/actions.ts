"use server";

/**
 * Saisie élémentaire — lot 18/3.
 *
 * Grille élève × sous-discipline, groupée par domaine. Le titulaire saisit
 * tout : aucune granularité par matière côté élémentaire (voir
 * `assertCanEditElementaireClass`).
 *
 * ⚠️ Chaque fonction publique n'est qu'un mince appel à sa version
 * `...WithActor(actor, …)` après résolution de la session. Ce découpage
 * permet à `scripts/verify-notes-saisie-smoke.ts` de rejouer exactement le
 * même chemin de code avec un acteur de test — sans lui, `requireActionContext()`
 * (qui lit les cookies de la requête HTTP) rendrait tout smoke test impossible
 * hors navigateur.
 */
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { assertClassInSchool, assertCanEditElementaireClass, assertStudentEnrolled } from "@/lib/notes/entryPermissions";
import { pickCurrentTerm } from "@/lib/terms";

const PATH = "/dashboard/grades/elementaire";

type Actor = { userId: string; role: string; schoolId: string };

export type ElementaireDomaine = {
  domainId: string;
  name: string;
  sousDisciplines: { id: string; name: string; scale: number }[];
};

export type ElementaireEleve = {
  studentId: string;
  firstName: string;
  lastName: string;
  /** notes[subDisciplineId] = valeur, ou absente si non notée */
  notes: Record<string, number>;
  /** gradeIds[subDisciplineId] = identifiant de la note en base */
  gradeIds: Record<string, string>;
  /** Appréciation du maître titulaire pour ce trimestre */
  appreciation: string;
};

export type ElementaireContext =
  | {
      ok: true;
      classId: string;
      className: string;
      termId: string;
      termName: string;
      domaines: ElementaireDomaine[];
      eleves: ElementaireEleve[];
    }
  | { ok: false; error: string };

export async function getElementaireContextWithActor(actor: Actor, classId: string, termId?: string): Promise<ElementaireContext> {
  const klass = await assertClassInSchool(classId, actor.schoolId);
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const perm = await assertCanEditElementaireClass({ userId: actor.userId, role: actor.role }, classId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const classe = await prisma.class.findUniqueOrThrow({ where: { id: classId }, select: { name: true } });

  const terms = await prisma.term.findMany({
    where: { schoolId: actor.schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  if (terms.length === 0) return { ok: false, error: "Aucun trimestre n'est encore déclaré." };
  const { current } = pickCurrentTerm(terms);
  const term = terms.find((t) => t.id === termId) ?? current!;

  const [domaines, enrollments] = await Promise.all([
    prisma.gradeDomain.findMany({
      where: { schoolId: actor.schoolId, isActive: true },
      orderBy: { order: "asc" },
      include: { subDisciplines: { where: { isActive: true }, orderBy: { order: "asc" } } },
    }),
    prisma.enrollment.findMany({
      where: { classId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
  ]);

  if (domaines.length === 0) {
    return { ok: false, error: "Aucun domaine actif n'est configuré pour cette école." };
  }
  if (enrollments.length === 0) {
    return { ok: false, error: "Aucun élève n'est inscrit dans cette classe." };
  }

  const subDisciplineIds = domaines.flatMap((d) => d.subDisciplines.map((sd) => sd.id));
  const studentIds = enrollments.map((e) => e.studentId);

  const [grades, reviews] = await Promise.all([
    prisma.grade.findMany({
      where: { classId, termId: term.id, subDisciplineId: { in: subDisciplineIds }, studentId: { in: studentIds } },
      select: { id: true, studentId: true, subDisciplineId: true, value: true },
    }),
    prisma.termReview.findMany({
      where: { classId, termId: term.id, studentId: { in: studentIds } },
      select: { studentId: true, appreciationTitulaire: true },
    }),
  ]);

  const noteParPaire = new Map(grades.map((g) => [`${g.studentId}:${g.subDisciplineId}`, { id: g.id, value: g.value }]));
  const reviewParEleve = new Map(reviews.map((r) => [r.studentId, r.appreciationTitulaire ?? ""]));

  return {
    ok: true,
    classId,
    className: classe.name,
    termId: term.id,
    termName: term.name,
    domaines: domaines.map((d) => ({
      domainId: d.id,
      name: d.name,
      sousDisciplines: d.subDisciplines.map((sd) => ({ id: sd.id, name: sd.name, scale: sd.scale })),
    })),
    eleves: enrollments.map((e) => {
      const notes: Record<string, number> = {};
      const gradeIds: Record<string, string> = {};
      for (const sdId of subDisciplineIds) {
        const item = noteParPaire.get(`${e.studentId}:${sdId}`);
        if (item != null) {
          notes[sdId] = item.value;
          gradeIds[sdId] = item.id;
        }
      }
      return {
        studentId: e.studentId,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        notes,
        gradeIds,
        appreciation: reviewParEleve.get(e.studentId) ?? "",
      };
    }),
  };
}

export async function getElementaireContext(classId: string, termId?: string): Promise<ElementaireContext> {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false, error: auth.error };
  return getElementaireContextWithActor(auth.ctx, classId, termId);
}

type SaveSubDisciplineInput = {
  gradeId: string | null;
  studentId: string;
  classId: string;
  subDisciplineId: string;
  termId: string;
  value: number | null;
};

/**
 * Enregistrement d'une note à l'unité — moteur de la sauvegarde automatique
 * par ligne. `value: null` efface la note (elle redevient non notée, jamais 0).
 */
export async function saveSubDisciplineGradeWithActor(
  actor: Actor, input: SaveSubDisciplineInput,
): Promise<{ ok: true; gradeId: string | null } | { ok: false; error: string }> {
  const klass = await assertClassInSchool(input.classId, actor.schoolId);
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const perm = await assertCanEditElementaireClass({ userId: actor.userId, role: actor.role }, input.classId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const sousDiscipline = await prisma.gradeSubDiscipline.findFirst({
    where: { id: input.subDisciplineId, schoolId: actor.schoolId, isActive: true },
    select: { id: true, scale: true },
  });
  if (!sousDiscipline) return { ok: false, error: "Sous-discipline introuvable ou désactivée." };

  const enrolled = await assertStudentEnrolled(input.studentId, input.classId);
  if (!enrolled) return { ok: false, error: "Cet élève n'est pas inscrit dans cette classe." };

  const term = await prisma.term.findFirst({ where: { id: input.termId, schoolId: actor.schoolId }, select: { id: true } });
  if (!term) return { ok: false, error: "Trimestre introuvable." };

  if (input.value === null) {
    if (input.gradeId) {
      await prisma.grade.deleteMany({ where: { id: input.gradeId, classId: input.classId, subDisciplineId: input.subDisciplineId } });
    } else {
      await prisma.grade.deleteMany({
        where: {
          studentId: input.studentId,
          classId: input.classId,
          subDisciplineId: input.subDisciplineId,
          termId: input.termId,
        },
      });
    }
    return { ok: true, gradeId: null };
  }

  if (!Number.isFinite(input.value) || input.value < 0 || input.value > sousDiscipline.scale) {
    return { ok: false, error: `La note doit être comprise entre 0 et ${sousDiscipline.scale}.` };
  }

  if (input.gradeId) {
    const updated = await prisma.grade.updateMany({
      where: { id: input.gradeId, classId: input.classId, subDisciplineId: input.subDisciplineId },
      data: { value: input.value, max: sousDiscipline.scale },
    });
    if (updated.count > 0) return { ok: true, gradeId: input.gradeId };
  }

  // Vérifier si une note existe déjà pour cet élève / sous-discipline / trimestre
  const existing = await prisma.grade.findFirst({
    where: {
      studentId: input.studentId,
      classId: input.classId,
      subDisciplineId: input.subDisciplineId,
      termId: input.termId,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.grade.update({
      where: { id: existing.id },
      data: { value: input.value, max: sousDiscipline.scale },
    });
    return { ok: true, gradeId: existing.id };
  }

  const created = await prisma.grade.create({
    data: {
      value: input.value, max: sousDiscipline.scale, type: "OTHER",
      studentId: input.studentId, classId: input.classId,
      subDisciplineId: input.subDisciplineId, termId: input.termId, teacherId: actor.userId,
    },
    select: { id: true },
  });
  return { ok: true, gradeId: created.id };
}

export async function saveSubDisciplineGrade(input: SaveSubDisciplineInput) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return saveSubDisciplineGradeWithActor(auth.ctx, input);
}

/** Appréciation unique du maître titulaire, pour un élève et un trimestre. */
export async function saveTitulaireAppreciationWithActor(actor: Actor, input: {
  studentId: string; classId: string; termId: string; comment: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const klass = await assertClassInSchool(input.classId, actor.schoolId);
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const perm = await assertCanEditElementaireClass({ userId: actor.userId, role: actor.role }, input.classId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const enrolled = await assertStudentEnrolled(input.studentId, input.classId);
  if (!enrolled) return { ok: false, error: "Cet élève n'est pas inscrit dans cette classe." };

  const term = await prisma.term.findFirst({ where: { id: input.termId, schoolId: actor.schoolId }, select: { id: true } });
  if (!term) return { ok: false, error: "Trimestre introuvable." };

  await prisma.termReview.upsert({
    where: { studentId_termId: { studentId: input.studentId, termId: input.termId } },
    create: {
      studentId: input.studentId, classId: input.classId, termId: input.termId, schoolId: actor.schoolId,
      appreciationTitulaire: input.comment, updatedById: actor.userId,
    },
    update: { appreciationTitulaire: input.comment, updatedById: actor.userId },
  });
  return { ok: true };
}

export async function saveTitulaireAppreciation(input: {
  studentId: string; classId: string; termId: string; comment: string;
}) {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return saveTitulaireAppreciationWithActor(auth.ctx, input);
}
