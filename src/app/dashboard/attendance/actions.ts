"use server";

import { prisma } from "@/lib/prisma";
import { notifierParentsEleves } from "@/lib/notificationsFamille";
import { requireActionContext } from "@/lib/actionContext";
import { type AttendanceStatus } from "@/generated/prisma/client";
import { teacherClassIds } from "@/lib/studentScope";

export type AttendanceInput = {
  studentId: string;
  status: AttendanceStatus;
  reason?: string | null;
};

export async function getAttendanceForClass(classId: string, date: Date) {
  const auth = await requireActionContext("/dashboard/attendance", { lecture: true });
  if (!auth.ok) throw new Error(auth.error);
  const { schoolId, role } = auth.ctx;

  if (role === "TEACHER") {
    const allowedClasses = await teacherClassIds(auth.ctx);
    if (!allowedClasses.includes(classId)) {
      throw new Error("Vous n'avez pas accès à cette classe.");
    }
  }
  
  // Normalise the date to 00:00:00
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // Validate class belongs to school
  const targetClass = await prisma.class.findFirst({
    where: { id: classId, schoolId }
  });
  if (!targetClass) throw new Error("Classe non trouvée ou accès refusé.");

  // Get enrolled students
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      status: "ENROLLED",
      enrollments: {
        some: { classId }
      }
    },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" }
    ]
  });

  // Get existing attendance
  const attendances = await prisma.attendance.findMany({
    where: {
      schoolId,
      classId,
      date: normalizedDate
    }
  });

  const attendanceMap = new Map(attendances.map(a => [a.studentId, a]));

  return students.map(s => ({
    student: { id: s.id, firstName: s.firstName, lastName: s.lastName, matricule: s.matricule },
    attendance: attendanceMap.get(s.id) || null
  }));
}

export async function saveAttendanceBatch(classId: string, date: Date, records: AttendanceInput[]) {
  const auth = await requireActionContext("/dashboard/attendance");
  if (!auth.ok) throw new Error(auth.error);
  const { schoolId, role, userId } = auth.ctx;

  if (role === "TEACHER") {
    const allowedClasses = await teacherClassIds(auth.ctx);
    if (!allowedClasses.includes(classId)) {
      throw new Error("Vous n'avez pas accès à cette classe.");
    }
  }

  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const targetClass = await prisma.class.findFirst({
    where: { id: classId, schoolId }
  });
  if (!targetClass) throw new Error("Classe non trouvée ou accès refusé.");

  if (records.length === 0) {
    return { success: true };
  }

  const studentIds = records.map((r) => r.studentId);

  // 26 sept. 2026 — statuts d'avant l'enregistrement : la famille n'est prévenue
  // qu'au CHANGEMENT (ré-enregistrer l'appel ne renvoie pas la même alerte).
  const avant = new Map(
    (
      await prisma.attendance.findMany({
        where: { schoolId, date: normalizedDate, studentId: { in: studentIds } },
        select: { studentId: true, status: true },
      })
    ).map((a) => [a.studentId, a.status]),
  );

  // Règle 10 : Optimisation par batching atomique (deleteMany + createMany)
  // Exécute 2 requêtes SQL globales au lieu de N requêtes upsert séquentielles,
  // éliminant tout risque d'expiration de transaction (timeout 5000ms).
  await prisma.$transaction(
    [
      prisma.attendance.deleteMany({
        where: {
          schoolId,
          date: normalizedDate,
          studentId: { in: studentIds },
        },
      }),
      prisma.attendance.createMany({
        data: records.map((r) => ({
          date: normalizedDate,
          status: r.status,
          reason: r.reason || null,
          studentId: r.studentId,
          classId,
          schoolId,
          recordedById: userId,
        })),
      }),
    ],
    { timeout: 15000 }
  );

  // Absence ou retard : la famille est prévenue (cloche + téléphone).
  const alertes = records.filter((r) => (r.status === "ABSENT" || r.status === "LATE") && avant.get(r.studentId) !== r.status);
  if (alertes.length) {
    const statut = new Map(alertes.map((r) => [r.studentId, r.status]));
    const jour = normalizedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    await notifierParentsEleves(schoolId, alertes.map((r) => r.studentId), (e) => {
      const retard = statut.get(e.id) === "LATE";
      return {
        title: retard ? `⏰ Retard — ${e.firstName}` : `🔔 Absence — ${e.firstName}`,
        body: retard
          ? `${e.firstName} est arrivé(e) en retard ce ${jour}.`
          : `${e.firstName} a été noté(e) absent(e) ce ${jour}. Si l'absence est justifiée, écrivez au secrétariat depuis EduCom.`,
        url: "/famille/communaute",
        kind: retard ? "famille.retard" : "famille.absence",
      };
    });
  }

  return { success: true };
}

