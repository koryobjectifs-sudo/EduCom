import { PageHeader } from "@/components/ui/PageHeader";
import DirectoryClient from "./DirectoryClient";
import { loadDirectory, resumeAnnuaire } from "./data";

/**
 * Annuaire.
 *
 * ⚠️ Les requêtes ont été déplacées dans `./data.ts`, sans être modifiées :
 * « Élèves & dossiers » ouvre désormais le même contenu, et deux copies
 * auraient fini par diverger.
 */
export default async function DirectoryPage() {
  const d = await loadDirectory();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Annuaire" }]}
        title="Annuaire"
        description={resumeAnnuaire(d)}
      />

      <DirectoryClient
        studentsData={d.studentsData}
        classesData={d.classes}
        teachersData={d.teachers}
      />
    </div>
  );
}
