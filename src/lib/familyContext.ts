import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveSchoolContext, type ActiveMembershipInfo } from "@/lib/schoolContext";
import type { User, School } from "@/generated/prisma/client";

export interface FamilyChildInfo {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  dateOfBirth: Date | null;
  status: string;
  className: string;
  classId: string | null;
  academicYear: string | null;
}

export interface FamilyReminderInfo {
  id: string;
  studentId: string;
  studentName: string;
  requirementId: string;
  requirementLabel: string;
  nature: string;
  actionUrl: string | null;
  message: string | null;
  createdAt: Date;
}

export interface ResolvedFamilyContext {
  user: User;
  schoolId: string;
  school: School;
  role: string;
  memberships: ActiveMembershipInfo[];
  children: FamilyChildInfo[];
  pendingReminders: FamilyReminderInfo[];
}

/**
 * Contexte de sécurité et de données dédié à l'Espace Famille (/famille).
 *
 * GARANTIES MULTI-LOCATAIRES :
 * 1. Détermine l'école active de manière sécurisée via resolveSchoolContext().
 * 2. Filtre STRICTEMENT les élèves : parentId = user.id AND schoolId = activeSchoolId.
 *    Les enfants inscrits dans d'autres écoles ne sont JAMAIS mélangés.
 * 3. Filtre STRICTEMENT les relances et actions requises pour cet établissement.
 */
export const requireFamilyContext = cache(async function requireFamilyContext(): Promise<ResolvedFamilyContext> {
  const result = await resolveSchoolContext();
  if (!result.ok) {
    if (result.redirectUrl) {
      redirect(result.redirectUrl);
    }
    redirect("/famille/login");
  }

  const { context } = result;

  if (!context.school) {
    redirect("/login?erreur=espace_absent");
  }

  if (!context.school.onboardingCompleted) {
    redirect("/onboarding");
  }

  // 1. Récupération des enfants rattachés au parent DANS CET ÉTABLISSEMENT UNIQUEMENT
  const rawStudents = await prisma.student.findMany({
    where: {
      parentId: context.user.id,
      schoolId: context.schoolId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      matricule: true,
      dateOfBirth: true,
      status: true,
      enrollments: {
        select: {
          academicYear: true,
          classId: true,
          class: { select: { id: true, name: true } },
        },
        orderBy: { academicYear: "desc" },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const children: FamilyChildInfo[] = rawStudents.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    matricule: s.matricule,
    dateOfBirth: s.dateOfBirth,
    status: s.status,
    className: s.enrollments?.[0]?.class?.name || "Non assigné(e)",
    classId: s.enrollments?.[0]?.classId || null,
    academicYear: s.enrollments?.[0]?.academicYear || context.school.activeAcademicYear || null,
  }));

  // 2. Récupération des relances et actions requises pour ce parent dans cet établissement
  const rawReminders = await prisma.documentReminder.findMany({
    where: {
      parentId: context.user.id,
      schoolId: context.schoolId,
      status: "PENDING",
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      requirement: { select: { id: true, label: true, nature: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingReminders: FamilyReminderInfo[] = rawReminders.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: `${r.student?.firstName || ""} ${r.student?.lastName || ""}`.trim() || "Votre enfant",
    requirementId: r.requirementId,
    requirementLabel: r.requirement?.label || "Document justificatif",
    nature: r.requirement?.nature || "UPLOAD",
    actionUrl: r.actionUrl,
    message: r.message,
    createdAt: r.createdAt,
  }));

  return {
    user: context.user,
    schoolId: context.schoolId,
    school: context.school,
    role: context.role,
    memberships: context.memberships,
    children,
    pendingReminders,
  };
});
