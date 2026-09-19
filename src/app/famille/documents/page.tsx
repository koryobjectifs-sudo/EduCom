import Link from "next/link";
import { requireFamilyContext } from "@/lib/familyContext";
import { listDocuments } from "@/lib/schoolDocuments";
import { FileText, FolderOpen, Award, CreditCard, ArrowRight, FileCheck, Calendar, Info } from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import DownloadDocButton from "./DownloadDocButton";

export const metadata = {
  title: "Documents | Espace Famille EduCom",
  description: "Dossiers documentaires de vos enfants et documents officiels de l'établissement",
};

export default async function FamilyDocumentsPage() {
  const { user, school, schoolId, children } = await requireFamilyContext();

  // Documents officiels de l'établissement destinés aux familles
  const schoolDocs = await listDocuments(
    { userId: user.id, schoolId, role: "PARENT" },
    {}
  );

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Documents scolaires & Pièces officielles
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-text-soft">
          Consultez les dossiers de vos enfants et les documents institutionnels publiés par {school.name}.
        </p>
      </div>

      {/* 1. Hub d'accès par enfant */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider text-text-muted">
          Dossiers documentaires par élève
        </h2>

        {children.length === 0 ? (
          <div className="rounded-surface border border-dashed border-rule bg-surface p-6 text-center text-xs text-text-soft">
            Aucun élève rattaché dans cet établissement.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-surface border border-rule bg-surface p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-text">
                      {child.firstName} {child.lastName}
                    </h3>
                    <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {child.className}
                    </span>
                  </div>
                  <p className="text-xs text-text-soft mt-1">
                    Pièces d'inscription, fiches de santé et documents d'état civil.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-rule/60">
                  <Link
                    href={`/famille/enfants/${child.id}`}
                    className="flex items-center justify-between rounded-control border border-rule bg-surface p-2.5 text-xs font-semibold text-text hover:bg-sunk hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span>Dossier administratif & Pièces fournies</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                  </Link>

                  <Link
                    href="/famille/notes"
                    className="flex items-center justify-between rounded-control border border-rule bg-surface p-2.5 text-xs font-semibold text-text hover:bg-sunk hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span>Bulletins de notes officiels</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                  </Link>

                  <Link
                    href="/famille/paiements"
                    className="flex items-center justify-between rounded-control border border-rule bg-surface p-2.5 text-xs font-semibold text-text hover:bg-sunk hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span>Reçus de paiement et attestations</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Documents officiels de l'établissement (affichés directement ici) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text uppercase tracking-wider text-text-muted">
            Documents officiels de l'établissement
          </h2>
          <p className="text-xs text-text-soft mt-0.5">
            Règlements intérieurs, calendriers des vacances scolaires et notes d'information publiées par la direction.
          </p>
        </div>

        {schoolDocs.length === 0 ? (
          <div className="rounded-surface border border-dashed border-rule bg-surface p-6 text-center text-xs text-text-soft">
            Aucun document institutionnel n'a été publié pour les familles pour le moment.
          </div>
        ) : (
          <div className="space-y-2.5">
            {schoolDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-surface border border-rule bg-surface p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                    <FileCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-text">{doc.title}</h3>
                      {doc.folder?.name && (
                        <span className="rounded-pill bg-sunk px-2 py-0.5 text-[10px] font-medium text-text-soft">
                          {doc.folder.name}
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-text-soft mt-0.5 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                      {doc.publishedAt && (
                        <span>Publié le {formatDateShort(doc.publishedAt)}</span>
                      )}
                      <span>·</span>
                      <span>{doc.fileName}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:self-center shrink-0">
                  <DownloadDocButton documentId={doc.id} fileName={doc.fileName} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
