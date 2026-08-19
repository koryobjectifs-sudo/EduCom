"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function getTerms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const terms = await prisma.term.findMany({
    where: { schoolId: dbUser.schoolId },
    include: { evaluations: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' }
  });

  return { data: terms };
}

export async function createTerm(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    const term = await prisma.term.create({
      data: {
        name,
        schoolId: dbUser.schoolId
      }
    });
    return { data: term };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⚠️ CORRECTIF DE SÉCURITÉ (lot 12.1) — fuite inter-établissement.
 *
 * La version précédente faisait `prisma.term.delete({ where: { id } })` : le
 * `schoolId` n'entrait PAS dans le `where`. Connaître un identifiant de
 * trimestre suffisait donc à supprimer celui d'un autre établissement —
 * et la cascade emporte ses évaluations, ses notes et ses bulletins.
 *
 * Cinquième fuite de cette famille trouvée dans le projet. Le `deleteMany`
 * ci-dessous rend l'isolation non contournable : un identifiant d'une autre
 * école ne correspond simplement à aucune ligne.
 */
export async function deleteTerm(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    const { count } = await prisma.term.deleteMany({
      where: { id, schoolId: dbUser.schoolId },
    });
    if (count === 0) return { error: "Trimestre introuvable dans votre établissement." };
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Renseigne les dates d'un trimestre — lot 12.1, PARTIE D.
 *
 * Ce sont ces deux dates qui rendent le trimestre utilisable comme période ET
 * comparable : l'ordre chronologique vient de `startDate`, jamais du nom (voir
 * `src/lib/terms.ts`).
 *
 * Le `schoolId` vient de la session, jamais de l'appelant — même correctif que
 * `deleteTerm` ci-dessus.
 */
export async function setTermDates(id: string, startDate: string | null, endDate: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && Number.isNaN(start.getTime())) return { error: "Date de début invalide." };
  if (end && Number.isNaN(end.getTime())) return { error: "Date de fin invalide." };
  // Refuser plutôt qu'enregistrer un intervalle inversé : `termPeriod()` le
  // rejetterait ensuite silencieusement et le trimestre resterait inutilisable
  // sans que personne ne sache pourquoi.
  if (start && end && end < start) return { error: "La date de fin précède la date de début." };

  try {
    const { count } = await prisma.term.updateMany({
      where: { id, schoolId: dbUser.schoolId },
      data: { startDate: start, endDate: end },
    });
    if (count === 0) return { error: "Trimestre introuvable dans votre établissement." };
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/grades");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createEvaluation(name: string, termId: string, type: 'EXAM' | 'QUIZ' | 'HOMEWORK' | 'PARTICIPATION' | 'OTHER' = 'EXAM') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    const evaluation = await prisma.evaluation.create({
      data: {
        name,
        type,
        termId,
        schoolId: dbUser.schoolId
      }
    });
    return { data: evaluation };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteEvaluation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  try {
    await prisma.evaluation.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Vérifie le mot de passe de l'utilisateur connecté, sans toucher à sa session.
 *
 * On passe par un client Supabase brut (`persistSession: false`) : utiliser le
 * client SSR ré-écrirait les cookies de session au passage.
 */
async function verifyPassword(email: string, password: string) {
  const raw = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await raw.auth.signInWithPassword({ email, password });
  return !error;
}

/** Récapitulatif d'une classe pour l'écran de fin de saisie. */
export async function getClassCompletionSummary(
  classId: string,
  termId: string,
  evaluationId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const [klass, term, evaluation, enrollments, cards, grades, subjectCount] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId: dbUser.schoolId } }),
    prisma.term.findUnique({ where: { id: termId } }),
    prisma.evaluation.findUnique({ where: { id: evaluationId } }),
    prisma.enrollment.findMany({ where: { classId }, include: { student: true } }),
    prisma.reportCard.findMany({ where: { classId, evaluationId } }),
    prisma.grade.findMany({ where: { classId, evaluationId }, select: { value: true, coefficient: true, studentId: true } }),
    prisma.classSubject.count({ where: { classId } }),
  ]);

  if (!klass) return { error: "Classe introuvable" };

  const statusByStudent = new Map(cards.map((c) => [c.studentId, c.status]));
  const gradesByStudent = new Map<string, number>();
  for (const g of grades) {
    gradesByStudent.set(g.studentId, (gradesByStudent.get(g.studentId) ?? 0) + 1);
  }

  let points = 0;
  let coefs = 0;
  for (const g of grades) {
    points += g.value * g.coefficient;
    coefs += g.coefficient;
  }

  const students = enrollments.map((e) => ({
    id: e.student.id,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    status: statusByStudent.get(e.student.id) ?? "DRAFT",
    filled: gradesByStudent.get(e.student.id) ?? 0,
  }));

  return {
    data: {
      className: klass.name,
      termName: term?.name ?? "",
      evaluationName: evaluation?.name ?? "",
      subjectCount,
      students,
      classAverage: coefs === 0 ? null : points / coefs,
      alreadySubmitted: students.length > 0 && students.every((s) => s.status === "SUBMITTED" || s.status === "APPROVED"),
    },
  };
}

