import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { currentAcademicYear } from "@/lib/studentFile";
import { teacherClassIds } from "@/lib/studentScope";
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

  const teacherClasses = role === "TEACHER"
    ? await teacherClassIds({ schoolId, userId: user.id, role })
    : null;

  const sp = await searchParams;
  const filterParam = sp?.filter === "unassigned" ? "unassigned" : "all";
  const cycleParam = sp?.cycle || null;
  const searchParam = sp?.q || "";
  const activeYear = currentAcademicYear(school);

  const [rawClasses, teachers, allAssignments, allSubjects] = await Promise.all([
    prisma.class.findMany({
      where: {
        schoolId,
        ...(teacherClasses ? { id: { in: teacherClasses } } : {}),
      },
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
      {/* ── EN-TÊTE UNIFIÉ SOFT COCKPIT ── */}
      <div className="rounded-[22px] bg-white p-4.5 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-200/70 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                  Classes et Niveaux
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {classes.length} classe{classes.length > 1 ? "s" : ""}
                </span>
                {unassignedClassesCount > 0 ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {unassignedClassesCount} sans titulaire
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Titulaires au complet
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5 max-w-2xl">
                Organisation pédagogique des cycles · Titulaires de classe et affectation des matières
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Link
              href="/dashboard/settings/pedagogie/wizard"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Assistant d&apos;installation</span>
            </Link>
            <Link
              href="/dashboard/classes/new"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Nouvelle classe</span>
            </Link>
          </div>
        </div>
      </div>

      <div data-tour="classes-list">
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
    </div>
  );
}
