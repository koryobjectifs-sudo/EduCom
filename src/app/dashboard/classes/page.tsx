import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { currentAcademicYear } from "@/lib/studentFile";
import ClassListClient, { type ClassItem, type TeacherItem } from "./ClassListClient";

export const metadata = {
  title: "Gestion des classes & Titulaires | EduCom",
  description: "Liste des classes par cycle, effectifs et affectation des enseignants responsables",
};

interface ClassesPageProps {
  searchParams: Promise<{
    filter?: string;
    cycle?: string;
    q?: string;
  }>;
}

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const { user, schoolId, school } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/classes")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const filterParam = sp?.filter === "unassigned" ? "unassigned" : "all";
  const cycleParam = sp?.cycle || null;
  const searchParam = sp?.q || "";
  const activeYear = currentAcademicYear(school);

  const [rawClasses, teachers, allAssignments, allSubjects] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        enrollments: {
          where: { academicYear: activeYear },
          select: { id: true },
        },
        subjects: {
          select: {
            subjectId: true,
            coefficient: true,
            subject: { select: { id: true, name: true } },
          },
          orderBy: { subject: { name: "asc" } },
        },
        _count: {
          select: {
            grades: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["TEACHER", "OWNER", "ADMIN"] } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.teachingAssignment.findMany({
      where: { schoolId },
      select: {
        id: true,
        classId: true,
        teacherId: true,
        subjectId: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // 1. Calcul de charge par enseignant et des matières enseignées
  const teacherClassSets = new Map<string, Set<string>>();
  const teacherSubjectSets = new Map<string, Set<string>>();

  for (const c of rawClasses) {
    if (c.teacherId) {
      if (!teacherClassSets.has(c.teacherId)) teacherClassSets.set(c.teacherId, new Set());
      teacherClassSets.get(c.teacherId)!.add(c.id);
    }
  }

  for (const a of allAssignments) {
    if (!teacherClassSets.has(a.teacherId)) teacherClassSets.set(a.teacherId, new Set());
    teacherClassSets.get(a.teacherId)!.add(a.classId);

    if (a.subjectId) {
      if (!teacherSubjectSets.has(a.teacherId)) teacherSubjectSets.set(a.teacherId, new Set());
      teacherSubjectSets.get(a.teacherId)!.add(a.subjectId);
    }
  }

  const teacherItems: TeacherItem[] = teachers.map((t) => {
    const classCount = teacherClassSets.get(t.id)?.size || 0;
    return {
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      role: t.role,
      assignedClassCount: classCount,
      highLoadWarning: classCount > 8,
      subjectIdsTaught: Array.from(teacherSubjectSets.get(t.id) || []),
    };
  });

  // 2. Indexation des affectations par classe
  const classAssignmentsMap = new Map<string, Map<string, { id: string; name: string }>>();
  const classGeneralTeacherMap = new Map<string, { id: string; name: string }>();

  for (const a of allAssignments) {
    const tName = `${a.teacher.firstName} ${a.teacher.lastName}`.trim();
    if (a.subjectId === null) {
      classGeneralTeacherMap.set(a.classId, { id: a.teacherId, name: tName });
    } else {
      if (!classAssignmentsMap.has(a.classId)) {
        classAssignmentsMap.set(a.classId, new Map());
      }
      classAssignmentsMap.get(a.classId)!.set(a.subjectId, { id: a.teacherId, name: tName });
    }
  }

  // 3. Construction des classes avec leurs matières et enseignants
  let totalUnassignedSubjects = 0;

  const classes: ClassItem[] = rawClasses.map((c) => {
    const subjectsMap = classAssignmentsMap.get(c.id);
    const generalTeacher = classGeneralTeacherMap.get(c.id);

    const subjects = c.subjects.map((cs) => {
      const assigned = subjectsMap?.get(cs.subjectId) || generalTeacher || null;
      if (!assigned) totalUnassignedSubjects++;
      return {
        subjectId: cs.subjectId,
        subjectName: cs.subject.name,
        coefficient: cs.coefficient || 1,
        assignedTeacherId: assigned?.id || null,
        assignedTeacherName: assigned?.name || null,
      };
    });

    return {
      id: c.id,
      name: c.name,
      cycle: c.cycle,
      teacherId: c.teacherId,
      teacher: c.teacher,
      _count: {
        enrollments: c.enrollments.length,
        grades: c._count.grades,
      },
      subjects,
    };
  });

  const unassignedClassesCount = classes.filter((c) => !c.teacherId).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        breadcrumb={[
          { label: "Scolarité", href: "/dashboard/students" },
          { label: "Classes & Niveaux" },
        ]}
        title="Classes et Niveaux"
        description={`${classes.length} classes configurées · ${unassignedClassesCount} sans titulaire · ${totalUnassignedSubjects} matières sans enseignant`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings/pedagogie/wizard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rule bg-surface hover:bg-sunk text-text px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Assistant d&apos;installation</span>
            </Link>
            <Link
              href="/dashboard/classes/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle classe</span>
            </Link>
          </div>
        }
      />

      <ClassListClient
        classes={classes}
        teachers={teacherItems}
        allSubjects={allSubjects}
        searchTerm={searchParam}
        initialFilter={filterParam}
        selectedCycleParam={cycleParam}
        activeYear={activeYear}
        totalUnassignedSubjects={totalUnassignedSubjects}
      />
    </div>
  );
}
