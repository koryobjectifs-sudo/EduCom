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

  const [rawClasses, teachers] = await Promise.all([
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
  ]);

  const classes: ClassItem[] = rawClasses.map((c) => ({
    id: c.id,
    name: c.name,
    cycle: c.cycle,
    teacherId: c.teacherId,
    teacher: c.teacher,
    _count: {
      enrollments: c.enrollments.length,
      grades: c._count.grades,
    },
  }));

  const unassignedCount = classes.filter((c) => !c.teacherId).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        breadcrumb={[
          { label: "Scolarité", href: "/dashboard/students" },
          { label: "Classes & Niveaux" },
        ]}
        title="Classes et Niveaux"
        description={`${classes.length} classe${classes.length > 1 ? "s" : ""} configurée${classes.length > 1 ? "s" : ""}${
          unassignedCount > 0 ? ` · ${unassignedCount} sans titulaire` : ""
        }`}
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
        teachers={teachers as unknown as TeacherItem[]}
        searchTerm={searchParam}
        initialFilter={filterParam}
        selectedCycleParam={cycleParam}
        activeYear={activeYear}
      />
    </div>
  );
}