export async function getSchoolAttendanceStats(date: Date) {
  const auth = await requireActionContext("/dashboard/attendance", { lecture: true });
  if (!auth.ok) throw new Error(auth.error);
  const { schoolId, role } = auth.ctx;

  if (role === "TEACHER") {
    throw new Error("Accès non autorisé aux statistiques de l'établissement.");
  }
  
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // We want to know:
  // - Total classes expected
  // - Classes with recorded attendance
  // - Total present / absent / late
  
  const [totalClasses, classAttendances, todayAttendances] = await Promise.all([
    prisma.class.count({ where: { schoolId } }),
    
    // Group by class to see how many classes have at least one record
    prisma.attendance.groupBy({
      by: ["classId"],
      where: { schoolId, date: normalizedDate }
    }),
    
    prisma.attendance.findMany({
      where: { schoolId, date: normalizedDate },
      select: { status: true }
    })
  ]);

  const classesRecorded = classAttendances.length;
  
  let present = 0, absent = 0, late = 0, excused = 0;
  for (const a of todayAttendances) {
    if (a.status === "PRESENT") present++;
    if (a.status === "ABSENT") absent++;
    if (a.status === "LATE") late++;
    if (a.status === "EXCUSED") excused++;
  }

  return {
    totalClasses,
    classesRecorded,
    stats: {
      present,
      absent,
      late,
      excused,
      total: todayAttendances.length
    }
  };
}

export async function validateAbsence(attendanceId: string) {
  const auth = await requireActionContext("/dashboard/attendance");
  if (!auth.ok) return { success: false, error: auth.error };
  const { schoolId, role } = auth.ctx;

  if (role === "TEACHER" || role === "PARENT") {
    return { success: false, error: "Non autorisé" };
  }

  try {
    await prisma.attendance.update({
      where: { id: attendanceId, schoolId },
      data: { status: "EXCUSED", reason: "Validé par le secrétariat" }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Impossible de valider l'absence" };
  }
}

export type AttendanceHistoryRecord = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  status: AttendanceStatus;
  reason: string | null;
};

export type AttendanceHistorySession = {
  sessionId: string;
  date: string;
  classId: string;
  className: string;
  cycle: string | null;
  recordedBy: string;
  recordedAt: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  records: AttendanceHistoryRecord[];
};

export async function getAttendanceHistory(filters?: {
  classId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AttendanceHistorySession[]> {
  const auth = await requireActionContext("/dashboard/attendance", { lecture: true });
  if (!auth.ok) throw new Error(auth.error);
  const { schoolId, role } = auth.ctx;

  let allowedClassIds: string[] | null = null;
  if (role === "TEACHER") {
    allowedClassIds = await teacherClassIds(auth.ctx);
    if (filters?.classId && !allowedClassIds.includes(filters.classId)) {
      throw new Error("Vous n'avez pas accès à cette classe.");
    }
  }

  const classWhere = filters?.classId
    ? { classId: filters.classId }
    : allowedClassIds
    ? { classId: { in: allowedClassIds } }
    : {};

  let dateWhere: any = {};
  if (filters?.date) {
    const d = new Date(filters.date);
    d.setHours(0, 0, 0, 0);
    dateWhere = { date: d };
  } else if (filters?.startDate || filters?.endDate) {
    const range: any = {};
    if (filters.startDate) {
      const s = new Date(filters.startDate);
      s.setHours(0, 0, 0, 0);
      range.gte = s;
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate);
      e.setHours(23, 59, 59, 999);
      range.lte = e;
    }
    dateWhere = { date: range };
  }

  const rows = await prisma.attendance.findMany({
    where: {
      schoolId,
      ...classWhere,
      ...dateWhere,
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      class: { select: { id: true, name: true, cycle: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: [
      { date: "desc" },
      { class: { name: "asc" } },
      { student: { lastName: "asc" } },
    ],
  });

  const sessionMap = new Map<string, AttendanceHistorySession>();

  for (const row of rows) {
    const dateStr = row.date.toISOString().split("T")[0];
    const sessionId = `${dateStr}_${row.classId}`;

    if (!sessionMap.has(sessionId)) {
      const recordedByName = row.recordedBy
        ? `${row.recordedBy.firstName} ${row.recordedBy.lastName} (${row.recordedBy.role === "TEACHER" ? "Enseignant" : row.recordedBy.role})`
        : "Système / Inconnu";

      sessionMap.set(sessionId, {
        sessionId,
        date: dateStr,
        classId: row.classId,
        className: row.class.name,
        cycle: row.class.cycle,
        recordedBy: recordedByName,
        recordedAt: row.createdAt.toISOString(),
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        records: [],
      });
    }

    const session = sessionMap.get(sessionId)!;
    session.totalStudents += 1;
    if (row.status === "PRESENT") session.presentCount += 1;
    else if (row.status === "ABSENT") session.absentCount += 1;
    else if (row.status === "LATE") session.lateCount += 1;
    else if (row.status === "EXCUSED") session.excusedCount += 1;

    session.records.push({
      id: row.id,
      studentId: row.student.id,
      firstName: row.student.firstName,
      lastName: row.student.lastName,
      matricule: row.student.matricule,
      status: row.status,
      reason: row.reason,
    });
  }

  // Calcul du taux de présence pour chaque session
  for (const session of sessionMap.values()) {
    session.attendanceRate =
      session.totalStudents > 0
        ? Math.round((session.presentCount / session.totalStudents) * 100)
        : 0;
  }

  return Array.from(sessionMap.values());
}

