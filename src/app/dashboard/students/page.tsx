import { PageHeader } from "@/components/ui/PageHeader";
import { Users, FileText, Upload, Package } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function StudentsHubPage() {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Élèves & dossiers" }]}
        title="Élèves & dossiers"
        description="Gérez l'annuaire de l'établissement, consultez les dossiers individuels et importez ou exportez les données de vos élèves."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/directory">
          <Card className="p-4 flex items-center text-left hover:border-primary transition-colors cursor-pointer gap-4 group h-full shadow-sm hover:shadow-md">
            <div className="h-10 w-10 shrink-0 rounded-control bg-sunk flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
              <Users className="h-5 w-5 text-text-soft group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text text-sm group-hover:text-primary transition-colors">Annuaire</h3>
              <p className="text-xs text-text-faint mt-0.5 truncate">Vue d'ensemble des élèves</p>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/students/dossiers">
          <Card className="p-4 flex items-center text-left hover:border-primary transition-colors cursor-pointer gap-4 group h-full shadow-sm hover:shadow-md">
            <div className="h-10 w-10 shrink-0 rounded-control bg-sunk flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
              <FileText className="h-5 w-5 text-text-soft group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text text-sm group-hover:text-primary transition-colors">Dossiers élèves</h3>
              <p className="text-xs text-text-faint mt-0.5 truncate">Gestion des dossiers individuels</p>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/students/import">
          <Card className="p-4 flex items-center text-left hover:border-primary transition-colors cursor-pointer gap-4 group h-full shadow-sm hover:shadow-md">
            <div className="h-10 w-10 shrink-0 rounded-control bg-sunk flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
              <Upload className="h-5 w-5 text-text-soft group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text text-sm group-hover:text-primary transition-colors">Importer</h3>
              <p className="text-xs text-text-faint mt-0.5 truncate">Importer en masse (Excel/CSV)</p>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/students/export">
          <Card className="p-4 flex items-center text-left hover:border-primary transition-colors cursor-pointer gap-4 group h-full shadow-sm hover:shadow-md">
            <div className="h-10 w-10 shrink-0 rounded-control bg-sunk flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
              <Package className="h-5 w-5 text-text-soft group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text text-sm group-hover:text-primary transition-colors">Exporter</h3>
              <p className="text-xs text-text-faint mt-0.5 truncate">Exporter la liste des élèves</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