/**
 * Dépôt au secrétariat confirmé par mot de passe.
 *
 * Le dépôt rend les bulletins non modifiables : il engage l'enseignant, donc on
 * exige une preuve d'identité et non un simple clic. Seule la direction peut
 * ensuite les renvoyer en correction.
 */
export async function submitClassWithPassword(
  classId: string,
  termId: string,
  evaluationId: string,
  password: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  if (!password?.trim()) return { error: "Mot de passe requis." };
  if (!(await verifyPassword(dbUser.email, password))) {
    return { error: "Mot de passe incorrect." };
  }

  return submitClassToSecretariat(classId, termId, evaluationId);
}

/**
 * Renvoi des bulletins à l'enseignant pour correction.
 *
 * Réservé à la direction et au secrétariat : c'est la SEULE façon de rouvrir
 * un bulletin déposé.
 */
export async function returnReportCardsToTeacher(
  classId: string,
  evaluationId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Seule la direction peut renvoyer des bulletins." };
  }
  if (!reason?.trim()) return { error: "Indiquez un motif de renvoi." };

  try {
    const res = await prisma.reportCard.updateMany({
      where: { classId, evaluationId, schoolId: dbUser.schoolId, status: "SUBMITTED" },
      data: { status: "RETURNED", returnedReason: reason.trim(), submittedAt: null },
    });
    revalidatePath("/dashboard/documents/validation");
    return { success: true, count: res.count };
  } catch (error: any) {
    return { error: error.message };
  }
}

