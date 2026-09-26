"use client";

import Link from "next/link";
import {
  CreditCard,
  Receipt,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantSoftKpiStripProps {
  snapshot: AccountantDashboardSnapshot;
}

export default function AccountantSoftKpiStrip({ snapshot }: AccountantSoftKpiStripProps) {
  const { kpis } = snapshot;

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
    }
    return `${amount.toLocaleString("fr-FR")} F`;
  };

  const isOverdueClean = kpis.overdueAmount === 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARTE 1 : RECOUVREMENT DU MOIS ── */}
      <Link
        href="/dashboard/payments"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-emerald-300 hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Recouvrement du mois
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {formatMoney(kpis.monthCollected)}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">CFA</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100/60">
                <TrendingUp className="h-3 w-3" />
                {kpis.recoveryRate}% perçu
              </span>
            </div>
          </div>

          {/* Mini histogramme de recouvrement */}
          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-3.5 bg-slate-100 rounded-full" />
            <span className="w-2 h-5 bg-slate-200 rounded-full" />
            <span className="w-2 h-4 bg-slate-150 rounded-full" />
            <span className="w-2 h-6 bg-slate-200 rounded-full" />
            <span
              className="w-2 rounded-full shadow-[0_2px_6px_rgba(16,185,129,0.30)] bg-gradient-to-t from-emerald-600 to-teal-500"
              style={{ height: `${Math.max(12, Math.min(32, Math.round((kpis.recoveryRate / 100) * 32)))}px` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
          <span>Sur {formatMoney(kpis.monthExpected)} attendus</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 2 : ENCAISSEMENTS DU JOUR (CAISSE) ── */}
      <Link
        href="/dashboard/payments"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-indigo-300 hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Caisse du jour
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <Receipt className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {formatMoney(kpis.todayCollected)}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">CFA</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-100/60">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {kpis.todayTransactionsCount} versement{kpis.todayTransactionsCount > 1 ? "s" : ""}
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
          <span>En direct de la caisse</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 3 : ÉCHÉANCES ÉCHUES / IMPAYÉS ── */}
      <Link
        href="/dashboard/payments"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-amber-300 hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Retards & Impayés
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0 ${
              isOverdueClean
                ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
            }`}
          >
            {isOverdueClean ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {isOverdueClean ? "0 F" : formatMoney(kpis.overdueAmount)}
              {!isOverdueClean && (
                <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">échus</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                  isOverdueClean
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-amber-50 text-amber-700 border-amber-100/60"
                }`}
              >
                {isOverdueClean ? "À jour" : `${kpis.overdueFamiliesCount} famille(s) à relancer`}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-4 bg-slate-100 rounded-full" />
            <span className="w-2 h-5.5 bg-slate-200 rounded-full" />
            <span
              className={`w-2 h-8 rounded-full ${
                isOverdueClean
                  ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_2px_6px_rgba(16,185,129,0.30)]"
                  : "bg-gradient-to-t from-amber-500 to-orange-400 shadow-[0_2px_6px_rgba(245,158,11,0.30)]"
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-amber-700 transition-colors">
          <span>Relances prioritaires</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 4 : CANAL DOMINANT ── */}
      <Link
        href="/dashboard/payments"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-sky-300 hover:shadow-[0_8px_24px_-4px_rgba(14,165,233,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Canal dominant
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0">
            <Smartphone className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 truncate max-w-[170px]">
              {kpis.topPaymentChannel.name.split("/")[0].trim()}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-100/60">
                {kpis.topPaymentChannel.percentage}% des règlements
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-4 bg-slate-100 rounded-full" />
            <span className="w-2 h-6 bg-slate-200 rounded-full" />
            <span className="w-2 h-8 bg-gradient-to-t from-sky-600 to-indigo-600 rounded-full shadow-[0_2px_6px_rgba(14,165,233,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-sky-600 transition-colors">
          <span>{formatMoney(kpis.topPaymentChannel.amount)} encaissés</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>
    </div>
  );
}
