"use client";

import Link from "next/link";
import {
  Users,
  GraduationCap,
  CreditCard,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Award,
  CheckCircle2,
} from "lucide-react";
import type { FamilyDashboardSnapshot } from "@/lib/dashboard-family";

interface FamilySoftKpiStripProps {
  snapshot: FamilyDashboardSnapshot;
}

export default function FamilySoftKpiStrip({ snapshot }: FamilySoftKpiStripProps) {
  const {
    children,
    childrenCount,
    overallAverage,
    totalGrades,
    financialSummary,
    overallAttendanceRate,
  } = snapshot;

  const totalAbsences = children.reduce((sum, c) => sum + c.absencesCount, 0);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
    }
    return `${amount.toLocaleString("fr-FR")} F`;
  };

  const isFinanceClean = financialSummary.totalRemaining === 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARTE 1 : ENFANTS SCOLARISÉS ── */}
      <Link
        href="/famille/enfants"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-violet-300 hover:shadow-[0_8px_24px_-4px_rgba(139,92,246,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Enfants scolarisés
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {childrenCount}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">
                enfant{childrenCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-100/60 truncate max-w-[150px]">
                {children.map((c) => c.className).join(", ") || "Inscriptions"}
              </span>
            </div>
          </div>

          {/* Mini barres représentatives */}
          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            {children.slice(0, 4).map((c, i) => (
              <span
                key={c.id}
                className="w-2 rounded-full bg-gradient-to-t from-violet-600 to-indigo-500 shadow-2xs transition-all"
                style={{ height: `${Math.max(12, Math.min(30, (i + 1) * 8))}` }}
                title={`${c.firstName} (${c.className})`}
              />
            ))}
            {children.length < 3 && (
              <>
                <span className="w-2 h-4 bg-slate-200 rounded-full" />
                <span className="w-2 h-6 bg-slate-100 rounded-full" />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-violet-600 transition-colors">
          <span>{children.map((c) => c.firstName).join(" & ") || "Dossiers élèves"}</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 2 : MOYENNE ACADÉMIQUE ── */}
      <Link
        href="/famille/notes"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-indigo-300 hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Moyenne générale
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <Award className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {overallAverage !== null ? overallAverage.toFixed(1) : "—"}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">/ 20</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                  overallAverage !== null && overallAverage >= 12
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100/60"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                {overallAverage !== null && overallAverage >= 14
                  ? "Mention Bien"
                  : overallAverage !== null && overallAverage >= 10
                  ? "Résultats positifs"
                  : "En cours"}
              </span>
            </div>
          </div>

          {/* Mini histogramme 5 barres */}
          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-3.5 bg-slate-100 rounded-full" />
            <span className="w-2 h-4.5 bg-slate-200 rounded-full" />
            <span className="w-2 h-4 bg-slate-150 rounded-full" />
            <span className="w-2 h-6 bg-slate-200 rounded-full" />
            <span className="w-2 h-8 bg-gradient-to-t from-indigo-600 to-violet-500 rounded-full shadow-[0_2px_6px_rgba(99,102,241,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
          <span>{totalGrades} note{totalGrades > 1 ? "s" : ""} au dossier</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 3 : SCOLARITÉ & FINANCES ── */}
      <Link
        href="/famille/paiements"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-emerald-300 hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Situation Écolage
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0 ${
              isFinanceClean
                ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                : "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {isFinanceClean ? "À jour" : formatMoney(financialSummary.totalRemaining)}
              {!isFinanceClean && (
                <span className="text-xs font-semibold text-slate-400 ml-1 font-sans">restants</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                  isFinanceClean
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-sky-50 text-sky-700 border-sky-100/60"
                }`}
              >
                {isFinanceClean ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>100% réglé</span>
                  </>
                ) : (
                  <span>{financialSummary.paymentRate}% perçu</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-4 bg-slate-100 rounded-full" />
            <span className="w-2 h-5.5 bg-slate-200 rounded-full" />
            <span
              className={`w-2 h-8 rounded-full ${
                isFinanceClean
                  ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_2px_6px_rgba(16,185,129,0.30)]"
                  : "bg-gradient-to-t from-sky-500 to-indigo-600 shadow-[0_2px_6px_rgba(14,165,233,0.30)]"
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
          <span>{formatMoney(financialSummary.totalPaid)} réglés au total</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 4 : ASSIDUITÉ & PRÉSENCES ── */}
      <Link
        href="/famille/enfants"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-teal-300 hover:shadow-[0_8px_24px_-4px_rgba(20,184,166,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Assiduité & Ponctualité
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {overallAttendanceRate}%
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">présence</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-100/60">
                {totalAbsences === 0 ? "0 absence" : `${totalAbsences} absence(s)`}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-5 bg-slate-100 rounded-full" />
            <span className="w-2 h-6 bg-slate-200 rounded-full" />
            <span className="w-2 h-8 bg-gradient-to-t from-teal-500 to-emerald-400 rounded-full shadow-[0_2px_6px_rgba(20,184,166,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-teal-600 transition-colors">
          <span>Présence régulière en classe</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>
    </div>
  );
}
