import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFamilyContext } from "@/lib/familyContext";
import { studentFile } from "@/lib/studentFile";
import { 
  Users, 
  ArrowLeft, 
  FolderOpen, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UploadCloud, 
  PenTool, 
  FileText,
  ExternalLink
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dateUtils";

export default async function FamilyChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, schoolId, school } = await requireFamilyContext();

  const ctx = { userId: user.id, schoolId, role: user.role };
  const file = await studentFile(ctx, id);

  if (!file) {
    notFound();
  }

  const { student, lines, completeness } = file;

  return (
    <div className="space-y-6">
      {/* 1. Fil d'Ariane & Retour */}
      <div className="flex items-center gap-2 text-xs text-text-soft">
        <Link href="/famille/enfants" className="hover:text-primary transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Mes enfants</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-text">{student.firstName} {student.lastName}</span>
      </div>

      {/* 2. Fiche En-tête de l'Élève */}
      <div className="rounded-surface border border-rule bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {student.enrollments[0]?.class?.name || "Non assigné"}
              </span>
              <StatusBadge domain="student" status={student.status} />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-text mt-2">
              {student.firstName} {student.lastName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-text-soft">
              {student.dateOfBirth && (
                <span>Né(e) le : <strong className="text-text font-medium">{formatDate(student.dateOfBirth)}</strong></span>
              )}
              <span>Établissement : <strong className="text-text font-medium">{school.name}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/preview/report-card?studentId=${student.id}`}
              className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-3 py-2 text-xs font-semibold text-text hover:bg-sunk transition-colors"
            >
              <Award className="h-4 w-4 text-primary" />
              <span>Voir les bulletins</span>
            </Link>
          </div>
        </div>

        {/* Barre de complétude du dossier */}
        {completeness.configured && (
          <div className="mt-5 pt-4 border-t border-rule/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text">Complétude du dossier administratif</span>
              <span className="font-bold text-primary">{completeness.percent ?? 0} % ({completeness.validated} / {completeness.required} requises)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-sunk overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completeness.percent ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Pièces administratives & Actions directes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-base font-bold text-text">Dossier et pièces justificatives</h2>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-surface border border-dashed border-rule bg-surface p-6 text-center text-xs text-text-soft">
            Aucune pièce exigée pour cette classe.
          </div>
        ) : (
          <div className="space-y-2.5">
            {lines.map((line) => {
              const isMissing = line.status === "MISSING";
              const isRejected = line.status === "REJECTED";
              const isToVerify = line.status === "TO_VERIFY";
              const isValidated = line.status === "VALIDATED";
              const isSignature = line.nature === "SIGNATURE";


              return (
                <div
                  key={line.requirementId}
                  className={`rounded-surface border p-3.5 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isRejected
                      ? "border-danger/40 bg-danger/5"
                      : isMissing && line.required
                      ? "border-amber-500/30 bg-amber-50/40"
                      : "border-rule bg-surface"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text text-sm sm:text-xs">
                        {line.label}
                      </span>
                      {line.required && (
                        <span className="text-[10px] font-semibold text-danger bg-danger/10 px-1.5 py-0.2 rounded">
                          Obligatoire
                        </span>
                      )}
                    </div>

                    {/* Statut clair orienté utilisateur */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {isValidated && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Conforme et validé
                        </span>
                      )}
                      {isToVerify && (
                        <span className="inline-flex items-center gap-1 text-sky-700 font-medium">
                          <Clock className="h-3.5 w-3.5" /> Déposé — en attente de vérification
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-danger font-semibold">
                          <AlertCircle className="h-3.5 w-3.5" /> À corriger : {line.document?.reviewNote || "Pièce non conforme"}
                        </span>
                      )}
                      {isMissing && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <AlertCircle className="h-3.5 w-3.5" /> {line.actionPrompt || "À fournir"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions directes (Win-Mapping) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {(isMissing || isRejected) && (
                      <Link
                        href={`/famille/actions?studentId=${student.id}&reqId=${line.requirementId}`}
                        className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors shadow-2xs"
                      >
                        {isSignature ? (
                          <>
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Signer</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-3.5 w-3.5" />
                            <span>{isRejected ? "Remplacer la pièce" : "Déposer la pièce"}</span>
                          </>
                        )}
                      </Link>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
