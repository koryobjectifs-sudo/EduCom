"use client";

import Link from "next/link";
import { GraduationCap, Award, TrendingUp, TrendingDown, FileText, ArrowRight, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import type { AcademicData } from "@/lib/dashboard-director";

interface AcademicProgressSectionProps {
  academic?: AcademicData | null;
}

export default function AcademicProgressSection({ academic }: AcademicProgressSectionProps) {
  const activeTermName = academic?.activeTermName ?? null;
  const overallAverageOn20 = academic?.overallAverageOn20 ?? null;
  const deltaVsPreviousTerm = academic?.deltaVsPreviousTerm ?? null;
  const studentsBelowAverageCount = academic?.studentsBelowAverageCount ?? 0;
  const totalEvaluatedStudents = academic?.totalEvaluatedStudents ?? 0;
  const gradesEntryCompletionRate = academic?.gradesEntryCompletionRate ?? 0;
  const reportCardsStatus = academic?.reportCardsStatus ?? { draft: 0, submitted: 0, approved: 0 };
  const classesProgress = academic?.classesProgress ?? [];

  return (
    <section className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-4">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-purple-50 text-purple-700">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
              Suivi Pédagogique & Évaluations
            </h2>
            <p className="text-role-meta text-text-soft">
              Avancement de la saisie des notes, moyennes de l&apos;établissement et validation des bulletins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/grades"
            className="inline-flex h-7.5 items-center gap-1 rounded-control bg-sunk hover:bg-slate-200 px-2.5 text-xs font-semibold text-text transition-colors"
          >
            <span>Saisie des notes</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/documents/validation"
            className="inline-flex h-7.5 items-center gap-1 rounded-control bg-primary hover:bg-primary-hover px-2.5 text-xs font-semibold text-white transition-colors shadow-2xs"
          >
            <span>Validation des bulletins</span>
          </Link>
        </div>
      </div>

      {/* Grille : Moyenne Établissement + Statut Bulletins */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Moyenne Générale */}
        <div className="rounded-control bg-purple-50/40 p-3 border border-purple-200/60 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-purple-900">
            Moyenne Générale
          </span>

          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-purple-950">
                {overallAverageOn20 !== null ? overallAverageOn20 : "—"}
              </span>
              <span className="text-role-meta font-medium text-purple-700">/ 20</span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-role-meta">
              {deltaVsPreviousTerm !== null ? (
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    deltaVsPreviousTerm >= 0 ? "text-emerald-700" : "text-danger"
                  }`}
                >
                  {deltaVsPreviousTerm >= 0 ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5" />
                  )}
                  {deltaVsPreviousTerm >= 0 ? `+${deltaVsPreviousTerm}` : deltaVsPreviousTerm} pt vs T-1
                </span>
              ) : (
                <span className="text-purple-600">{activeTermName || "Période active"}</span>
              )}
            </div>
          </div>

          <p className="text-[10.5px] text-purple-800">
            Calculée sur {totalEvaluatedStudents} élève{totalEvaluatedStudents > 1 ? "s" : ""}
          </p>
        </div>

        {/* Élèves sous la moyenne */}
        <div className="rounded-control bg-sunk/60 p-3 border border-rule flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
            Sous la moyenne (&lt; 10/20)
          </span>

          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl sm:text-2xl font-extrabold ${
                  totalEvaluatedStudents === 0
                    ? "text-text-faint"
                    : studentsBelowAverageCount > 0
                    ? "text-danger"
                    : "text-emerald-600"
                }`}
              >
                {totalEvaluatedStudents > 0 ? studentsBelowAverageCount : "—"}
              </span>
              <span className="text-role-meta font-medium text-text-soft">
                {totalEvaluatedStudents > 0 ? "élèves" : "En attente"}
              </span>
            </div>

            <p className="mt-1 text-role-meta text-text-soft">
              {totalEvaluatedStudents > 0
                ? `Sur ${totalEvaluatedStudents} élèves évalués`
                : "Aucune note saisie"}
            </p>
          </div>

          <Link
            href="/dashboard/grades/difficultes"
            className="text-role-meta font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Élèves en difficulté</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Avancement Saisie des Notes */}
        <div className="rounded-control bg-sunk/60 p-3 border border-rule flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
            Avancement Saisie Notes
          </span>

          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-text">
                {gradesEntryCompletionRate} %
              </span>
              <span className="text-role-meta font-medium text-text-soft">des classes</span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-purple-600 transition-all"
                style={{ width: `${gradesEntryCompletionRate}%` }}
              />
            </div>
          </div>

          <p className="text-[10.5px] text-text-soft">
            Trimestre : <strong className="text-text">{activeTermName || "En cours"}</strong>
          </p>
        </div>

        {/* Bulletins de notes */}
        <div className="rounded-control bg-sunk/60 p-3 border border-rule flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
            Circuit des Bulletins
          </span>

          <div className="my-1.5 space-y-0.5 text-role-meta">
            <div className="flex items-center justify-between">
              <span className="text-text-soft">Brouillons</span>
              <strong className="text-text">{reportCardsStatus.draft}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-700 font-semibold">À valider</span>
              <strong className="text-amber-700 font-bold">{reportCardsStatus.submitted}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-semibold">Approuvés</span>
              <strong className="text-emerald-700 font-bold">{reportCardsStatus.approved}</strong>
            </div>
          </div>

          <Link
            href="/dashboard/documents/validation"
            className="text-role-meta font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Espace relecture</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Avancement par classe */}
      <div className="space-y-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-text-soft">
          Avancement des saisies par classe
        </h3>

        {classesProgress.length === 0 ? (
          <p className="text-role-meta text-text-faint py-3 text-center">Aucune classe déclarée</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {classesProgress.slice(0, 6).map((c) => (
              <div
                key={c.classId}
                className="flex items-center justify-between p-2.5 rounded-control bg-surface border border-rule shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-text">{c.className}</span>
                    <span className="rounded bg-sunk px-1.5 py-0.2 text-[9.5px] font-medium text-text-soft border border-rule">
                      {c.cycle}
                    </span>
                  </div>
                  <p className="text-role-meta text-text-soft mt-0.5">
                    {c.gradesCount} note{c.gradesCount > 1 ? "s" : ""} saisie{c.gradesCount > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-text">
                    {c.averageOn20 !== null ? `${c.averageOn20} / 20` : "Pas de note"}
                  </span>
                  {c.isComplete ? (
                    <p className="text-[9.5px] font-bold text-emerald-700 mt-0.5">Avancée</p>
                  ) : (
                    <p className="text-[9.5px] text-text-faint mt-0.5">En cours</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
