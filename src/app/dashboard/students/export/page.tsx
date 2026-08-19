import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { studentWhereFor } from "@/lib/studentScope";
import { currentAcademicYear } from "@/lib/studentFile";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportClient } from "./ExportClient";

/**
 * Préparation des exports de dossiers — lot 16.
 *
 * ⚠️ **Aucun droit nouveau.** L'écran vit sous `/dashboard/students` : qui peut
 * lire un dossier peut l'exporter, et la liste des élèves passe par
 * `studentWhereFor()`. Un enseignant n'y voit que ses classes ; `PARENT` et
 * `ACCOUNTANT`, qui n'ont pas ce chemin, n'atteignent jamais cette page.
 *
 * ⚠️ La liste est chargée **par classe**, jamais l'école entière : l'état de
 * préparation d'un dossier coûte plusieurs requêtes, et le calculer sur
 * quatre cents élèves d'un coup n'aurait servi à personne.
 */
export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  const role = user.role as RoleType;
  if (!hasAccess(role, "/dashboard/students")) redirect(firstAllowedPath(role));

  const sp = await searchParams;
  const classId = typeof sp.class === "string" ? sp.class : null;

  const ctx = { userId: user.id, schoolId, role };
  const scope = await studentWhereFor(ctx);
  const year = currentAcademicYear();

  // Classes réellement accessibles : celles où l'acteur voit au moins un élève.
  const classes = await prisma.class.findMany({
    where: { schoolId, enrollments: { some: { student: scope } } },
    select: { id: true, name: true, cycle: true, _count: { select: { enrollments: true } } },
    orderBy: { name: "asc" },
  });

  const students = classId
    ? await prisma.student.findMany({
        where: { AND: [scope, { schoolId, enrollments: { some: { classId } } }] },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      })
    : [];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Élèves", href: "/dashboard/students" },
          { label: "Exports" },
        ]}
        title="Préparation des dossiers"
        description="Vérifiez l'état des dossiers, produisez une archive, puis enregistrez la transmission une fois qu'elle a réellement eu lieu."
      />

      <ExportClient
        classes={classes.map((c) => ({ id: c.id, name: c.name, cycle: String(c.cycle), students: c._count.enrollments }))}
        selectedClassId={classId}
        students={students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }))}
        academicYear={year}
      />
    </div>
  );
}
