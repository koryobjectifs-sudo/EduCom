import { prisma } from "@/lib/prisma";
import { currentAcademicYear as resolveAcademicYear, defaultAcademicYear } from "@/lib/academicYear";
import { pickCurrentTerm } from "@/lib/terms";

export type TeacherDashboardSnapshot = {
  teacherName: string;
  academicYear: string;
  todayFormatted: string;
  titulaireClasses: {
    id: string;
    name: string;
    studentCount: number;
    attendanceRecordedToday: boolean;
  }[];
  classes: {
    id: string;
    name: string;
    cycle: string;
    studentCount: number;
    subjects: { id: string; name: string }[];
    isTitulaire: boolean;
    progress: {
      termName: string;
      evaluationName: string;
      entered: number;
      total: number;
      remaining: number;
      pct: number;
    } | null;
    link: string;
  }[];
  upcomingEvaluations: {
    id: string;
    name: string;
    dateFormatted: string | null;
    termName: string;
  }[];
};

export async function getTeacherDashboardSnapshot(
  actor: { schoolId: string; userId: string },
  teacherName: string,
): Promise<TeacherDashboardSnapshot> {
  const { schoolId, userId } = actor;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { activeAcademicYear: true },
  });
  const academicYear = school?.activeAcademicYear || resolveAcademicYear(school) || defaultAcademicYear();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const todayFormatted = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 1. Classes où l'enseignant intervient
  const classesDb = await prisma.class.findMany({
    where: {
      schoolId,
      OR: [
        { teacherId: userId },
        { assignments: { some: { teacherId: userId } } },
      ],
    },
    include: {
      _count: { select: { enrollments: true } },
      subjects: { include: { subject: true } },
      assignments: {
        where: { teacherId: userId },
        include: { subject: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // 2. Appel du jour pour les classes où il est titulaire (Class.teacherId)
  const titulaireClassesList = classesDb.filter((c) => c.teacherId === userId);
  const titulaireClassIds = titulaireClassesList.map((c) => c.id);

  const todayAttendances = titulaireClassIds.length > 0
    ? await prisma.attendance.findMany({
        where: {
          classId: { in: titulaireClassIds },
          date: { gte: todayStart, lte: todayEnd },
        },
        select: { classId: true },
      })
    : [];

  const recordedClassIds = new Set(todayAttendances.map((a) => a.classId));

  const titulaireClasses = titulaireClassesList.map((c) => ({
    id: c.id,
    name: c.name,
    studentCount: c._count.enrollments,
    attendanceRecordedToday: recordedClassIds.has(c.id),
  }));

  // 3. Trimestre en cours et évaluations pour le suivi de saisie
  const terms = await prisma.term.findMany({
    where: { schoolId },
    orderBy: { startDate: "asc" },
  });
  const { current: currentTerm } = pickCurrentTerm(terms);

  // Évaluations futures pour le calendrier
  const upcomingEvalsDb = await prisma.evaluation.findMany({
    where: {
      schoolId,
      date: { gte: todayStart },
    },
    include: { term: true },
    orderBy: { date: "asc" },
    take: 5,
  });

  const upcomingEvaluations = upcomingEvalsDb.map((e) => ({
    id: e.id,
    name: e.name,
    dateFormatted: e.date
      ? new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      : null,
    termName: e.term.name,
  }));

  // 4. Calcul de la progression par classe
  const classes = await Promise.all(
    classesDb.map(async (c) => {
      const isElementaire =
        c.cycle === "ELEMENTAIRE" ||
        c.cycle === "PRESCOLAIRE" ||
        ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
          c.name.toLowerCase().trim().startsWith(l),
        );

      const isTitulaire = c.teacherId === userId;

      // Matières de CET enseignant dans CETTE classe
      let teacherSubjects: { id: string; name: string }[] = [];
      if (isElementaire && isTitulaire) {
        teacherSubjects = c.subjects.map((cs) => ({ id: cs.subject.id, name: cs.subject.name }));
      } else {
        teacherSubjects = c.assignments
          .map((a) => a.subject)
          .filter((s): s is { id: string; name: string; code: string; parentId: string | null; schoolId: string; createdAt: Date; updatedAt: Date } => s !== null)
          .map((s) => ({ id: s.id, name: s.name }));
      }

      // Lien direct
      const firstSubject = teacherSubjects[0];
      const link = isElementaire
        ? `/dashboard/grades/elementaire?class=${c.id}`
        : `/dashboard/grades/secondaire?class=${c.id}${firstSubject ? `&subject=${firstSubject.id}` : ""}`;

      // Progression des saisies
      let progress: TeacherDashboardSnapshot["classes"][number]["progress"] = null;
      if (currentTerm && teacherSubjects.length > 0 && c._count.enrollments > 0) {
        const subjectIds = teacherSubjects.map((s) => s.id);
        const totalExpected = c._count.enrollments * subjectIds.length;

        const gradesCount = await prisma.grade.count({
          where: {
            classId: c.id,
            termId: currentTerm.id,
            subjectId: { in: subjectIds },
            teacherId: userId,
          },
        });

        // Si le filtre teacherId ne renvoie rien (anciens devoirs ou notes saisies), compter sans teacherId
        const entered = gradesCount > 0
          ? gradesCount
          : await prisma.grade.count({
              where: {
                classId: c.id,
                termId: currentTerm.id,
                subjectId: { in: subjectIds },
              },
            });

        const remaining = Math.max(0, totalExpected - entered);
        const pct = totalExpected > 0 ? Math.min(100, Math.round((entered / totalExpected) * 100)) : 0;

        progress = {
          termName: currentTerm.name,
          evaluationName: "Saisie trimestrielle",
          entered,
          total: totalExpected,
          remaining,
          pct,
        };
      }

      return {
        id: c.id,
        name: c.name,
        cycle: c.cycle,
        studentCount: c._count.enrollments,
        subjects: teacherSubjects,
        isTitulaire,
        progress,
        link,
      };
    }),
  );

  return {
    teacherName,
    academicYear,
    todayFormatted,
    titulaireClasses,
    classes,
    upcomingEvaluations,
  };
}
