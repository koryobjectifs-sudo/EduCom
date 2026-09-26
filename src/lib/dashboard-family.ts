import { prisma } from "@/lib/prisma";
import { distributionsPubliees } from "@/lib/bulletinsParents";
import { currentAcademicYear as resolveAcademicYear, defaultAcademicYear } from "@/lib/academicYear";
import type { ResolvedFamilyContext } from "@/lib/familyContext";

export type FamilyDashboardSnapshot = {
  parentName: string;
  schoolName: string;
  academicYear: string;
  todayFormatted: string;
  childrenCount: number;
  pendingActionsCount: number;
  pendingReminders: {
    id: string;
    studentId: string;
    studentName: string;
    requirementId: string;
    requirementLabel: string;
    nature: string;
    actionUrl: string | null;
    message: string | null;
    createdAt: Date;
  }[];
  children: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    className: string;
    cycle: string;
    average: number | null;
    gradesCount: number;
    attendanceRate: number;
    absencesCount: number;
    financialStatus: "PAID" | "PENDING" | "OVERDUE";
    remainingAmount: number;
    totalDue: number;
    nextDueDate: string | null;
  }[];
  financialSummary: {
    totalPaid: number;
    totalRemaining: number;
    totalExpected: number;
    paymentRate: number;
    earliestDueDate: string | null;
    earliestDueAmount: number;
  };
  overallAverage: number | null;
  overallAttendanceRate: number;
  totalGrades: number;
  monthlyGradesHistory: number[];
  recentActivity: {
    id: string;
    kind: "grade" | "payment" | "reminder";
    title: string;
    detail: string;
    timeFormatted: string;
    badge: string;
    badgeColor: string;
  }[];
  healthScore: number;
};

