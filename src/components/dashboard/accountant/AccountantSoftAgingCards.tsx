"use client";

import Link from "next/link";
import {
  Clock,
  Smartphone,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantSoftAgingCardsProps {
  snapshot: AccountantDashboardSnapshot;
  className?: string;
}

export default function AccountantSoftAgingCards({
  snapshot,
  className = "",
}: AccountantSoftAgingCardsProps) {
  const { agingBuckets, channelBreakdown, kpis } = snapshot;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div
      className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-6 ${className}`}
    >
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span>Analyse des Échéances & Canaux</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ancienneté des créances et répartition des encaissements
          </p>
        </div>

        <Link
          href="/dashboard/payments"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
        >
          <span>Détail complet</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── BLOC GAUCHE : ANCIENNETÉ DES IMPAYÉS (AGING BUCKETS) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Ancienneté des créances</span>
            </h3>
            <span className="text-xs font-bold text-slate-900">
              {fmt(kpis.overdueAmount)} F total
            </span>
          </div>

          <div className="space-y-3">
            {agingBuckets.map((bucket) => {
              const isCritical = bucket.label.includes("> 30");
              const isModerate = bucket.label.includes("15 – 30");

              return (
                <div
                  key={bucket.label}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2 hover:bg-white hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isCritical
                            ? "bg-rose-500"
                            : isModerate
                            ? "bg-amber-500"
                            : "bg-sky-500"
                        }`}
                      />
                      {bucket.label}
                    </span>
                    <span className="font-bold text-slate-900">
                      {fmt(bucket.amount)} F ({bucket.count} dossier{bucket.count > 1 ? "s" : ""})
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCritical
                          ? "bg-rose-500"
                          : isModerate
                          ? "bg-amber-500"
                          : "bg-sky-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, bucket.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BLOC DROIT : VENTILATION DES MOYENS DE PAIEMENT ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Canaux de règlement</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700">
              {fmt(kpis.monthCollected)} F encaissés
            </span>
          </div>

          <div className="space-y-3">
            {channelBreakdown.slice(0, 3).map((chan) => {
              return (
                <div
                  key={chan.method}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2 hover:bg-white hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {chan.label}
                    </span>
                    <span className="font-bold text-slate-900">
                      {fmt(chan.amount)} F ({chan.percentage}%)
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(4, chan.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
