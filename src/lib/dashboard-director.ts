import { prisma } from "@/lib/prisma";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { configurationReadiness, type ConfigurationReadiness } from "@/lib/pedagogy";
import { monthlyForecast } from "@/lib/fees";
import { pickCurrentTerm } from "@/lib/terms";
import { currentAcademicYear as resolveAcademicYear, defaultAcademicYear } from "@/lib/academicYear";
import type { ActorContext } from "@/lib/audit";
import { type PeriodKind } from "@/lib/contextEngine";

/**
 * Moteur de données du DIRECTOR COMMAND CENTER — EduCom SaaS
 *
 * Règles absolues :
 * 1. Zéro fausse donnée : Tout chiffre est issu de la base ou étiqueté indisponible.
 * 2. Performance et batching : Toutes les requêtes sont agrégées et parallélisées.
 * 3. Respect strict du rôle et des permissions de l'utilisateur.
 */

export type DirectorKPIs = {
  activeStudents: {
    count: number;
    academicYear: string;
    prevYear: string | null;
    prevYearCount: number;
    new30d: number;
    pendingCount: number;
  };
  recovery: {
    rate: number | null; // e.g. 78%
    collected: number;
    expected: number;
    outstanding: number;
  };
  overdue: {
    totalAmount: number;
    affectedFamilies: number;
    invoicesCount: number;
  };
  attendanceToday: {
    rate: number | null;
    presentCount: number;
    totalRecordedStudents: number;
    totalExpected: number;
    absentCount: number;
    isRecorded: boolean;
    classesRecordedCount: number;
    classesTotalCount: number;
    isFullSchoolRecorded: boolean;
  };
  urgentActionsCount: number;
};

export type OverdueAgingBucket = {
  label: string;
  count: number;
  amount: number;
  percentage: number;
};

export type PaymentMethodBreakdown = {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
};

export type FinancialCommandData = {
  monthExpected: number;
  monthCollected: number;
  recoveryRate: number | null;
  totalOutstanding: number;
  overdueAmount: number;
  affectedFamilies: number;
  agingBuckets: OverdueAgingBucket[];
  collectionsToday: number;
  collectionsThisWeek: number;
  channelBreakdown: PaymentMethodBreakdown[];
  upcomingReceivables: {
    count: number;
    amount: number;
    nextDueDate: Date | null;
  };
};

export type ActionItemSeverity = "urgent" | "watch" | "info";

export type ActionRequiredItem = {
  id: string;
  severity: ActionItemSeverity;
  category: "finance" | "admission" | "pedagogy" | "attendance" | "document" | "staff";
  title: string;
  description: string;
  count: number;
  badgeText?: string;
  href: string;
  cta: string;
  icon: string;
};

export type ClassOccupancyItem = {
  id: string;
  name: string;
  cycle: string;
  studentCount: number;
  shareOfSchool: number;
  teacherName: string | null;
  hasStudents: boolean;
};

export type CycleDistribution = {
  cycle: string;
  label: string;
  studentsCount: number;
  classesCount: number;
};

export type EnrollmentData = {
  totalActive: number;
  pendingAdmissions: number;
  inactiveOrGraduated: number;
  newIn30Days: number;
  classesCount: number;
  activeClassesCount: number;
  emptyClassesCount: number;
  averageStudentsPerActiveClass: number | null;
  studentTeacherRatio: number | null;
  assignedTeachersCount: number;
  cycleDistribution: CycleDistribution[];
  classesOccupancy: ClassOccupancyItem[];
};

export type ClassAttendanceAlert = {
  classId: string;
  className: string;
  cycle: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalStudents: number;
  rate: number | null;
  status: "LOW_ATTENDANCE" | "NOT_TAKEN" | "GOOD";
};

export type AttendanceTodayData = {
  recordedToday: boolean;
  globalRate: number | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalRecordedStudents: number;
  totalActiveStudents: number;
  classesRecordedCount: number;
  classesTotalCount: number;
  classesPendingAttendance: number;
  isFullSchoolRecorded: boolean;
  completedClasses: ClassAttendanceAlert[];
  pendingClasses: ClassAttendanceAlert[];
  alerts: ClassAttendanceAlert[];
  unassignedClassesCount: number;
};

export type AcademicClassProgress = {
  classId: string;
  className: string;
  cycle: string;
  gradesCount: number;
  averageOn20: number | null;
  isComplete: boolean;
};

export type AcademicData = {
  activeTermName: string | null;
  overallAverageOn20: number | null;
  deltaVsPreviousTerm: number | null;
  studentsBelowAverageCount: number;
  totalEvaluatedStudents: number;
  gradesEntryCompletionRate: number;
  reportCardsStatus: {
    draft: number;
    submitted: number;
    approved: number;
  };
  classesProgress: AcademicClassProgress[];
};

export type ActivityTimelineItem = {
  id: string;
  kind: "payment" | "enrollment" | "message" | "document" | "reportCard";
  title: string;
  detail: string;
  timestamp: Date;
  timeFormatted: string;
};

