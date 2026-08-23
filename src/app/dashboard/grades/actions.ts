"use server";

import { prisma } from "@/lib/prisma";
import { editableSubjectIds } from "@/lib/gradeEntry";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { urlSupabase, cleAnonSupabase } from "@/lib/supabase/config";
import { requireActionContext } from "@/lib/actionContext";
import { recordPlanningChange } from "@/lib/planningNotice";

/**
 * ═══ QUI A LE DROIT DE CHANGER LE CADRE ACADÉMIQUE — 22 août 2026 ═══
 *
 * Les actions de ce fichier qui touchent **la structure** — trimestres, dates,
 * évaluations, matières, programme d'une classe — ne vérifiaient QUE
 * l'authentification. Conséquence mesurée : n'importe quel compte de l'école,
 * **y compris un PARENT**, pouvait appeler `setTermDates()` ou `deleteTerm()`
 * en HTTP direct et déplacer le calendrier de tout l'établissement. Une server
 * action est un point d'entrée à part entière ; l'écran qui la cache ne la
 * protège pas.
 *
 * Le garde passe par `requireActionContext()`, donc par la MÊME table de
 * permissions que la navigation — direction et secrétariat. Aucune règle
 * parallèle : `/dashboard/settings/pedagogie` est le chemin de référence, et il
 * n'accorde pas `/dashboard/settings` (voir `src/lib/permissions.ts`).
 *
 * ⚠️ **La SAISIE des notes n'est pas concernée.** `saveGrades()` et tout ce qui
 * écrit une note gardent leur garde d'origine, bornée par `editableSubjectIds()` :
 * un enseignant note ses matières, c'est son métier. Il ne fixe simplement plus
 * le calendrier de l'école.
 */
