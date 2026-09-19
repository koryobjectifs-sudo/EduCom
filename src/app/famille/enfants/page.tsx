import Link from "next/link";
import { requireFamilyContext } from "@/lib/familyContext";
import { Users, FolderOpen, Award, ArrowRight, Calendar, Hash, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dateUtils";

export const metadata = {
  title: "Mes Enfants | Espace Famille EduCom",
};

export default async function FamilyEnfantsPage() {
  const { school, children } = await requireFamilyContext();

  return (
    <div className="space-y-6">
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Mes enfants scolarisés
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-text-soft">
          Consultez la fiche, le dossier administratif et les résultats scolaires de vos enfants à {school.name}.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-surface border border-dashed border-rule bg-surface p-8 text-center">
          <Users className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
          <h2 className="text-sm font-semibold text-text">Aucun enfant trouvé dans cet établissement</h2>
          <p className="text-xs text-text-soft mt-1">
            Si votre enfant est scolarisé dans une autre école EduCom, utilisez le sélecteur d'établissement en haut pour changer de contexte.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-surface border border-rule bg-surface p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-primary/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Classe : {child.className}
                  </span>
                  <StatusBadge domain="student" status={child.status} />
                </div>

                <h2 className="mt-3 text-lg font-bold text-text">
                  {child.firstName} {child.lastName}
                </h2>

                <div className="mt-3 space-y-1.5 text-xs text-text-soft bg-ground/50 p-3 rounded-md border border-rule/60">
                  {child.matricule && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Matricule :</span>
                      <span className="font-semibold text-text">{child.matricule}</span>
                    </div>
                  )}
                  {child.dateOfBirth && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Date de naissance :</span>
                      <span className="font-semibold text-text">{formatDate(child.dateOfBirth)}</span>
                    </div>
                  )}
                  {child.academicYear && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Année académique :</span>
                      <span className="font-semibold text-text">{child.academicYear}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-rule flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/famille/enfants/${child.id}`}
                  className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Dossier & Pièces</span>
                  <ArrowRight className="h-3 w-3 ml-0.5" />
                </Link>

                <Link
                  href={`/dashboard/grades/bulletin?studentId=${child.id}`}
                  className="inline-flex items-center gap-1 rounded-control border border-rule bg-surface px-3 py-2 text-xs font-medium text-text hover:bg-sunk transition-colors"
                >
                  <Award className="h-3.5 w-3.5 text-primary" />
                  <span>Bulletins</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
