import { prisma } from "@/lib/prisma";
import { studentWhereFor, teacherClassIds } from "@/lib/studentScope";
import { sortClasses } from "@/lib/classOrder";
import { requireSchoolContext } from "@/lib/documentContext";
import { currentAcademicYear } from "@/lib/studentFile";
import type { Prisma } from "../../../generated/prisma/client";

/**
 * Chargement unifié du registre des élèves et des dossiers de classes.
 *
 * ⚠️ Portée par rôle appliquée STRICTEMENT CÔTÉ SERVEUR :
 * - Direction / Secrétariat / Assistance : Toutes les classes et tous les élèves de l'école.
 * - Enseignant (TEACHER) : UNIQUEMENT ses classes assignées ou dont il est titulaire,
 *   et UNIQUEMENT les élèves inscrits dans ses classes.
 */
export async function loadStudentsData(academicYear?: string) {
  const { user, schoolId, school } = await requireSchoolContext();
  const scope = await studentWhereFor({ userId: user.id, schoolId, role: user.role });

  const anneeActuelle = currentAcademicYear(school);
  const annee = academicYear ?? anneeActuelle;

  // Filtrage strict des classes pour les enseignants
  const teacherClasses = user.role === "TEACHER"
    ? await teacherClassIds({ userId: user.id, schoolId, role: user.role })
    : null;

  const classWhere: Prisma.ClassWhereInput = {
    schoolId,
    ...(teacherClasses ? { id: { in: teacherClasses } } : {}),
  };

  const [studentsData, rawClasses, teachers, yearCounts] = await Promise.all([
    prisma.student.findMany({
      where: {
        AND: [
          scope,
          { schoolId },
          { enrollments: { some: { academicYear: annee } } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        status: true,
        parent: { select: { firstName: true, lastName: true, phone: true } },
        enrollments: {
          where: { academicYear: annee },
          select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.class.findMany({
      where: classWhere,
      select: {
        id: true,
        name: true,
        cycle: true,
        teacherId: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: "TEACHER",
        ...(user.role === "TEACHER" ? { id: user.id } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.enrollment.groupBy({
      by: ["academicYear"],
      where: {
        class: classWhere,
      },
      _count: { id: true },
    }),
  ]);

  const classes = sortClasses(rawClasses);

  const countsByYear: Record<string, number> = {};
  for (const yc of yearCounts) {
    if (yc.academicYear && yc._count) {
      countsByYear[yc.academicYear] = yc._count.id;
    }
  }

  const annees = Array.from(
    new Set([anneeActuelle, annee, ...yearCounts.map((e) => e.academicYear)])
  ).sort((a, b) => b.localeCompare(a));

  return {
    studentsData,
    classes,
    teachers,
    annees,
    countsByYear,
    anneeActive: annee,
    anneeActuelle,
    userRole: user.role,
    enrolled: studentsData.filter((s) => s.status === "ENROLLED").length,
    pending: studentsData.filter((s) => s.status === "PENDING").length,
  };
}

/** Sous-titre dynamique du registre des élèves */
export function resumeStudents(d: Awaited<ReturnType<typeof loadStudentsData>>): string {
  const n = d.studentsData.length;
  return (
    `${n} élève${n > 1 ? "s" : ""} · ${d.enrolled} inscrit${d.enrolled > 1 ? "s" : ""}` +
    (d.pending > 0 ? ` · ${d.pending} en attente de validation` : "") +
    ` · ${d.classes.length} classe${d.classes.length > 1 ? "s" : ""}`
  );
}
