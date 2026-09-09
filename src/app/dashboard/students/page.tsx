import { PageHeader } from "@/components/ui/PageHeader";
import StudentsUnifiedClient from "./StudentsUnifiedClient";
import { loadStudentsData, resumeStudents } from "./data";

export interface StudentsPageProps {
  searchParams: Promise<{
    annee?: string;
    view?: "list" | "classes";
    classId?: string;
  }>;
}

/**
 * Registre des élèves — Hub unifié (Liste globale et Par classe).
 *
 * ═══ FUSION ANNUAIRE / REGISTRE (Phase 2) ═══
 * - `/dashboard/directory` redirige en 308 vers `/dashboard/students`
 * - `/dashboard/students/dossiers` redirige en 308 vers `/dashboard/students?view=classes`
 * - L'état de vue (`view=list | classes`) et le drilldown (`classId`) vivent dans les `searchParams`.
 * - Portée par rôle appliquée strictement côté serveur via `loadStudentsData`.
 */
export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const sp = await searchParams;
  const d = await loadStudentsData(sp.annee);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Scolarité", href: "/dashboard/students" },
          { label: sp.view === "classes" ? "Dossiers de classe" : "Registre des élèves" },
        ]}
        title={sp.view === "classes" ? "Dossiers de classe" : "Registre des élèves"}
        description={resumeStudents(d)}
      />

      <StudentsUnifiedClient
        studentsData={d.studentsData}
        classesData={d.classes}
        teachersData={d.teachers}
        annees={d.annees}
        countsByYear={d.countsByYear}
        anneeActive={d.anneeActive}
        userRole={d.userRole}
        initialView={sp.view ?? "list"}
        initialClassId={sp.classId ?? null}
      />
    </div>
  );
}