export type DirectorDashboardSnapshot = {
  firstName: string | null;
  schoolName: string | null;
  currentAcademicYear: string;
  todayFormatted: string;
  currentPeriodContext: string;
  scope: {
    money: boolean;
    students: boolean;
    validation: boolean;
    pedagogie: boolean;
  };
  hasDemoData: boolean;
  kpis: DirectorKPIs;
  financialCommand: FinancialCommandData | null;
  actionsRequired: ActionRequiredItem[];
  enrollment: EnrollmentData;
  attendanceToday: AttendanceTodayData;
  academic: AcademicData;
  recentActivity: ActivityTimelineItem[];
  readiness: ConfigurationReadiness | null;
};

const CYCLE_DISPLAY_LABELS: Record<string, string> = {
  MATERNELLE: "Maternelle",
  ELEMENTAIRE: "Élémentaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  AUTRE: "Autre cycle",
};

/**
 * Construit l'instantané complet pour le poste de pilotage Direction.
 */
export async function getDirectorDashboardSnapshot(
  actor: ActorContext,
  identity: { firstName: string | null; schoolName: string | null },
  simulation?: { date?: Date; period?: PeriodKind }
): Promise<DirectorDashboardSnapshot> {
  const { schoolId } = actor;
  const role = actor.role as RoleType;
  const now = simulation?.date || new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMonday = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const scope = {
    money: hasAccess(role, "/dashboard/payments"),
    students: hasAccess(role, "/dashboard/students"),
    validation: hasAccess(role, "/dashboard/documents/validation"),
    pedagogie: hasAccess(role, "/dashboard/grades") || hasAccess(role, "/dashboard/settings/pedagogie"),
  };

  // 1. REQUÊTES EN BATCH DU SOCLE BLOQUANT (KPIs, Alertes, Finances, Assiduité, Effectifs)
  interface DashboardCountersRaw {
    submitted_report_cards: number;
    pending_doc_requests: number;
    docs_to_review: number;
    teachers_count: number;
    demo_classes_count: number;
    new_students_30d: number;
  }

  interface ClassOccupancyRaw {
    id: string;
    name: string;
    cycle: string;
    teacherId: string | null;
    teacherFirstName: string | null;
    teacherLastName: string | null;
    studentCount: number;
  }

  const [
    schoolRecord,
    activeFeeSchedule,
    terms,
    classesRaw,
    studentStatusGroups,
    invoiceStatsRaw,
    paymentStatsRaw,
    paymentMethodsGroup,
    todayAttendanceRecords,
    enrollmentCountsByYear,
    countersRaw,
  ] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeAcademicYear: true },
    }),
    prisma.feeSchedule.findFirst({
      where: { schoolId, status: "ACTIVE" },
      select: {
        academicYear: true,
        label: true,
        items: {
          where: { schoolId },
          select: {
            id: true,
            kind: true,
            amount: true,
            cadence: true,
            mandatory: true,
            classId: true,
            cycle: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.term.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        evaluations: {
          select: { id: true, name: true, type: true, date: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.$queryRaw<ClassOccupancyRaw[]>`
      SELECT 
        c."id",
        c."name",
        c."cycle"::text,
        c."teacherId",
        u."firstName" as "teacherFirstName",
        u."lastName" as "teacherLastName",
        COALESCE(e."studentCount", 0)::int as "studentCount"
      FROM "Class" c
      LEFT JOIN "User" u ON u."id" = c."teacherId" AND u."schoolId" = ${schoolId}
      LEFT JOIN (
        SELECT "classId", COUNT(*)::int as "studentCount"
        FROM "Enrollment"
        WHERE "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
        GROUP BY "classId"
      ) e ON e."classId" = c."id"
      WHERE c."schoolId" = ${schoolId}
      ORDER BY c."name" ASC
    `,
    prisma.student.groupBy({
      by: ["status"],
      where: { schoolId, status: { in: ["PENDING", "GRADUATED", "INACTIVE"] } },
      _count: { id: true },
    }),
    scope.money
      ? prisma.$queryRaw<Array<{
          total_count: number;
          total_billed: number;
          overdue_amount: number;
          overdue_count: number;
          overdue_families: number;
          overdue_15d_amount: number;
          overdue_15d_count: number;
          overdue_30d_amount: number;
          overdue_30d_count: number;
          overdue_critical_amount: number;
          overdue_critical_count: number;
          upcoming_amount: number;
          upcoming_count: number;
          next_due_date: Date | null;
        }>>`
          SELECT 
            COUNT(*)::int as total_count,
            COALESCE(SUM("totalAmount"), 0)::int as total_billed,
            COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" < ${now} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_amount,
            COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" < ${now} THEN 1 END)::int as overdue_count,
            COUNT(DISTINCT CASE WHEN "status" != 'PAID' AND "dueDate" < ${now} THEN COALESCE("parentId", "studentId"::text) END)::int as overdue_families,
            COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${fifteenDaysAgo} AND "dueDate" < ${now} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_15d_amount,
            COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${fifteenDaysAgo} AND "dueDate" < ${now} THEN 1 END)::int as overdue_15d_count,
            COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${thirtyDaysAgo} AND "dueDate" < ${fifteenDaysAgo} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_30d_amount,
            COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${thirtyDaysAgo} AND "dueDate" < ${fifteenDaysAgo} THEN 1 END)::int as overdue_30d_count,
            COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" < ${thirtyDaysAgo} THEN "totalAmount" ELSE 0 END), 0)::int as overdue_critical_amount,
            COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" < ${thirtyDaysAgo} THEN 1 END)::int as overdue_critical_count,
            COALESCE(SUM(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${now} THEN "totalAmount" ELSE 0 END), 0)::int as upcoming_amount,
            COUNT(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${now} THEN 1 END)::int as upcoming_count,
            MIN(CASE WHEN "status" != 'PAID' AND "dueDate" >= ${now} THEN "dueDate" END) as next_due_date
          FROM "Invoice"
          WHERE "schoolId" = ${schoolId}
        `
      : Promise.resolve([]),
    scope.money
      ? prisma.$queryRaw<Array<{
          total_collected: number;
          collections_today: number;
          collections_week: number;
        }>>`
          SELECT 
            COALESCE(SUM("amount"), 0)::int as total_collected,
            COALESCE(SUM(CASE WHEN "createdAt" >= ${startOfToday} THEN "amount" ELSE 0 END), 0)::int as collections_today,
            COALESCE(SUM(CASE WHEN "createdAt" >= ${startOfWeek} THEN "amount" ELSE 0 END), 0)::int as collections_week
          FROM "Payment"
          WHERE "schoolId" = ${schoolId}
        `
      : Promise.resolve([]),
    scope.money
      ? prisma.payment.groupBy({
          by: ["method"],
          where: { schoolId },
          _sum: { amount: true },
          _count: { id: true },
        })
      : Promise.resolve([]),
    prisma.attendance.findMany({
      where: { schoolId, date: startOfToday },
      select: {
        id: true,
        status: true,
        studentId: true,
        classId: true,
      },
    }),
    prisma.enrollment.groupBy({
      by: ["academicYear"],
      where: { class: { schoolId } },
      _count: { id: true },
    }),
    prisma.$queryRaw<DashboardCountersRaw[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "ReportCard" WHERE "schoolId" = ${schoolId} AND "status" = 'SUBMITTED') as submitted_report_cards,
        (SELECT COUNT(*)::int FROM "DocumentRequest" WHERE "schoolId" = ${schoolId} AND "status" = 'PENDING') as pending_doc_requests,
        (SELECT COUNT(*)::int FROM "SchoolDocument" WHERE "schoolId" = ${schoolId} AND "status" = 'REVIEW') as docs_to_review,
        (SELECT COUNT(*)::int FROM "User" WHERE "schoolId" = ${schoolId} AND "role" = 'TEACHER') as teachers_count,
        (SELECT COUNT(*)::int FROM "Class" WHERE "schoolId" = ${schoolId} AND "isDemo" = true) as demo_classes_count,
        (SELECT COUNT(*)::int FROM "Student" WHERE "schoolId" = ${schoolId} AND "createdAt" >= ${thirtyDaysAgo}) as new_students_30d
    `,
  ]);

  const classesList = classesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    cycle: c.cycle as any,
    teacherId: c.teacherId,
    teacher: c.teacherFirstName
      ? { id: c.teacherId!, firstName: c.teacherFirstName, lastName: c.teacherLastName! }
      : null,
    _count: { enrollments: c.studentCount },
  }));

  const submittedReportCardsCount = countersRaw[0]?.submitted_report_cards ?? 0;
  const docRequestsCount = countersRaw[0]?.pending_doc_requests ?? 0;
  const docsToReviewCount = countersRaw[0]?.docs_to_review ?? 0;
  const teachersCount = countersRaw[0]?.teachers_count ?? 0;
  const demoClassCount = countersRaw[0]?.demo_classes_count ?? 0;
  const newStudentsIn30d = countersRaw[0]?.new_students_30d ?? 0;

  // Synchronous resolution of forecast & readiness using preloaded data (ZERO additional DB query)
  const monthlyExp = scope.money
    ? await monthlyForecast(actor, { schedule: activeFeeSchedule, classes: classesList })
    : 0;

  const readiness = scope.pedagogie
    ? await configurationReadiness(actor, {
        classes: classesList,
        terms,
        teachersCount,
        evaluations: terms.flatMap((t) => (t.evaluations || []).map((e) => ({ ...e, termId: t.id }))),
        classesWithTeacher: classesList.filter((c) => c.teacherId !== null).map((c) => ({ id: c.id })),
        assignments: [],
        links: classesList.map((c) => ({ classId: c.id })),
        customCoefficients: 0,
      })
    : null;


  // 2. CONTEXTE DE L'ANNÉE SCOLAIRE ACTIVE (Règle 1 : Source unique déclarée par l'école)
  const currentAcademicYear = resolveAcademicYear(schoolRecord) || activeFeeSchedule?.academicYear || defaultAcademicYear();

  const todayFormatted = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { current: currentTerm, previous: prevTerm } = pickCurrentTerm(terms);
  const currentPeriodContext = currentTerm?.name || "Année en cours";

  // 3. CALCULS FINANCIERS DÉTAILLÉS (Command Center — Agrégés en SQL natif)
  let financialCommand: FinancialCommandData | null = null;
  let overdueTotalAmount = 0;
  let overdueFamiliesCount = 0;
  let totalBilled = 0;
  let totalCollected = 0;
  let recoveryRate: number | null = null;

  if (scope.money) {
    const inv = invoiceStatsRaw[0];
    const pay = paymentStatsRaw[0];

    totalCollected = pay?.total_collected ?? 0;
    totalBilled = inv?.total_billed ?? 0;
    recoveryRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : null;

    overdueTotalAmount = inv?.overdue_amount ?? 0;
    overdueFamiliesCount = inv?.overdue_families ?? 0;

    const bUnder15Amount = inv?.overdue_15d_amount ?? 0;
    const b15to30Amount = inv?.overdue_30d_amount ?? 0;
    const bOver30Amount = inv?.overdue_critical_amount ?? 0;

    const agingBuckets: OverdueAgingBucket[] = [
      {
        label: "< 15 jours",
        count: inv?.overdue_15d_count ?? 0,
        amount: bUnder15Amount,
        percentage: overdueTotalAmount > 0 ? Math.round((bUnder15Amount / overdueTotalAmount) * 100) : 0,
      },
      {
        label: "15 – 30 jours",
        count: inv?.overdue_30d_count ?? 0,
        amount: b15to30Amount,
        percentage: overdueTotalAmount > 0 ? Math.round((b15to30Amount / overdueTotalAmount) * 100) : 0,
      },
      {
        label: "> 30 jours (Critique)",
        count: inv?.overdue_critical_count ?? 0,
        amount: bOver30Amount,
        percentage: overdueTotalAmount > 0 ? Math.round((bOver30Amount / overdueTotalAmount) * 100) : 0,
      },
    ];

    const collectionsToday = pay?.collections_today ?? 0;
    const collectionsThisWeek = pay?.collections_week ?? 0;

    const methodLabels: Record<string, string> = {
      MOBILE_MONEY: "Wave / Mobile Money",
      CASH: "Espèces (Caisse)",
      BANK_TRANSFER: "Virement bancaire",
      CHECK: "Chèque",
    };

    const channelBreakdown: PaymentMethodBreakdown[] = paymentMethodsGroup.map((p) => {
      const m = String(p.method || "CASH");
      const amount = p._sum.amount ?? 0;
      return {
        method: m,
        label: methodLabels[m] || m,
        amount,
        count: p._count.id,
        percentage: totalCollected > 0 ? Math.round((amount / totalCollected) * 100) : 0,
      };
    });

    financialCommand = {
      monthExpected: monthlyExp,
      monthCollected: collectionsThisWeek,
      recoveryRate,
      totalOutstanding: Math.max(0, (monthlyExp || totalBilled) - totalCollected),
      overdueAmount: overdueTotalAmount,
      affectedFamilies: overdueFamiliesCount,
      agingBuckets,
      collectionsToday,
      collectionsThisWeek,
      channelBreakdown,
      upcomingReceivables: {
        count: inv?.upcoming_count ?? 0,
        amount: inv?.upcoming_amount ?? 0,
        nextDueDate: inv?.next_due_date ? new Date(inv.next_due_date) : null,
      },
    };
  }

  // 4. CALCULS ASSIDUITÉ DU JOUR
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;
  const attendanceByClass = new Map<string, { present: number; absent: number; late: number; total: number }>();

  for (const record of todayAttendanceRecords) {
    if (record.status === "PRESENT") presentCount += 1;
    else if (record.status === "ABSENT") absentCount += 1;
    else if (record.status === "LATE") lateCount += 1;
    else if (record.status === "EXCUSED") excusedCount += 1;

    const cId = record.classId;
    const existing = attendanceByClass.get(cId) || { present: 0, absent: 0, late: 0, total: 0 };
    existing.total += 1;
    if (record.status === "PRESENT" || record.status === "LATE") {
      existing.present += 1;
    }
    if (record.status === "ABSENT") existing.absent += 1;
    if (record.status === "LATE") existing.late += 1;
    attendanceByClass.set(cId, existing);
  }

  const recordedTotalToday = presentCount + absentCount + lateCount + excusedCount;
  const isRecordedToday = recordedTotalToday > 0;
  const globalAttendanceRate = isRecordedToday
    ? Math.round(((presentCount + lateCount) / recordedTotalToday) * 100)
    : null;

  // Séparation explicite : Classes avec appel validé vs Classes en attente d'appel
  const completedClasses: ClassAttendanceAlert[] = [];
  const pendingClasses: ClassAttendanceAlert[] = [];
  const attendanceAlerts: ClassAttendanceAlert[] = [];

  for (const c of classesList) {
    const classAtt = attendanceByClass.get(c.id);
    const studentsInClass = c._count.enrollments;
    if (studentsInClass === 0) continue;

    if (!classAtt || classAtt.total === 0) {
      const item: ClassAttendanceAlert = {
        classId: c.id,
        className: c.name,
        cycle: CYCLE_DISPLAY_LABELS[c.cycle] || c.cycle,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        totalStudents: studentsInClass,
        rate: null,
        status: "NOT_TAKEN",
      };
      pendingClasses.push(item);
      attendanceAlerts.push(item);
    } else {
      const classRate = Math.round((classAtt.present / classAtt.total) * 100);
      const isLow = classRate < 85;
      const item: ClassAttendanceAlert = {
        classId: c.id,
        className: c.name,
        cycle: CYCLE_DISPLAY_LABELS[c.cycle] || c.cycle,
        presentCount: classAtt.present,
        absentCount: classAtt.absent,
        lateCount: classAtt.late,
        totalStudents: classAtt.total,
        rate: classRate,
        status: isLow ? "LOW_ATTENDANCE" : "GOOD",
      };
      completedClasses.push(item);
      if (isLow) {
        attendanceAlerts.push(item);
      }
    }
  }

  const totalClassesWithStudents = completedClasses.length + pendingClasses.length;
  const isFullSchoolRecorded = totalClassesWithStudents > 0 && pendingClasses.length === 0;

  // Trier les alertes assiduité : les faibles taux en premier
  attendanceAlerts.sort((a, b) => {
    if (a.status === "LOW_ATTENDANCE" && b.status !== "LOW_ATTENDANCE") return -1;
    if (a.status !== "LOW_ATTENDANCE" && b.status === "LOW_ATTENDANCE") return 1;
    return (a.rate ?? 0) - (b.rate ?? 0);
  });

  const unassignedClasses = classesList.filter((c) => !c.teacherId);

  const totalStudentsCount =
    enrollmentCountsByYear.find((y) => y.academicYear === currentAcademicYear)?._count.id ??
    classesList.reduce((acc, c) => acc + c._count.enrollments, 0);

  const attendanceTodayData: AttendanceTodayData = {
    recordedToday: isRecordedToday,
    globalRate: globalAttendanceRate,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    totalRecordedStudents: recordedTotalToday,
    totalActiveStudents: totalStudentsCount,
    classesRecordedCount: completedClasses.length,
    classesTotalCount: totalClassesWithStudents,
    classesPendingAttendance: pendingClasses.length,
    isFullSchoolRecorded,
    completedClasses,
    pendingClasses,
    alerts: attendanceAlerts,
    unassignedClassesCount: unassignedClasses.length,
  };

  // 5. EFFECTIFS & RÉPARTITION PAR CLASSE
  const cycleCountMap = new Map<string, { students: number; classes: number }>();
  const classesOccupancyList: ClassOccupancyItem[] = [];

  let activeClassesCount = 0;
  let emptyClassesCount = 0;

  for (const c of classesList) {
    const sCount = c._count.enrollments;
    const hasStudents = sCount > 0;
    if (hasStudents) activeClassesCount += 1;
    else emptyClassesCount += 1;

    const shareOfSchool = totalStudentsCount > 0 ? Math.round((sCount / totalStudentsCount) * 100) : 0;

    const teacherName = c.teacher
      ? `${c.teacher.firstName} ${c.teacher.lastName}`
      : null;

    classesOccupancyList.push({
      id: c.id,
      name: c.name,
      cycle: CYCLE_DISPLAY_LABELS[c.cycle] || c.cycle,
      studentCount: sCount,
      shareOfSchool,
      teacherName,
      hasStudents,
    });

    const cGroup = cycleCountMap.get(c.cycle) || { students: 0, classes: 0 };
    cGroup.classes += 1;
    cGroup.students += sCount;
    cycleCountMap.set(c.cycle, cGroup);
  }

  const cycleDistribution: CycleDistribution[] = Array.from(cycleCountMap.entries()).map(
    ([cycle, val]) => ({
      cycle,
      label: CYCLE_DISPLAY_LABELS[cycle] || cycle,
      studentsCount: val.students,
      classesCount: val.classes,
    })
  );

  const classesWithTeacherCount = classesList.filter((c) => c.teacherId).length;
  const studentTeacherRatio =
    classesWithTeacherCount > 0
      ? Math.round(totalStudentsCount / classesWithTeacherCount)
      : null;

  const averageStudentsPerActiveClass =
    activeClassesCount > 0
      ? Math.round(totalStudentsCount / activeClassesCount)
      : null;

  const pendingStudentsCount = studentStatusGroups.find((s) => s.status === "PENDING")?._count.id ?? 0;
  const inactiveStudentsCount = studentStatusGroups
    .filter((s) => s.status === "GRADUATED" || s.status === "INACTIVE")
    .reduce((acc, s) => acc + s._count.id, 0);

  const enrollmentData: EnrollmentData = {
    totalActive: totalStudentsCount,
    pendingAdmissions: pendingStudentsCount,
    inactiveOrGraduated: inactiveStudentsCount,
    newIn30Days: newStudentsIn30d,
    classesCount: classesList.length,
    activeClassesCount,
    emptyClassesCount,
    averageStudentsPerActiveClass,
    studentTeacherRatio,
    assignedTeachersCount: classesWithTeacherCount,
    cycleDistribution,
    classesOccupancy: classesOccupancyList,
  };

  // 7. ACTIONS REQUISES (« À traiter aujourd'hui »)
  const actionsRequired: ActionRequiredItem[] = [];

  // Urgent : Retards de paiement critiques
  if (scope.money && overdueTotalAmount > 0) {
    actionsRequired.push({
      id: "overdue_payments",
      severity: "urgent",
      category: "finance",
      title: "Paiements en retard à relancer",
      description: `${overdueFamiliesCount} famille${overdueFamiliesCount > 1 ? "s" : ""} concernée${overdueFamiliesCount > 1 ? "s" : ""} · ${overdueTotalAmount.toLocaleString("fr-FR")} FCFA en souffrance`,
      count: overdueFamiliesCount,
      badgeText: `${overdueTotalAmount.toLocaleString("fr-FR")} FCFA`,
      href: "/dashboard/payments",
      cta: "Relancer les familles",
      icon: "alert-circle",
    });
  }

  // Urgent / Watch : Blocage configuration pédagogique
  if (scope.pedagogie && readiness && !readiness.canEnterGrades) {
    const blockingSteps = readiness.steps.filter((s) => s.blocking && s.state !== "done");
    actionsRequired.push({
      id: "pedagogie_config",
      severity: "urgent",
      category: "pedagogy",
      title: "Configuration pédagogique incomplète",
      description: `${blockingSteps.length} étape${blockingSteps.length > 1 ? "s" : ""} bloquante${blockingSteps.length > 1 ? "s" : ""} empêche${blockingSteps.length > 1 ? "nt" : ""} la saisie des notes`,
      count: blockingSteps.length,
      href: "/dashboard/settings/pedagogie/wizard?step=1",
      cta: "Compléter la configuration",
      icon: "sliders",
    });
  }

  // Urgent : Aucun élève importé alors que des classes existent
  if (scope.students && classesList.length > 0 && totalStudentsCount === 0) {
    actionsRequired.push({
      id: "students_import_pending",
      severity: "urgent",
      category: "admission",
      title: "Import des élèves à finaliser",
      description: "Vos classes sont prêtes mais aucun élève n'y est encore inscrit",
      count: classesList.length,
      badgeText: "Étape 2",
      href: "/dashboard/settings/pedagogie/wizard?step=2",
      cta: "Importer les élèves",
      icon: "user-plus",
    });
  }

  // Watch : Dossiers d'admission en attente (Portail de révision)
  if (scope.students && pendingStudentsCount > 0) {
    actionsRequired.push({
      id: "pending_admissions",
      severity: "watch",
      category: "admission",
      title: "Dossiers d'inscription en attente",
      description: `${pendingStudentsCount} dossier${pendingStudentsCount > 1 ? "s" : ""} d'élève${pendingStudentsCount > 1 ? "s" : ""} en attente de décision`,
      count: pendingStudentsCount,
      href: "/dashboard/students/dossiers/review",
      cta: "Examiner les dossiers",
      icon: "user-plus",
    });
  }

  // Watch : Bulletins soumis en attente de validation
  if (scope.validation && submittedReportCardsCount > 0) {
    actionsRequired.push({
      id: "submitted_report_cards",
      severity: "watch",
      category: "pedagogy",
      title: "Bulletins à valider",
      description: `${submittedReportCardsCount} bulletin${submittedReportCardsCount > 1 ? "s" : ""} transmis par les enseignants`,
      count: submittedReportCardsCount,
      href: "/dashboard/documents/validation",
      cta: "Relire et approuver",
      icon: "file-check",
    });
  }

  // Watch : Classes sans enseignant titulaire (Vue ciblée affectation rapide)
  if (scope.students && unassignedClasses.length > 0) {
    actionsRequired.push({
      id: "unassigned_classes",
      severity: "watch",
      category: "staff",
      title: "Classes sans enseignant responsable",
      description: `${unassignedClasses.length} classe${unassignedClasses.length > 1 ? "s" : ""} n'ont pas encore de titulaire désigné`,
      count: unassignedClasses.length,
      href: "/dashboard/classes?filter=unassigned",
      cta: "Affecter un enseignant",
      icon: "users",
    });
  }

  // Watch : Documents en attente de publication
  if (docsToReviewCount > 0) {
    actionsRequired.push({
      id: "docs_review",
      severity: "watch",
      category: "document",
      title: "Documents officiels à valider",
      description: `${docsToReviewCount} document${docsToReviewCount > 1 ? "s" : ""} en attente de publication officielle`,
      count: docsToReviewCount,
      href: "/dashboard/documents/centre",
      cta: "Valider les documents",
      icon: "file-text",
    });
  }

  // Info : Demandes de documents administratifs
  if (docRequestsCount > 0) {
    actionsRequired.push({
      id: "doc_requests",
      severity: "info",
      category: "document",
      title: "Demandes de pièces / certificats",
      description: `${docRequestsCount} demande${docRequestsCount > 1 ? "s" : ""} enregistrée${docRequestsCount > 1 ? "s" : ""} par les familles`,
      count: docRequestsCount,
      href: "/dashboard/documents",
      cta: "Consulter les demandes",
      icon: "help-circle",
    });
  }

  // 8. KPIS STRIP (3 à 5 indicateurs essentiels)
  const urgentCount = actionsRequired.filter((a) => a.severity === "urgent").length;

  const countsByYear: Record<string, number> = {};
  for (const yc of enrollmentCountsByYear) {
    if (yc.academicYear && yc._count) {
      countsByYear[yc.academicYear] = yc._count.id;
    }
  }

  const yearParts = currentAcademicYear.split("-").map(Number);
  const prevAcademicYear = yearParts.length === 2 && !isNaN(yearParts[0]) && !isNaN(yearParts[1])
    ? `${yearParts[0] - 1}-${yearParts[1] - 1}`
    : null;

  const activeStudentsThisYearCount = countsByYear[currentAcademicYear] ?? totalStudentsCount;
  const prevYearCount = prevAcademicYear ? (countsByYear[prevAcademicYear] || 0) : 0;

  const kpis: DirectorKPIs = {
    activeStudents: {
      count: activeStudentsThisYearCount,
      academicYear: currentAcademicYear,
      prevYear: prevAcademicYear,
      prevYearCount,
      new30d: newStudentsIn30d,
      pendingCount: pendingStudentsCount,
    },
    recovery: {
      rate: recoveryRate,
      collected: totalCollected,
      expected: monthlyExp || totalBilled,
      outstanding: Math.max(0, (monthlyExp || totalBilled) - totalCollected),
    },
    overdue: {
      totalAmount: overdueTotalAmount,
      affectedFamilies: overdueFamiliesCount,
      invoicesCount: scope.money ? (invoiceStatsRaw[0]?.overdue_count ?? 0) : 0,
    },
    attendanceToday: {
      rate: globalAttendanceRate,
      presentCount: presentCount + lateCount,
      totalRecordedStudents: recordedTotalToday,
      totalExpected: totalStudentsCount,
      absentCount,
      isRecorded: isRecordedToday,
      classesRecordedCount: completedClasses.length,
      classesTotalCount: totalClassesWithStudents,
      isFullSchoolRecorded,
    },
    urgentActionsCount: urgentCount,
  };

  return {
    firstName: identity.firstName,
    schoolName: identity.schoolName,
    currentAcademicYear,
    todayFormatted,
    currentPeriodContext,
    scope,
    hasDemoData: demoClassCount > 0,
    kpis,
    financialCommand,
    actionsRequired,
    enrollment: enrollmentData,
    attendanceToday: attendanceTodayData,
    academic: null as any,
    recentActivity: [],
    readiness: scope.pedagogie ? readiness : null,
  };
}

/**
 * Charge les données de suivi pédagogique (différées via React Suspense).
 */
export async function getAcademicDashboardData(schoolId: string): Promise<AcademicData> {
  const emptyAcademicData: AcademicData = {
    activeTermName: null,
    overallAverageOn20: null,
    deltaVsPreviousTerm: null,
    studentsBelowAverageCount: 0,
    totalEvaluatedStudents: 0,
    gradesEntryCompletionRate: 0,
    reportCardsStatus: {
      draft: 0,
      submitted: 0,
      approved: 0,
    },
    classesProgress: [],
  };

  try {
    const [terms, classesList, gradesByClassRaw, overallGradesRaw, evaluatedStudentsRaw, reportCardGroups] =
      await Promise.all([
        prisma.term.findMany({
          where: { schoolId },
          select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.class.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            cycle: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { name: "asc" },
        }),
        prisma.$queryRaw<Array<{
          classId: string;
          grades_count: number;
          weighted_sum: number;
          total_coef: number;
        }>>`
          SELECT 
            "classId",
            COUNT(*)::int as grades_count,
            COALESCE(SUM(("value" / "max") * 20 * CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as weighted_sum,
            COALESCE(SUM(CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as total_coef
          FROM "Grade"
          WHERE "max" > 0 AND "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
          GROUP BY "classId"
        `,
        prisma.$queryRaw<Array<{
          termId: string;
          overall_weighted_sum: number;
          overall_total_coef: number;
        }>>`
          SELECT 
            "termId",
            COALESCE(SUM(("value" / "max") * 20 * CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as overall_weighted_sum,
            COALESCE(SUM(CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0)::float as overall_total_coef
          FROM "Grade"
          WHERE "max" > 0 AND "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
          GROUP BY "termId"
        `,
        prisma.$queryRaw<Array<{
          termId: string;
          students_below_avg: number;
          total_evaluated_students: number;
        }>>`
          SELECT 
            "termId",
            COUNT(CASE WHEN avg_score < 10 THEN 1 END)::int as students_below_avg,
            COUNT(*)::int as total_evaluated_students
          FROM (
            SELECT "termId", "studentId",
              SUM(("value" / "max") * 20 * CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END) / 
              NULLIF(SUM(CASE WHEN "coefficient" > 0 THEN "coefficient" ELSE 1 END), 0) as avg_score
            FROM "Grade"
            WHERE "max" > 0 AND "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = ${schoolId})
            GROUP BY "termId", "studentId"
          ) sub
          GROUP BY "termId"
        `,
        prisma.reportCard.groupBy({
          by: ["status"],
          where: { schoolId },
          _count: { id: true },
        }),
      ]);

    const { current: currentTerm, previous: prevTerm } = pickCurrentTerm(terms);
    let overallAverageOn20: number | null = null;
    let deltaVsPreviousTerm: number | null = null;

    if (currentTerm) {
      const curStat = overallGradesRaw.find((g) => g.termId === currentTerm.id);
      if (curStat && curStat.overall_total_coef > 0) {
        overallAverageOn20 = parseFloat((curStat.overall_weighted_sum / curStat.overall_total_coef).toFixed(1));
      }

      if (prevTerm) {
        const prevStat = overallGradesRaw.find((g) => g.termId === prevTerm.id);
        if (prevStat && prevStat.overall_total_coef > 0 && overallAverageOn20 !== null) {
          const prevAvg = prevStat.overall_weighted_sum / prevStat.overall_total_coef;
          deltaVsPreviousTerm = parseFloat((overallAverageOn20 - prevAvg).toFixed(1));
        }
      }
    }

    const curEvaluated = evaluatedStudentsRaw.find((s) => s.termId === currentTerm?.id);
    const studentsBelowAverageCount = curEvaluated?.students_below_avg ?? 0;
    const totalEvaluatedStudents = curEvaluated?.total_evaluated_students ?? 0;

    const classesProgress: AcademicClassProgress[] = classesList.map((c) => {
      const cData = gradesByClassRaw.find((g) => g.classId === c.id);
      const avg = cData && cData.total_coef > 0 ? parseFloat((cData.weighted_sum / cData.total_coef).toFixed(1)) : null;
      const gradesCount = cData?.grades_count ?? 0;
      return {
        classId: c.id,
        className: c.name,
        cycle: CYCLE_DISPLAY_LABELS[c.cycle] || c.cycle,
        gradesCount,
        averageOn20: avg,
        isComplete: gradesCount >= c._count.enrollments * 2,
      };
    });

    const classesWithGradesCount = classesProgress.filter((c) => c.gradesCount > 0).length;
    const gradesEntryCompletionRate =
      classesList.length > 0 ? Math.round((classesWithGradesCount / classesList.length) * 100) : 0;

    const reportCardDrafts = reportCardGroups.find((r) => r.status === "DRAFT")?._count.id ?? 0;
    const submittedReportCards = reportCardGroups.find((r) => r.status === "SUBMITTED")?._count.id ?? 0;
    const reportCardApproved = reportCardGroups.find((r) => r.status === "APPROVED")?._count.id ?? 0;

    return {
      activeTermName: currentTerm?.name || null,
      overallAverageOn20,
      deltaVsPreviousTerm,
      studentsBelowAverageCount,
      totalEvaluatedStudents,
      gradesEntryCompletionRate,
      reportCardsStatus: {
        draft: reportCardDrafts,
        submitted: submittedReportCards,
        approved: reportCardApproved,
      },
      classesProgress,
    };
  } catch (error) {
    console.error("Erreur lors du chargement des données académiques :", error);
    return emptyAcademicData;
  }
}

/**
 * Charge le flux d'activité récente (différé via React Suspense).
 */
export async function getRecentActivityFeedData(
  schoolId: string,
  scopeMoney: boolean
): Promise<ActivityTimelineItem[]> {
  try {
    const [recentPayments, recentStudents, recentMessages, recentDocs] = await Promise.all([
      scopeMoney
        ? prisma.payment.findMany({
            where: { schoolId },
            select: {
              id: true,
              amount: true,
              method: true,
              reference: true,
              createdAt: true,
              invoice: {
                select: {
                  student: { select: { firstName: true, lastName: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 4,
          })
        : Promise.resolve([]),
      prisma.student.findMany({
        where: { schoolId },
        select: { id: true, firstName: true, lastName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.message.findMany({
        where: { schoolId, direction: "INBOUND" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          parent: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.schoolDocument.findMany({
        where: { schoolId, status: "PUBLISHED" },
        select: { id: true, title: true, publishedAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2,
      }),
    ]);

    const recentActivity: ActivityTimelineItem[] = [];

    for (const p of recentPayments) {
      recentActivity.push({
        id: `pay-${p.id}`,
        kind: "payment",
        title: `Paiement encaissé — ${p.amount.toLocaleString("fr-FR")} FCFA`,
        detail: p.invoice?.student
          ? `Élève : ${p.invoice.student.firstName} ${p.invoice.student.lastName}`
          : "Paiement direct",
        timestamp: p.createdAt,
        timeFormatted: formatTime(p.createdAt),
      });
    }

    for (const s of recentStudents) {
      recentActivity.push({
        id: `stu-${s.id}`,
        kind: "enrollment",
        title: `Nouvelle inscription enregistrée`,
        detail: `${s.firstName} ${s.lastName}`,
        timestamp: s.createdAt,
        timeFormatted: formatTime(s.createdAt),
      });
    }

    for (const m of recentMessages) {
      recentActivity.push({
        id: `msg-${m.id}`,
        kind: "message",
        title: `Message reçu d'un parent`,
        detail: m.parent ? `${m.parent.firstName} ${m.parent.lastName}` : "Famille élève",
        timestamp: m.createdAt,
        timeFormatted: formatTime(m.createdAt),
      });
    }

    for (const d of recentDocs) {
      recentActivity.push({
        id: `doc-${d.id}`,
        kind: "document",
        title: `Document officiel publié`,
        detail: d.title,
        timestamp: d.publishedAt ?? d.updatedAt,
        timeFormatted: formatTime(d.publishedAt ?? d.updatedAt),
      });
    }

    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return recentActivity.slice(0, 8);
  } catch (error) {
    console.error("Erreur lors du chargement de l'activité récente :", error);
    return [];
  }
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
