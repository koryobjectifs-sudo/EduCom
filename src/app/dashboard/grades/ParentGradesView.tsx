"use client";

import Link from "next/link";
import { GraduationCap, Users, FileText, ChevronRight, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export interface ParentChildGradeItem {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  academicYear?: string | null;
}

export default function ParentGradesView({
  children,
}: {
  children: ParentChildGradeItem[];
}) {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Notes & Bulletins scolaires
          </h1>
        </div>
        <p className="mt-1 text-sm text-text-soft">
          Consultez les résultats, évaluations et bulletins périodiques de vos enfants.
        </p>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun enfant rattaché"
          description="Votre compte parent n'est actuellement associé à aucun élève de l'établissement. Rapprochez-vous du secrétariat pour lier vos enfants."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => (
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
                      {child.academicYear}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-lg font-bold text-text">
                  {child.firstName} {child.lastName}
                </h2>
                <p className="mt-1 text-xs text-text-soft">
                  Élève inscrit en {child.className}
                </p>
              </div>

              <div className="pt-3 border-t border-rule flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/students/${child.id}?section=bulletin`}
                  className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Voir le bulletin</span>
                  <ArrowRight className="h-3 w-3 ml-0.5" />
                </Link>

                <Link
                  href={`/dashboard/students/${child.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-soft hover:text-primary transition-colors"
                >
                  <span>Fiche élève</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
