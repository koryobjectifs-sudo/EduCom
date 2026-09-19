"use client";

import Link from "next/link";
import { Users, FileText, ArrowRight, FolderOpen, Calendar, GraduationCap } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dateUtils";

export interface ParentChildItem {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | Date | null;
  matricule?: string | null;
  status: string;
  className: string;
  academicYear?: string | null;
}

export default function ParentChildrenView({
  children,
}: {
  children: ParentChildItem[];
}) {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Mes enfants scolarisés
          </h1>
        </div>
        <p className="mt-1 text-sm text-text-soft">
          Consultez la fiche, le dossier administratif et le suivi scolaire de vos enfants.
        </p>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun enfant rattaché"
          description="Votre compte tuteur n'est rattaché à aucun élève de l'établissement pour le moment. Veuillez vous rapprocher de l'administration scolaire pour effectuer le rattachement."
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
                  <StatusBadge domain="student" status={child.status} />
                </div>

                <h2 className="mt-3 text-lg font-bold text-text">
                  {child.firstName} {child.lastName}
                </h2>

                <div className="mt-2 space-y-1 text-xs text-text-soft">
                  {child.matricule && (
                    <p>Matricule : <span className="font-semibold text-text">{child.matricule}</span></p>
                  )}
                  {child.dateOfBirth && (
                    <p>Né(e) le : <span className="font-semibold text-text">{formatDate(child.dateOfBirth)}</span></p>
                  )}
                  {child.academicYear && (
                    <p>Année : <span className="font-semibold text-text">{child.academicYear}</span></p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-rule flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/dashboard/students/${child.id}`}
                  className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Fiche 360°</span>
                  <ArrowRight className="h-3 w-3 ml-0.5" />
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/students/${child.id}/dossier`}
                    className="inline-flex items-center gap-1 rounded-control border border-rule bg-surface px-2.5 py-1.5 text-xs font-medium text-text-soft hover:bg-sunk hover:text-text transition-colors"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>Dossier</span>
                  </Link>
                  <Link
                    href={`/dashboard/students/${child.id}?section=bulletin`}
                    className="inline-flex items-center gap-1 rounded-control border border-rule bg-surface px-2.5 py-1.5 text-xs font-medium text-text-soft hover:bg-sunk hover:text-text transition-colors"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Notes</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
