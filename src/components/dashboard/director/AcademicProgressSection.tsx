"use client";

import Link from "next/link";
import { GraduationCap, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import type { AcademicData } from "@/lib/dashboard-director";

interface AcademicProgressSectionProps {
  academic?: AcademicData | null;
  className?: string;
}

/**
 * Suivi Pédagogique & Évaluations — Refonte « Soft Elegance »
 * Tableau de bord pédagogique aligné sur la charte visuelle moderne :
 * coins adoucis, palettes pastels apaisantes, boutons arrondis et zéro bruit.
 */
export default function AcademicProgressSection({
  academic,
  className = "",
}: AcademicProgressSectionProps) {
  const activeTermName = academic?.activeTermName ?? null;
  const overallAverageOn20 = academic?.overallAverageOn20 ?? null;
  const deltaVsPreviousTerm = academic?.deltaVsPreviousTerm ?? null;
  const studentsBelowAverageCount = academic?.studentsBelowAverageCount ?? 0;
  const totalEvaluatedStudents = academic?.totalEvaluatedStudents ?? 0;
  const gradesEntryCompletionRate = academic?.gradesEntryCompletionRate ?? 0;
  const reportCardsStatus = academic?.reportCardsStatus ?? { draft: 0, submitted: 0, approved: 0 };
  const classesProgress = academic?.classesProgress ?? [];

  return (
    <section className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between space-y-6 ${className}`}>
      {/* ── EN-TÊTE DE SECTION SOFT ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 shadow-xs shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Suivi Pédagogique & Évaluations</span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Avancement de la saisie des notes, moyennes de l&apos;établissement et validation des bulletins
            </p>
          </div>
        </div>

        {/* Boutons d'action arrondis et profilés */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/grades"
            className="inline-flex h-8.5 items-center gap-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 text-xs font-semibold text-slate-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <span>Saisie des notes</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </Link>
          <Link
            href="/dashboard/grades/validation"
            className="inline-flex h-8.5 items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-semibold text-white shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <span>Validation des bulletins</span>
          </Link>
        </div>
      </div>

      {/* ── 4 CARTES KPI PÉDAGOGIQUES RECTANGULAIRES & HARMONISÉES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Moyenne Générale */}
        <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-4.5 flex flex-col justify-between hover:bg-slate-50 hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Moyenne générale
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60 shrink-0">
              {activeTermName ? (activeTermName.toLowerCase().includes("semestre") ? "S1" : "T1") : "T1"}
            </span>
          </div>

          <div className="my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                {overallAverageOn20 !== null ? overallAverageOn20 : "—"}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 20</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {deltaVsPreviousTerm !== null ? (
                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                    deltaVsPreviousTerm >= 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100/60"
                      : "bg-rose-50 text-rose-700 border border-rose-100/60"
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
                <span className="text-xs text-slate-400 font-medium">Calculée sur {totalEvaluatedStudents} élève{totalEvaluatedStudents > 1 ? "s" : ""}</span>
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <Link
              href="/dashboard/grades"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between w-full transition-colors group/link"
            >
              <span className="whitespace-nowrap">Voir les moyennes</span>
              <ArrowRight className="h-3 w-3 shrink-0 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 2. Élèves sous la moyenne */}
        <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-4.5 flex flex-col justify-between hover:bg-slate-50 hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Sous la moyenne
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
              &lt; 10
            </span>
          </div>

          <div className="my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-[26px] font-black tracking-tight ${
                  studentsBelowAverageCount > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {totalEvaluatedStudents > 0 ? studentsBelowAverageCount : "0"}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                élève{studentsBelowAverageCount > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {totalEvaluatedStudents > 0
                ? `Sur ${totalEvaluatedStudents} élèves évalués`
                : "En attente de notes"}
            </p>
          </div>

          <div className="pt-2 mt-auto">
            <Link
              href="/dashboard/grades/difficultes"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between w-full transition-colors group/link"
            >
              <span className="whitespace-nowrap">Élèves en difficulté</span>
              <ArrowRight className="h-3 w-3 shrink-0 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 3. Avancement Saisie Notes */}
        <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-4.5 flex flex-col justify-between hover:bg-slate-50 hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Saisie des notes
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60 shrink-0">
              {gradesEntryCompletionRate}%
            </span>
          </div>

          <div className="my-0.5 space-y-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                {gradesEntryCompletionRate} %
              </span>
              <span className="text-xs font-semibold text-slate-400">des classes</span>
            </div>

            {/* Jauge progressive dégradée fine */}
            <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${gradesEntryCompletionRate}%` }}
              />
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <Link
              href="/dashboard/grades"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between w-full transition-colors group/link"
            >
              <span className="whitespace-nowrap">Saisir des notes</span>
              <ArrowRight className="h-3 w-3 shrink-0 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 4. Circuit des Bulletins */}
        <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-4.5 flex flex-col justify-between hover:bg-slate-50 hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Bulletins
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
              {reportCardsStatus.draft + reportCardsStatus.submitted + reportCardsStatus.approved} total
            </span>
          </div>

          {/* Lignes de statut aérées et lisibles sans chevauchement */}
          <div className="my-0.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                Brouillons
              </span>
              <span className="font-bold text-slate-700">{reportCardsStatus.draft}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200/50">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                À valider
              </span>
              <span className="font-bold text-amber-900">{reportCardsStatus.submitted}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Approuvés
              </span>
              <span className="font-bold text-emerald-900">{reportCardsStatus.approved}</span>
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <Link
              href="/dashboard/grades/validation"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between w-full transition-colors group/link"
            >
              <span className="whitespace-nowrap">Espace relecture</span>
              <ArrowRight className="h-3 w-3 shrink-0 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── AVANCEMENT DES SAISIES PAR CLASSE ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Avancement des saisies par classe
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
            {classesProgress.length} classe{classesProgress.length > 1 ? "s" : ""}
          </span>
        </div>

        {classesProgress.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Aucune classe déclarée pour cette période.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {classesProgress.slice(0, 6).map((c) => (
              <div
                key={c.classId}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70 hover:border-indigo-200 hover:shadow-xs transition-all"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">{c.className}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9.5px] font-semibold text-slate-500 border border-slate-200/60 shrink-0">
                      {c.cycle}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    {c.gradesCount} note{c.gradesCount > 1 ? "s" : ""} saisie{c.gradesCount > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 block">
                    {c.averageOn20 !== null ? `${c.averageOn20} / 20` : "Pas de note"}
                  </span>
                  {c.isComplete ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60 mt-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>Avancée</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-slate-100 text-slate-500 mt-1">
                      <span>En cours</span>
                    </span>
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
