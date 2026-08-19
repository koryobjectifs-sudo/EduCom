import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { studentWhereFor } from "@/lib/studentScope";
import { PageHeader } from "@/components/ui/PageHeader";
import StudentListClient from "./StudentListClient";

export default async function StudentsPage() {
  // ⚠️ Cette requête tournait SANS filtre `schoolId` : l'annuaire listait les
  // élèves de tous les établissements de la base. Le lot 00 avait corrigé le
  // tableau de bord et les rapports, mais pas cet écran — le client Prisma
  // n'appliquant aucun filtre global, l'omission est silencieuse.
  const { user, schoolId } = await requireSchoolContext();

  // ⚠️ Lot 13.1 — `schoolId` seul ne suffit plus. Depuis le lot 13, chaque ligne
  // de cet annuaire mène à un dossier portant pièces d'identité et de santé :
  // un enseignant ne doit y voir que les élèves de ses classes, un parent que
  // ses enfants. La borne vit dans `studentWhereFor()`, au même endroit que
  // celle du dossier — deux copies auraient fini par diverger.
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

  const enrolled = students.filter((s) => s.status === "ENROLLED").length;
  const pending = students.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Élèves" }]}
        title="Élèves"
        description={
          // Comptages réels, tirés des données déjà chargées — aucune requête
          // supplémentaire, aucun chiffre inventé.
          `${students.length} élève${students.length > 1 ? "s" : ""} · ${enrolled} inscrit${enrolled > 1 ? "s" : ""}` +
          (pending > 0 ? ` · ${pending} en attente de validation` : "")
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

      <StudentListClient students={students} />
    </div>
  );
}