export async function getFamilyDashboardSnapshot(
  familyContext: ResolvedFamilyContext,
): Promise<FamilyDashboardSnapshot> {
  const { user, school, schoolId, children: contextChildren, pendingReminders } = familyContext;

  const now = new Date();
  const todayFormatted = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const academicYear = school.activeAcademicYear || resolveAcademicYear(school) || defaultAcademicYear();
  const parentName = user.firstName ? user.firstName : "Parent";

  const childIds = contextChildren.map((c) => c.id);

  // 1. Récupération approfondie des données scolaires des enfants
  const studentsDb = childIds.length > 0
    ? await prisma.student.findMany({
        where: { id: { in: childIds } },
        include: {
          enrollments: {
            include: { class: true },
            orderBy: { academicYear: "desc" },
            take: 1,
          },
          grades: {
            include: { subject: true, term: true },
            orderBy: { date: "desc" },
          },
          attendances: {
            where: { schoolId },
            orderBy: { date: "desc" },
          },
          invoices: {
            where: { schoolId },
            include: { payments: true },
            orderBy: { dueDate: "asc" },
          },
        },
      })
    : [];

  // ═══ 26 sept. 2026 — règle de Kory : les familles ne voient que les bulletins
  // DISTRIBUÉS (validation + conseil de classe + date de distribution). Les notes
  // d'un trimestre non distribué ne comptent ni dans la moyenne, ni dans
  // l'activité récente. Règle : `lib/bulletinsParents.ts`.
  const classesEleves = [...new Set(studentsDb.flatMap((s) => s.grades.map((g) => g.classId)))];
  const publiees = await distributionsPubliees(schoolId, classesEleves);
  for (const s of studentsDb) {
    s.grades = s.grades.filter((g) => publiees.has(`${g.classId}:${g.termId}`));
  }

  let totalPaidAll = 0;
  let totalDueAll = 0;
  let earliestDueDate: Date | null = null;
  let earliestDueAmount = 0;
  let totalAbsencesAll = 0;
  let totalAttendancesCount = 0;
  let totalGradesSum = 0;
  let totalGradesCount = 0;

  const enrichedChildren = studentsDb.map((student) => {
    const enrollment = student.enrollments[0];
    const className = enrollment?.class?.name || "Non assigné(e)";
    const cycle = enrollment?.class?.cycle || "MOYEN";

    // Notes & Moyenne
    const validGrades = student.grades.filter((g) => g.value !== null && g.max > 0);
    const gradesCount = validGrades.length;
    let average: number | null = null;
    if (gradesCount > 0) {
      const sumNormalized = validGrades.reduce((sum, g) => sum + (g.value / g.max) * 20, 0);
      average = Math.round((sumNormalized / gradesCount) * 10) / 10;
      totalGradesSum += average;
      totalGradesCount++;
    }

    // Assiduité
    const totalRecords = student.attendances.length;
    const absences = student.attendances.filter((a) => a.status === "ABSENT").length;
    totalAbsencesAll += absences;
    totalAttendancesCount += totalRecords;
    const attendanceRate = totalRecords > 0
      ? Math.max(0, Math.round(((totalRecords - absences) / totalRecords) * 100))
      : 98; // Par défaut excellente assiduité si non renseigné

    // Finances de cet enfant
    let childTotalDue = 0;
    let childTotalPaid = 0;
    let childNextDueDate: Date | null = null;

    for (const inv of student.invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      childTotalDue += inv.totalAmount;
      childTotalPaid += paid;
      const remaining = Math.max(0, inv.totalAmount - paid);

      if (remaining > 0) {
        if (!childNextDueDate || inv.dueDate < childNextDueDate) {
          childNextDueDate = inv.dueDate;
        }
        if (!earliestDueDate || inv.dueDate < earliestDueDate) {
          earliestDueDate = inv.dueDate;
          earliestDueAmount = remaining;
        }
      }
    }

    totalDueAll += childTotalDue;
    totalPaidAll += childTotalPaid;
    const childRemaining = Math.max(0, childTotalDue - childTotalPaid);

    let financialStatus: "PAID" | "PENDING" | "OVERDUE" = "PAID";
    if (childRemaining > 0) {
      if (childNextDueDate && childNextDueDate < now) {
        financialStatus = "OVERDUE";
      } else {
        financialStatus = "PENDING";
      }
    }

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      matricule: student.matricule,
      className,
      cycle,
      average,
      gradesCount,
      attendanceRate,
      absencesCount: absences,
      financialStatus,
      remainingAmount: childRemaining,
      totalDue: childTotalDue,
      nextDueDate: childNextDueDate
        ? childNextDueDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
        : null,
    };
  });

  const totalRemainingAll = Math.max(0, totalDueAll - totalPaidAll);
  const paymentRate = totalDueAll > 0
    ? Math.round((totalPaidAll / totalDueAll) * 100)
    : 100;

  // Aucune moyenne inventée : sans bulletin distribué, pas de moyenne.
  const overallAverage = totalGradesCount > 0
    ? Math.round((totalGradesSum / totalGradesCount) * 10) / 10
    : null;

  const overallAttendanceRate = totalAttendancesCount > 0
    ? Math.max(0, Math.round(((totalAttendancesCount - totalAbsencesAll) / totalAttendancesCount) * 100))
    : 98;

  const totalGrades = studentsDb.reduce((sum, s) => sum + s.grades.length, 0);

  // 2. Activité récente combinée (Dernières notes & Derniers paiements)
  const recentActivity: FamilyDashboardSnapshot["recentActivity"] = [];

  // Dernières notes
  for (const student of studentsDb) {
    for (const g of student.grades.slice(0, 3)) {
      const isGood = g.value >= (g.max / 2);
      const elapsedMinutes = Math.floor((now.getTime() - new Date(g.date || g.createdAt).getTime()) / (1000 * 60));
      let timeFormatted = "Récemment";
      if (elapsedMinutes < 60) timeFormatted = `Il y a ${Math.max(1, elapsedMinutes)} min`;
      else if (elapsedMinutes < 1440) timeFormatted = `Il y a ${Math.floor(elapsedMinutes / 60)} h`;
      else timeFormatted = new Date(g.date || g.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

      recentActivity.push({
        id: `grade-${g.id}`,
        kind: "grade",
        title: `Note reçue · ${student.firstName}`,
        detail: `${g.subject?.name || "Matière"} : ${g.value}/${g.max}`,
        timeFormatted,
        badge: `${g.value}/${g.max}`,
        badgeColor: isGood ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100",
      });
    }
  }

  // Derniers paiements
  for (const student of studentsDb) {
    for (const inv of student.invoices) {
      for (const p of inv.payments.slice(0, 2)) {
        recentActivity.push({
          id: `pay-${p.id}`,
          kind: "payment",
          title: `Paiement enregistré · ${student.firstName}`,
          detail: `${inv.title || "Écolage"} · Reçu validé`,
          timeFormatted: new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
          badge: `${p.amount.toLocaleString("fr-FR")} F`,
          badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
        });
      }
    }
  }

  // Trier les activités récentes par identifiant
  recentActivity.sort((a, b) => a.id.localeCompare(b.id));

  // 3. Historique d'évolution des notes (progression spline)
  // Vraie progression : moyenne /20 de chaque trimestre distribué, dans l'ordre (plus de valeurs inventées).
  const parTrimestre = new Map<string, { debut: number; somme: number; n: number }>();
  for (const s of studentsDb) {
    for (const g of s.grades) {
      if (g.value === null || g.max <= 0) continue;
      const t = parTrimestre.get(g.termId) ?? { debut: g.term?.startDate?.getTime() ?? 0, somme: 0, n: 0 };
      t.somme += (g.value / g.max) * 20;
      t.n++;
      parTrimestre.set(g.termId, t);
    }
  }
  const monthlyGradesHistory = [...parTrimestre.values()]
    .sort((a, b) => a.debut - b.debut)
    .map((t) => Math.round((t.somme / t.n) * 10) / 10)
    .slice(-4);

  // 4. Indice composite de sérénité scolaire familiale (0 - 100%)
  const academicScore = overallAverage === null ? 0 : Math.min(100, Math.round((overallAverage / 20) * 100));
  const attendanceScore = overallAttendanceRate;
  const adminScore = pendingReminders.length === 0 ? 100 : Math.max(50, 100 - pendingReminders.length * 15);
  const financialScore = paymentRate;

  // Sans bulletin distribué, la part « notes » est retirée du calcul (et non inventée).
  const healthScore = Math.round(
    overallAverage === null
      ? (attendanceScore * 0.35 + financialScore * 0.15 + adminScore * 0.15) / 0.65
      : academicScore * 0.35 + attendanceScore * 0.35 + financialScore * 0.15 + adminScore * 0.15,
  );

  const formattedEarliestDueDate = earliestDueDate
    ? (earliestDueDate as Date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  return {
    parentName,
    schoolName: school.name,
    academicYear,
    todayFormatted,
    childrenCount: enrichedChildren.length,
    pendingActionsCount: pendingReminders.length,
    pendingReminders,
    children: enrichedChildren,
    financialSummary: {
      totalPaid: totalPaidAll,
      totalRemaining: totalRemainingAll,
      totalExpected: totalDueAll,
      paymentRate,
      earliestDueDate: formattedEarliestDueDate,
      earliestDueAmount,
    },
    overallAverage,
    overallAttendanceRate,
    totalGrades,
    monthlyGradesHistory,
    recentActivity: recentActivity.slice(0, 5),
    healthScore,
  };
}
