import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { studentWhereFor } from "@/lib/studentScope";
import { PageHeader } from "@/components/ui/PageHeader";
import DossiersClient from "./DossiersClient";

export default async function DossiersPage() {
  const { user, schoolId } = await requireSchoolContext();
  const scope = await studentWhereFor({ userId: user.id, schoolId, role: user.role });

  const students = await prisma.student.findMany({
    where: { AND: [scope, { schoolId }] },
    include: {
      parent: true,
      enrollments: {
        include: {
          class: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' }
  });

  const enrolled = students.filter((s) => s.status === "ENROLLED").length;
  const pending = students.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Élèves & dossiers", href: "/dashboard/students" },
          { label: "Dossiers élèves" }
        ]}
        title="Dossiers élèves"
        description={
          `${students.length} dossier${students.length > 1 ? "s" : ""} · ${enrolled} inscrit${enrolled > 1 ? "s" : ""}` +
          (pending > 0 ? ` · ${pending} en attente` : "")
        }
        actions={
          <Link
            href="/dashboard/students/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nouvelle admission
          </Link>
        }
      />

      <DossiersClient studentsData={students} classesData={classes} />
    </div>
  );
}