/** Marque une classe comme vérifiée par le secrétariat : imprimable. */
export async function approveReportCards(classId: string, evaluationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Action réservée à la direction et au secrétariat." };
  }

  try {
    const res = await prisma.reportCard.updateMany({
      where: { classId, evaluationId, schoolId: dbUser.schoolId, status: "SUBMITTED" },
      data: { status: "APPROVED" },
    });
    revalidatePath("/dashboard/documents/validation");
    return { success: true, count: res.count };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Les dossiers renvoyés en correction, pour l'enseignant connecté.
 *
 * Sans ça, un renvoi de la direction reste invisible : l'enseignant n'a aucune
 * raison de rouvrir la classe concernée, et le bulletin dort indéfiniment.
 */
export async function getReturnedForTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { data: [] };

  const isStaff = ["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role);

  const cards = await prisma.reportCard.findMany({
    where: {
      schoolId: dbUser.schoolId,
      status: "RETURNED",
      // La direction voit tous les renvois ; un enseignant, seulement les siens.
      ...(isStaff ? {} : { validatedById: dbUser.id }),
    },
    include: { class: true, term: true, evaluation: true },
  });

  const grouped = new Map<string, any>();
  for (const c of cards) {
    const key = `${c.classId}::${c.evaluationId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        classId: c.classId,
        className: c.class.name,
        termId: c.termId,
        termName: c.term.name,
        evaluationId: c.evaluationId,
        evaluationName: c.evaluation.name,
        reason: c.returnedReason,
        count: 0,
      });
    }
    grouped.get(key).count++;
  }

  return { data: [...grouped.values()] };
}

/** États des bulletins d'une classe pour une évaluation : studentId -> statut. */
export async function getReportCardStates(classId: string, evaluationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const cards = await prisma.reportCard.findMany({
    where: { classId, evaluationId },
    select: { studentId: true, status: true, returnedReason: true },
  });

  // Le motif de renvoi est posé sur toute la classe : le premier suffit.
  const returned = cards.find((c) => c.status === "RETURNED" && c.returnedReason);

  return {
    data: {
      statuses: Object.fromEntries(cards.map((c) => [c.studentId, c.status])),
      returnedReason: returned?.returnedReason ?? null,
    },
  };
}

/**
 * Verrouille le bulletin d'un élève.
 *
 * L'incomplétude n'est pas bloquante ici — un élève peut avoir été absent —
 * mais elle est remontée pour que l'interface puisse avertir avant l'acte.
 */
export async function validateStudentReportCard(
  studentId: string,
  classId: string,
  termId: string,
  evaluationId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    await prisma.reportCard.upsert({
      where: { studentId_evaluationId: { studentId, evaluationId } },
      create: {
        studentId, classId, termId, evaluationId,
        status: "VALIDATED",
        validatedAt: new Date(),
        validatedById: dbUser.id,
        schoolId: dbUser.schoolId,
      },
      update: {
        status: "VALIDATED",
        validatedAt: new Date(),
        validatedById: dbUser.id,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/** Rouvre un bulletin verrouillé pour correction. */
export async function reopenStudentReportCard(studentId: string, evaluationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  try {
    await prisma.reportCard.update({
      where: { studentId_evaluationId: { studentId, evaluationId } },
      data: { status: "DRAFT", validatedAt: null, validatedById: null },
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Dépôt de la classe au secrétariat : la « signature de fin » de l'enseignant.
 *
 * Refuse tant qu'un élève n'est pas validé — un dépôt partiel n'aurait aucun
 * sens pour le secrétariat, qui ne saurait pas ce qui est réellement terminé.
 */
export async function submitClassToSecretariat(
  classId: string,
  termId: string,
  evaluationId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);

  const validated = await prisma.reportCard.count({
    where: { classId, termId, evaluationId, status: { in: ["VALIDATED", "SUBMITTED", "APPROVED"] } },
  });

  if (validated < studentIds.length) {
    return {
      error: `${studentIds.length - validated} élève(s) ne sont pas encore validés.`,
    };
  }

  try {
    await prisma.reportCard.updateMany({
      where: { classId, evaluationId, status: "VALIDATED" },
      data: { status: "SUBMITTED", submittedAt: new Date(), submittedById: dbUser.id },
    });
    return { success: true, count: studentIds.length };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Les élèves inscrits dans une classe.
 *
 * Séparé de `getReportCardData` pour que la liste s'affiche dès que
 * l'enseignant choisit sa classe, sans attendre trimestre ni évaluation.
 */
export async function getClassRoster(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    include: { student: true },
    orderBy: { student: { lastName: "asc" } },
  });

  return { data: enrollments.map((e) => e.student) };
}

/**
 * Les matières réellement enseignées dans une classe, avec leur parent.
 *
 * Une matière rattachée à la classe est notée directement ; une matière non
 * rattachée dont les enfants le sont devient un groupe (moyenne calculée).
 * C'est ce qui permet à « Français » d'être un groupe en CI et une matière
 * notée en 6ème, sans dupliquer la ligne.
 */
export async function getClassSubjects(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const rows = await prisma.classSubject.findMany({
    where: { classId },
    include: { subject: { include: { parent: true } } },
  });

  const editableIds = await editableSubjectIds(dbUser, classId, rows.map((r) => r.subjectId));

  // `editable` porte le périmètre : le bulletin s'affiche en entier, mais
  // l'enseignant ne saisit que ses matières. Les autres restent en lecture.
  return {
    data: rows.map((r) => ({
      ...r.subject,
      editable: editableIds === "ALL" || editableIds.has(r.subjectId),
    })),
  };
}

/**
 * Quelles matières d'une classe cet utilisateur peut-il saisir ?
 *
 * `"ALL"` pour la direction, pour un maître affecté sans matière précise
 * (élémentaire) et pour le professeur principal tant qu'aucune affectation
 * n'existe — sinon on l'enfermerait dehors. Sinon, l'ensemble exact de ses
 * matières affectées.
 */
async function editableSubjectIds(
  dbUser: { id: string; role: string },
  classId: string,
  classSubjectIds: string[]
): Promise<"ALL" | Set<string>> {
  if (["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) return "ALL";

  const assignments = await prisma.teachingAssignment.findMany({
    where: { classId, teacherId: dbUser.id },
    select: { subjectId: true },
  });

  if (assignments.length === 0) {
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });
    // Aucune affectation saisie : le professeur principal garde la main.
    return klass?.teacherId === dbUser.id ? "ALL" : new Set<string>();
  }

  // Une affectation sans matière = toutes les matières de la classe.
  if (assignments.some((a) => a.subjectId === null)) return "ALL";

  return new Set(assignments.map((a) => a.subjectId as string).filter((id) => classSubjectIds.includes(id)));
}

/** Les affectations d'une classe : qui enseigne quoi. */
export async function getClassAssignments(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const rows = await prisma.teachingAssignment.findMany({
    where: { classId, schoolId: dbUser.schoolId },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return { data: rows };
}

/** Affecte un enseignant à une classe, pour une matière ou pour toutes. */
export async function createAssignment(
  classId: string,
  teacherId: string,
  subjectId: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };
  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Seule la direction peut affecter les enseignants." };
  }

  const klass = await prisma.class.findFirst({
    where: { id: classId, schoolId: dbUser.schoolId },
  });
  if (!klass) return { error: "Classe introuvable" };

  // Postgres considère deux NULL comme distincts : la contrainte d'unicité
  // n'empêche pas deux affectations « toutes matières ». On vérifie à la main.
  const existing = await prisma.teachingAssignment.findFirst({
    where: { classId, teacherId, subjectId },
  });
  if (existing) return { error: "Cette affectation existe déjà." };

  try {
    await prisma.teachingAssignment.create({
      data: { classId, teacherId, subjectId, schoolId: dbUser.schoolId },
    });
    revalidatePath(`/dashboard/classes/${classId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAssignment(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };
  if (!["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role)) {
    return { error: "Seule la direction peut modifier les affectations." };
  }

  try {
    const a = await prisma.teachingAssignment.findFirst({
      where: { id, schoolId: dbUser.schoolId },
    });
    if (!a) return { error: "Affectation introuvable" };
    await prisma.teachingAssignment.delete({ where: { id } });
    revalidatePath(`/dashboard/classes/${a.classId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/** Rattache une matière à une classe. */
export async function addSubjectToClass(classId: string, subjectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  // Vérifie que la classe appartient bien à l'école de l'utilisateur.
  const klass = await prisma.class.findFirst({
    where: { id: classId, schoolId: dbUser.schoolId },
  });
  if (!klass) return { error: "Classe introuvable" };

  try {
    const exists = await prisma.classSubject.findFirst({ where: { classId, subjectId } });
    if (!exists) await prisma.classSubject.create({ data: { classId, subjectId } });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Détache une matière d'une classe.
 * Refuse si des notes existent : retirer la matière les rendrait invisibles
 * sur le bulletin sans les supprimer, ce qui serait pire qu'une erreur.
 */
export async function removeSubjectFromClass(classId: string, subjectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const klass = await prisma.class.findFirst({
    where: { id: classId, schoolId: dbUser.schoolId },
  });
  if (!klass) return { error: "Classe introuvable" };

  const graded = await prisma.grade.count({ where: { classId, subjectId } });
  if (graded > 0) {
    return { error: `${graded} note(s) déjà saisie(s) dans cette matière : retrait impossible.` };
  }

  try {
    await prisma.classSubject.deleteMany({ where: { classId, subjectId } });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getSubjects() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const subjects = await prisma.subject.findMany({
    where: { schoolId: dbUser.schoolId },
    orderBy: { name: 'asc' }
  });

  return { data: subjects };
}

export async function createSubject(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    const subject = await prisma.subject.create({
      data: {
        name,
        schoolId: dbUser.schoolId
      }
    });
    return { data: subject };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteSubject(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  try {
    await prisma.subject.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveGrades(gradesData: any[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  try {
    // We could optimize this by doing a transaction
    await prisma.$transaction(
      gradesData.map(g => {
        if (g.id) {
          // Update existing grade
          return prisma.grade.update({
            where: { id: g.id },
            data: {
              value: parseFloat(g.value),
              max: parseFloat(g.max || "20"),
              coefficient: parseFloat(g.coefficient || "1"),
              type: g.type,
              comment: g.comment
            }
          });
        } else {
          // Create new grade
          return prisma.grade.create({
            data: {
              value: parseFloat(g.value),
              max: parseFloat(g.max || "20"),
              coefficient: parseFloat(g.coefficient || "1"),
              type: g.type,
              comment: g.comment,
              studentId: g.studentId,
              classId: g.classId,
              subjectId: g.subjectId,
              termId: g.termId,
              evaluationId: g.evaluationId,
              teacherId: dbUser.id
            }
          });
        }
      })
    );
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getGradesForClass(classId: string, subjectId: string, termId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const grades = await prisma.grade.findMany({
    where: { classId, subjectId, termId }
  });

  return { data: grades };
}

export async function getReportCardData(classId: string, termId: string, evaluationId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  // Fetch all enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    include: { student: true }
  });
  const students = enrollments.map(e => e.student);

  // Fetch all grades for this class and term (and optionally evaluation)
  const whereClause: any = { classId, termId };
  if (evaluationId) {
    whereClause.evaluationId = evaluationId;
  }

  const grades = await prisma.grade.findMany({
    where: whereClause,
    include: { subject: true }
  });

  // Calculate averages
  // We'll return the raw data and let the frontend do the grouping/math
  return { 
    data: { 
      students, 
      grades 
    } 
  };
}

export async function getGradesInputData(classId: string, subjectId: string, termId: string, evaluationId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    include: { student: true }
  });
  const students = enrollments.map(e => e.student);

  const whereClause: any = { classId, subjectId, termId };
  if (evaluationId) {
    whereClause.evaluationId = evaluationId;
  }

  const grades = await prisma.grade.findMany({
    where: whereClause
  });

  return { data: { students, grades } };
}
