import Link from "next/link";
import { GraduationCap, Users, FileText, ArrowRight, Award } from "lucide-react";
import { requireFamilyContext } from "@/lib/familyContext";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Notes & Bulletins | Espace Famille EduCom",
  description: "Consultez les résultats, évaluations et bulletins scolaires de vos enfants",
};

export default async function FamilyGradesPage() {
  const { school, children } = await requireFamilyContext();

  const childIds = children.map((c) => c.id);
  const gradesCountByChild = childIds.length > 0
    ? await prisma.grade.groupBy({
        by: ["studentId"],
        where: {
          studentId: { in: childIds },
        },
        _count: { _all: true },
      })
    : [];

  const countMap = new Map(gradesCountByChild.map((g) => [g.studentId, g._count._all]));

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Notes & Bulletins scolaires
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-text-soft">
          Consultez les résultats périodiques et les bulletins officiels délivrés par {school.name}.
        </p>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun enfant rattaché"
          description="Votre compte n'est associé à aucun élève de cet établissement. Rapprochez-vous du secrétariat pour lier vos enfants."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const gradesCount = countMap.get(child.id) ?? 0;

            return (
              <div
                key={child.id}
                className="rounded-surface border border-rule bg-surface p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-primary/40 hover:shadow-subtle"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {child.className}
                    </span>
                    {child.academicYear && (
                      <span className="text-[11px] font-medium text-text-soft">
                        Année {child.academicYear}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-text">
                    {child.firstName} {child.lastName}
                  </h2>
                  <p className="text-xs text-text-soft mt-0.5">
                    {gradesCount > 0
                      ? `${gradesCount} note${gradesCount > 1 ? "s" : ""} enregistrée${gradesCount > 1 ? "s" : ""}`
                      : "Aucune note saisie pour l'instant"}
                  </p>
                </div>

                <div className="pt-3 border-t border-rule flex items-center justify-between gap-2">
                  <Link
                    href={`/preview/report-card?studentId=${child.id}`}
                    className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>Voir le bulletin officiel</span>
                    <ArrowRight className="h-3 w-3 ml-0.5" />
                  </Link>

                  <Link
                    href={`/famille/enfants/${child.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-text-soft hover:text-primary transition-colors"
                  >
                    <span>Dossier élève</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
