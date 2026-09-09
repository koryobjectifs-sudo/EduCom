"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { type AttendanceStatus } from "@/generated/prisma/client";
import { teacherClassIds } from "@/lib/studentScope";

export type AttendanceInput = {
  studentId: string;
  status: AttendanceStatus;
  reason?: string | null;
};

export async function getAttendanceForClass(classId: string, date: Date) {
  const auth = await requireActionContext("/dashboard/attendance");
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

  return { success: true };
}

export async function getSchoolAttendanceStats(date: Date) {
  const auth = await requireActionContext("/dashboard/attendance");
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
