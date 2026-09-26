"use client";

import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantSoftFinancialDonutProps {
  snapshot: AccountantDashboardSnapshot;
}

export default function AccountantSoftFinancialDonut({ snapshot }: AccountantSoftFinancialDonutProps) {
  const { kpis, financialHealthScore } = snapshot;

  const recoveryScore = kpis.recoveryRate;
  const overdueScore = kpis.overdueAmount === 0 ? 100 : Math.max(30, 100 - Math.round((kpis.overdueAmount / (kpis.monthExpected || 1)) * 50));
  const rhythmScore = kpis.todayCollected > 0 ? 95 : 85;

  // Mathématiques de l'anneau circulaire SVG calibré avec espacements nets
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~376.99

  const visibleGap = 12;
  const capCompensation = strokeWidth; // 12px
  const gap = visibleGap + capCompensation; // 24px entre centres

  const totalGaps = 3 * gap; // 72px
  const availableLength = circumference - totalGaps; // ~305px

  // Répartition des 3 piliers financiers
  const seg1Length = availableLength * 0.48; // Recouvrement Mensuel (Indigo)
  const seg2Length = availableLength * 0.32; // Ponctualité Caisse (Emerald)
  const seg3Length = availableLength * 0.20; // Couverture des Échéances (Cyan)

  const initialOffset = gap / 2;
  const offset1 = -initialOffset;
  const offset2 = -(initialOffset + seg1Length + gap);
  const offset3 = -(initialOffset + seg1Length + gap + seg2Length + gap);

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between space-y-6">
      {/* ── EN-TÊTE DE LA JAUGE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Santé Financière</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Indice de performance de trésorerie
          </p>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
          Temps réel
        </span>
      </div>

      {/* ── L'ANNEAU DONUT CIRCULAIRE AVEC ESPACEMENTS NETS ── */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Piste de fond douce */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Arc 1 : Recouvrement (Indigo) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#6366F1"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg1Length} ${circumference}`}
              strokeDashoffset={offset1}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Arc 2 : Ponctualité de la Caisse (Emerald) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg2Length} ${circumference}`}
              strokeDashoffset={offset2}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Arc 3 : Couverture des Échéances (Cyan) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#0EA5E9"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg3Length} ${circumference}`}
              strokeDashoffset={offset3}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Valeur Centrale Épurée */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {financialHealthScore}%
            </span>
            <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              {financialHealthScore >= 80 ? "Optimale" : "Équilibrée"}
            </span>
          </div>
        </div>
      </div>

      {/* ── LÉGENDE DES 3 PILIERS FINANCIERS ── */}
      <div className="space-y-2.5 pt-1">
        {/* Pilier 1 : Recouvrement mensuel */}
        <Link
          href="/dashboard/payments"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                Recouvrement mensuel
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.recoveryRate}% des écolages perçus
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-900">{recoveryScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
        </Link>

        {/* Pilier 2 : Ponctualité de la Caisse */}
        <Link
          href="/dashboard/payments"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                Activité de la caisse
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.todayTransactionsCount > 0 ? `${kpis.todayTransactionsCount} versement(s) aujourd'hui` : "Caisse en attente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-900">{rhythmScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
        </Link>

        {/* Pilier 3 : Maîtrise des impayés */}
        <Link
          href="/dashboard/payments"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-sky-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                Maîtrise des impayés
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.overdueAmount === 0 ? "Aucun retard critique" : `${kpis.overdueFamiliesCount} famille(s) en souffrance`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-900">{overdueScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
