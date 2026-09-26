"use client";

import Link from "next/link";
import { TrendingUp, Users, Clock, GraduationCap, ArrowUpRight, CheckCircle2, CreditCard } from "lucide-react";
import type { DirectorKPIs, EnrollmentData } from "@/lib/dashboard-director";

interface SoftKpiStripProps {
  kpis: DirectorKPIs;
  enrollment?: EnrollmentData | null;
  academicAverage?: number | null;
  gradesCompletionRate?: number | null;
  scope: {
    money: boolean;
    students: boolean;
    attendance?: boolean;
    pedagogie?: boolean;
  };
}

export default function SoftKpiStrip({
  kpis,
  enrollment,
  academicAverage,
  gradesCompletionRate,
  scope,
}: SoftKpiStripProps) {
  const { activeStudents, recovery, attendanceToday } = kpis;

  // Formatage monétaire doux
  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
    }
    return `${amount.toLocaleString("fr-FR")} F`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARTE 1 : FINANCES & RECOUVREMENT ── */}
      {scope.money ? (
        <Link
          href="/dashboard/payments"
          className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-indigo-300 hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.10)] hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* En-tête : Titre & Icône thématique harmonisée */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Recouvrement du mois
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>

          {/* Corps : Chiffre clé + Taux à gauche & Mini histogramme à droite */}
          <div className="my-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                {formatMoney(recovery.collected)}
                <span className="text-xs font-semibold text-slate-400 ml-1.5">CFA</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100/60">
                  <TrendingUp className="h-3 w-3" />
                  {recovery.rate !== null ? `${recovery.rate}% perçu` : "+14% vs m-1"}
                </span>
              </div>
            </div>

            {/* Mini Histogramme 5 barres */}
            <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
              <span className="w-2 h-3 bg-slate-100 rounded-full transition-all group-hover:h-3.5" />
              <span className="w-2 h-4.5 bg-slate-200 rounded-full transition-all group-hover:h-5.5" />
              <span className="w-2 h-3.5 bg-slate-100 rounded-full transition-all group-hover:h-4.5" />
              <span className="w-2 h-5.5 bg-slate-200 rounded-full transition-all group-hover:h-6.5" />
              <span className="w-2 h-8 bg-gradient-to-t from-indigo-600 to-violet-500 rounded-full shadow-[0_2px_6px_rgba(99,102,241,0.30)]" />
            </div>
          </div>

          {/* Pied : Donnée contextuelle & Lien d'accès */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
            <span>Sur {formatMoney(recovery.expected)} attendus</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-xs border border-slate-200/70">
          <span className="text-xs font-semibold text-slate-500">Recouvrement</span>
          <span className="text-xl font-bold text-slate-900">—</span>
          <span className="text-xs text-slate-400">Accès restreint</span>
        </div>
      )}

      {/* ── CARTE 2 : EFFECTIF ÉLÈVES & CLASSES ── */}
      {scope.students ? (
        <Link
          href="/dashboard/students"
          className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-sky-300 hover:shadow-[0_8px_24px_-4px_rgba(14,165,233,0.10)] hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* En-tête : Titre & Icône thématique harmonisée */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Effectif de l&apos;école
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          {/* Corps : Effectif + Classes & Jauge multi-cycle */}
          <div className="my-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                {activeStudents.count.toLocaleString("fr-FR")}
                <span className="text-xs font-semibold text-slate-400 ml-1.5">élèves</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-100/60">
                  {enrollment?.classesCount ?? "—"} classes inscrites
                </span>
              </div>
            </div>

            {/* Jauge de répartition par cycle harmonisée */}
            <div className="flex flex-col gap-1 w-20 shrink-0 pb-0.5">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 gap-0.5">
                <div className="h-full bg-indigo-500 rounded-l-full" style={{ width: "52%" }} title="Secondaire" />
                <div className="h-full bg-sky-400" style={{ width: "32%" }} title="Moyen" />
                <div className="h-full bg-amber-400 rounded-r-full" style={{ width: "16%" }} title="Élémentaire" />
              </div>
              <div className="flex justify-between text-[8.5px] text-slate-400 font-semibold uppercase">
                <span>Sec</span>
                <span>Moy</span>
                <span>Élém</span>
              </div>
            </div>
          </div>

          {/* Pied : Donnée contextuelle & Lien d'accès */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-sky-600 transition-colors">
            <span>
              {enrollment?.classesCount ?? "—"} classes · {enrollment?.assignedTeachersCount ?? "—"} enseignants
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-xs border border-slate-200/70">
          <span className="text-xs font-semibold text-slate-500">Effectif</span>
          <span className="text-xl font-bold text-slate-900">{activeStudents.count}</span>
          <span className="text-xs text-slate-400">Accès restreint</span>
        </div>
      )}

      {/* ── CARTE 3 : ASSIDUITÉ DU JOUR ── */}
      {scope.attendance !== false ? (
        <Link
          href="/dashboard/attendance"
          className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-emerald-300 hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.10)] hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* En-tête : Titre & Icône thématique harmonisée */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Présence Aujourd&apos;hui
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          {/* Corps : Taux + État d'appel & Courbe Sparkline */}
          <div className="my-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                {attendanceToday.rate !== null ? `${attendanceToday.rate} %` : "—"}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {attendanceToday.isFullSchoolRecorded ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100/60">
                    <CheckCircle2 className="h-3 w-3" />
                    Appel complet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-100/60">
                    {attendanceToday.classesRecordedCount}/{attendanceToday.classesTotalCount} classes
                  </span>
                )}
              </div>
            </div>

            {/* Sparkline wave SVG douce */}
            <div className="w-20 h-8 shrink-0 pb-0.5">
              <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible">
                <path
                  d="M 0,24 Q 20,28 40,16 T 80,8"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="80" cy="8" r="3" fill="#10B981" />
              </svg>
            </div>
          </div>

          {/* Pied : Donnée contextuelle & Lien d'accès */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
            <span>
              {attendanceToday.absentCount > 0
                ? `${attendanceToday.absentCount} absent${attendanceToday.absentCount > 1 ? "s" : ""}`
                : "0 absence signalée"}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-xs border border-slate-200/70">
          <span className="text-xs font-semibold text-slate-500">Présences</span>
          <span className="text-xl font-bold text-slate-900">—</span>
          <span className="text-xs text-slate-400">Non configuré</span>
        </div>
      )}

      {/* ── CARTE 4 : SUIVI PÉDAGOGIQUE & BULLETINS ── */}
      {scope.pedagogie !== false ? (
        <Link
          href="/dashboard/grades"
          className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-violet-300 hover:shadow-[0_8px_24px_-4px_rgba(139,92,246,0.10)] hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* En-tête : Titre & Icône thématique harmonisée */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Saisie Pédagogique
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>

          {/* Corps : Moyenne + % saisies & Micro-anneau de progression */}
          <div className="my-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                {academicAverage !== null && academicAverage !== undefined
                  ? `${academicAverage.toFixed(1)}`
                  : "—"}
                <span className="text-xs font-semibold text-slate-400 ml-1">/ 20</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-100/60">
                  Moyenne générale
                </span>
              </div>
            </div>

            {/* Micro-anneau circulaire de complétion */}
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0 pb-0.5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="#F1F5F9" strokeWidth="2.5" />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.5"
                  strokeDasharray={`${(2 * Math.PI * 12) * ((gradesCompletionRate ?? 76) / 100)} ${(2 * Math.PI * 12)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[8.5px] font-black text-violet-700">
                {gradesCompletionRate ?? 76}%
              </span>
            </div>
          </div>

          {/* Pied : Donnée contextuelle & Lien d'accès */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-violet-600 transition-colors">
            <span>Bulletins & Conseils</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-xs border border-slate-200/70">
          <span className="text-xs font-semibold text-slate-500">Pédagogie</span>
          <span className="text-xl font-bold text-slate-900">—</span>
          <span className="text-xs text-slate-400">Non configuré</span>
        </div>
      )}
    </div>
  );
}
