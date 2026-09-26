"use client";

import Link from "next/link";
import {
  Users,
  FileClock,
  ClipboardCheck,
  Award,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { SecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";

interface SecretarySoftKpiStripProps {
  snapshot: SecretaryDashboardSnapshot;
}

export default function SecretarySoftKpiStrip({ snapshot }: SecretarySoftKpiStripProps) {
  const { kpis } = snapshot;

  const isDossiersClean = kpis.pendingAdmissions === 0;
  const isAttendanceComplete =
    kpis.classesTotalCount > 0 && kpis.classesRecordedCount >= kpis.classesTotalCount;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARTE 1 : EFFECTIF GLOBAL & INSCRIPTIONS ── */}
      <Link
        href="/dashboard/students"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-sky-300 hover:shadow-[0_8px_24px_-4px_rgba(14,165,233,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Effectif scolarisé
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {kpis.totalStudents.toLocaleString("fr-FR")}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">élèves</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-100/60">
                <TrendingUp className="h-3 w-3" />
                +{kpis.newStudents30d} sur 30j
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-3.5 bg-slate-100 rounded-full" />
            <span className="w-2 h-5 bg-slate-200 rounded-full" />
            <span className="w-2 h-4.5 bg-slate-150 rounded-full" />
            <span className="w-2 h-6 bg-slate-200 rounded-full" />
            <span className="w-2 h-8 bg-gradient-to-t from-sky-600 to-indigo-600 rounded-full shadow-[0_2px_6px_rgba(14,165,233,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-sky-600 transition-colors">
          <span>{kpis.classesTotalCount} classes actives</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 2 : DOSSIERS D'ADMISSION EN ATTENTE ── */}
      <Link
        href="/dashboard/students/dossiers/review"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-amber-300 hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Dossiers d&apos;admission
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0 ${
              isDossiersClean
                ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
            }`}
          >
            {isDossiersClean ? <CheckCircle2 className="h-4 w-4" /> : <FileClock className="h-4 w-4" />}
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {kpis.pendingAdmissions}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">
                {kpis.pendingAdmissions > 1 ? "dossiers" : "dossier"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                  isDossiersClean
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-amber-50 text-amber-700 border-amber-100/60"
                }`}
              >
                {isDossiersClean ? "Tous les dossiers vérifiés" : "À instruire"}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-4 bg-slate-100 rounded-full" />
            <span className="w-2 h-5.5 bg-slate-200 rounded-full" />
            <span
              className={`w-2 h-8 rounded-full ${
                isDossiersClean
                  ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_2px_6px_rgba(16,185,129,0.30)]"
                  : "bg-gradient-to-t from-amber-500 to-orange-400 shadow-[0_2px_6px_rgba(245,158,11,0.30)]"
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-amber-700 transition-colors">
          <span>Vérifier les pièces</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 3 : APPEL & PRÉSENCE DU JOUR ── */}
      <Link
        href="/dashboard/attendance"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-indigo-300 hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Appel du jour
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <ClipboardCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {kpis.classesRecordedCount} / {kpis.classesTotalCount}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">classes</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                  isAttendanceComplete
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100/60"
                }`}
              >
                {isAttendanceComplete ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Appel complet
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    {kpis.attendanceTodayRate !== null ? `${kpis.attendanceTodayRate}% présents` : "En cours de saisie"}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-4 bg-slate-100 rounded-full" />
            <span className="w-2 h-6 bg-slate-200 rounded-full" />
            <span className="w-2 h-8 bg-gradient-to-t from-indigo-600 to-violet-500 rounded-full shadow-[0_2px_6px_rgba(99,102,241,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
          <span>{kpis.absentCountToday} absence(s) signalée(s)</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 4 : BULLETINS & ÉVALUATIONS ── */}
      <Link
        href="/dashboard/grades/report-cards"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-emerald-300 hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Bulletins scolaires
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
            <Award className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {kpis.reportCardsSubmitted + kpis.reportCardsApproved}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">générés</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100/60">
                {kpis.reportCardsSubmitted > 0
                  ? `${kpis.reportCardsSubmitted} en attente visa`
                  : "À jour pour la période"}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-3 bg-slate-100 rounded-full" />
            <span className="w-2 h-5.5 bg-slate-200 rounded-full" />
            <span className="w-2 h-8 bg-gradient-to-t from-emerald-600 to-teal-500 rounded-full shadow-[0_2px_6px_rgba(16,185,129,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
          <span>Édition & impression</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>
    </div>
  );
}