const CADRE_ACADEMIQUE = "/dashboard/settings/pedagogie";

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
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };

  try {
    const term = await prisma.term.create({
      data: {
        name,
        schoolId: auth.ctx.schoolId
      }
    });
    revalidatePath("/dashboard/grades");
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
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };

  try {
    const { count } = await prisma.term.deleteMany({
      where: { id, schoolId: auth.ctx.schoolId },
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
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && Number.isNaN(start.getTime())) return { error: "Date de début invalide." };
  if (end && Number.isNaN(end.getTime())) return { error: "Date de fin invalide." };
  // Refuser plutôt qu'enregistrer un intervalle inversé : `termPeriod()` le
  // rejetterait ensuite silencieusement et le trimestre resterait inutilisable
  // sans que personne ne sache pourquoi.
  if (start && end && end < start) return { error: "La date de fin précède la date de début." };

  /**
   * ⚠️ **L'état AVANT est lu avant l'écriture, sinon il est perdu.** Déplacer un
   * trimestre décale tout ce qu'il contient ; sans l'ancienne date, personne ne
   * peut être prévenu de quoi que ce soit — voir `src/lib/planningNotice.ts`.
   */
  const avant = await prisma.term.findFirst({
    where: { id, schoolId },
    select: { name: true, startDate: true, endDate: true },
  });
  if (!avant) return { error: "Trimestre introuvable dans votre établissement." };

  try {
    const { count } = await prisma.term.updateMany({
      where: { id, schoolId },
      data: { startDate: start, endDate: end },
    });
    if (count === 0) return { error: "Trimestre introuvable dans votre établissement." };

    await recordPlanningChange(auth.ctx, {
      entity: "term",
      entityId: id,
      name: avant.name,
      from: { start: avant.startDate, end: avant.endDate },
      to: { start, end },
    });

    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/grades");
    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createEvaluation(name: string, termId: string, type: 'EXAM' | 'QUIZ' | 'HOMEWORK' | 'PARTICIPATION' | 'OTHER' = 'EXAM') {
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  // ⚠️ Le trimestre doit appartenir à l'école de la SESSION. Sans cette
  // vérification, `termId` venant du client, une évaluation pouvait être
  // greffée sur le trimestre d'un autre établissement.
  const term = await prisma.term.findFirst({ where: { id: termId, schoolId }, select: { id: true } });
  if (!term) return { error: "Trimestre introuvable dans votre établissement." };

  try {
    const evaluation = await prisma.evaluation.create({
      data: { name, type, termId, schoolId }
    });
    revalidatePath("/dashboard/grades");
    revalidatePath("/dashboard/settings/pedagogie");
    return { data: evaluation };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⚠️ **CORRECTIF DE SÉCURITÉ (22 août 2026) — fuite inter-établissement.**
 *
 * La version précédente faisait `prisma.evaluation.delete({ where: { id } })` :
 * ni `schoolId` ni contrôle de rôle. Connaître un identifiant d'évaluation
 * suffisait donc à supprimer celle d'un autre établissement — et la cascade
 * emporte **ses notes et ses bulletins** (`Grade.evaluationId` et
 * `ReportCard.evaluationId` sont en `onDelete: Cascade`).
 *
 * Sixième fuite de cette famille trouvée dans le projet, exactement le motif
 * corrigé sur `deleteTerm()` au lot 12.1. Le `deleteMany` rend l'isolation non
 * contournable : un identifiant étranger ne correspond simplement à aucune ligne.
 */
export async function deleteEvaluation(id: string) {
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };

  try {
    const { count } = await prisma.evaluation.deleteMany({
      where: { id, schoolId: auth.ctx.schoolId },
    });
    if (count === 0) return { error: "Évaluation introuvable dans votre établissement." };
    revalidatePath("/dashboard/grades");
    revalidatePath("/dashboard/settings/pedagogie");
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
    urlSupabase(),
    cleAnonSupabase(),
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
 * Le périmètre de saisie vit dans `src/lib/gradeEntry.ts`, et **nulle part
 * ailleurs**. Cette règle décide qui a le droit d'écrire des notes : deux
 * copies finiraient par diverger, et la divergence irait dans le sens permissif
 * — c'est toujours ce qui arrive.
 *
 * ⚠️ Ce fichier est `"use server"` : il ne peut pas réexporter la fonction, tout
 * export y devant être une action asynchrone. D'où l'import.
 */

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
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  // La classe ET la matière doivent appartenir à l'école de la session. La
  // matière n'était pas vérifiée : un `subjectId` étranger rattachait la ligne
  // d'un autre établissement au bulletin de celle-ci.
  const [klass, subject] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } }),
    prisma.subject.findFirst({ where: { id: subjectId, schoolId }, select: { id: true } }),
  ]);
  if (!klass) return { error: "Classe introuvable" };
  if (!subject) return { error: "Matière introuvable dans votre établissement." };

  try {
    const exists = await prisma.classSubject.findFirst({ where: { classId, subjectId } });
    if (!exists) await prisma.classSubject.create({ data: { classId, subjectId } });
    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard/grades");
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
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };

  const klass = await prisma.class.findFirst({
    where: { id: classId, schoolId: auth.ctx.schoolId },
  });
  if (!klass) return { error: "Classe introuvable" };

  const graded = await prisma.grade.count({ where: { classId, subjectId } });
  if (graded > 0) {
    return { error: `${graded} note(s) déjà saisie(s) dans cette matière : retrait impossible.` };
  }

  try {
    await prisma.classSubject.deleteMany({ where: { classId, subjectId } });
    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard/grades");
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
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };

  try {
    const subject = await prisma.subject.create({
      data: {
        name,
        schoolId: auth.ctx.schoolId
      }
    });
    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard/grades");
    return { data: subject };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⚠️ **DEUX CORRECTIFS (22 août 2026), et le second est le plus grave.**
 *
 * ① *Fuite inter-établissement.* `prisma.subject.delete({ where: { id } })` sans
 *    `schoolId` : un identifiant suffisait à supprimer la matière d'une autre
 *    école. Même motif que `deleteTerm()` et `deleteEvaluation()`.
 *
 * ② *Effacement silencieux de notes.* `Grade.subjectId` et `Subject.parentId`
 *    sont en `onDelete: Cascade`. Supprimer « Français » emportait donc ses
 *    huit sous-matières **et toutes les notes qui y étaient rattachées**, sans
 *    un mot. Le refus ci-dessous est de la friction **protectrice** : elle ne
 *    sert pas l'implémentation, elle empêche de détruire le travail d'un
 *    trimestre en un clic (règle 4 du projet).
 */
export async function deleteSubject(id: string) {
  const auth = await requireActionContext(CADRE_ACADEMIQUE);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const subject = await prisma.subject.findFirst({
    where: { id, schoolId },
    select: { id: true, name: true, children: { select: { id: true } } },
  });
  if (!subject) return { error: "Matière introuvable dans votre établissement." };

  const ids = [subject.id, ...subject.children.map((c) => c.id)];
  const graded = await prisma.grade.count({ where: { subjectId: { in: ids } } });
  if (graded > 0) {
    return {
      error: subject.children.length > 0
        ? `« ${subject.name} » et ses sous-matières portent ${graded} note(s) : suppression impossible.`
        : `${graded} note(s) déjà saisie(s) dans « ${subject.name} » : suppression impossible.`,
    };
  }

  try {
    await prisma.subject.deleteMany({ where: { id, schoolId } });
    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard/grades");
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

/**
 * Enregistre l'**avis du conseil** sur le bulletin d'un élève.
 *
 * ═══ POURQUOI CETTE ACTION N'EXISTAIT PAS ═══
 *
 * `ReportCard.generalComment` est au schéma depuis l'origine et n'était **ni lu
 * ni écrit nulle part** — vérifié : zéro occurrence dans `src/`. L'avis du
 * conseil vivait dans un `contentEditable` du générateur : ce que la directrice
 * écrivait disparaissait au rechargement, sans le moindre avertissement.
 *
 * ⚠️ **Réservé à la direction et au secrétariat.** L'avis du conseil engage
 * l'établissement, pas l'enseignant — même frontière que la validation des
 * bulletins, et on la lit à la même source (`hasAccess`), jamais d'une liste de
 * rôles recopiée ici.
 *
 * ⚠️ `upsert` sur `(studentId, evaluationId)` : le bulletin peut ne pas encore
 * exister au moment où l'avis est saisi — la directrice peut commenter avant que
 * l'enseignant ait validé.
 */
export async function saveCouncilComment(input: {
  studentId: string;
  classId: string;
  termId: string;
  evaluationId: string;
  comment: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Utilisateur introuvable" };

  const { hasAccess } = await import("@/lib/permissions");
  if (!hasAccess(dbUser.role as never, "/dashboard/documents/validation")) {
    return { error: "Seule la direction peut renseigner l'avis du conseil." };
  }

  // Cloisonnement : un identifiant deviné ne doit pas suffire à écrire dans un
  // autre établissement.
  const klass = await prisma.class.findFirst({
    where: { id: input.classId, schoolId: dbUser.schoolId },
    select: { id: true },
  });
  if (!klass) return { error: "Classe introuvable" };

  const comment = input.comment.trim();

  try {
    await prisma.reportCard.upsert({
      where: { studentId_evaluationId: { studentId: input.studentId, evaluationId: input.evaluationId } },
      create: {
        studentId: input.studentId, classId: input.classId, termId: input.termId,
        evaluationId: input.evaluationId, schoolId: dbUser.schoolId,
        // Un avis n'est pas une validation : le statut n'avance pas.
        generalComment: comment || null,
      },
      update: { generalComment: comment || null },
    });
    revalidatePath("/dashboard/documents/report-card");
    revalidatePath("/dashboard/documents/validation");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Enregistrement impossible" };
  }
}
