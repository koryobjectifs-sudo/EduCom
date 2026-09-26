"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Receipt,
  Layers,
  Clock,
  ArrowRight,
  CreditCard,
  Building,
} from "lucide-react";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantSoftFinanceChartProps {
  snapshot: AccountantDashboardSnapshot;
}

export default function AccountantSoftFinanceChart({
  snapshot,
}: AccountantSoftFinanceChartProps) {
  const [activeTab, setActiveTab] = useState<"flux" | "cycles" | "journal">("flux");

  const {
    kpis,
    weeklyRevenueHistory,
    cycleCollections,
    recentTransactions,
    academicYear,
  } = snapshot;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  // Calcul du tracé de la courbe spline SVG dynamique
  // Échelle 600 x 140
  const w1 = weeklyRevenueHistory[0] ?? 0;
  const w2 = weeklyRevenueHistory[1] ?? 0;
  const w3 = weeklyRevenueHistory[2] ?? 0;
  const w4 = weeklyRevenueHistory[3] ?? 0;

  const maxVal = Math.max(1, w1, w2, w3, w4, kpis.monthExpected);
  const getY = (val: number) => Math.round(115 - (val / maxVal) * 90);

  const y1 = getY(w1);
  const y2 = getY(w2);
  const y3 = getY(w3);
  const y4 = getY(w4);

  const curvePath = `M 30,${y1} C 120,${y1} 160,${y2} 240,${y2} C 320,${y2} 380,${y3} 450,${y3} C 510,${y3} 540,${y4} 570,${y4}`;
  const areaPath = `${curvePath} L 570,135 L 30,135 Z`;

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-6">
      {/* ── EN-TÊTE : Titre & Sélecteur d'onglets ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Flux Financiers & Recouvrement
            </h2>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des recettes, des encaissements et des échéances
          </p>
        </div>

        {/* Pilules de bascule */}
        <div className="inline-flex rounded-full bg-slate-100/90 p-1 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("flux")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "flux"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span>Encaissements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cycles")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "cycles"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>Par niveau</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("journal")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "journal"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Receipt className="h-3.5 w-3.5 text-slate-600" />
            <span>Journal de caisse</span>
          </button>
        </div>
      </div>

      {/* ── CONTENU ONGLET 1 : COURBE SPLINE ENCAISSEMENTS ── */}
      {activeTab === "flux" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recettes cumulées du mois · {academicYear}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {fmt(kpis.monthCollected)} F
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  sur {fmt(kpis.monthExpected)} F attendus
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <TrendingUp className="h-3.5 w-3.5" />
                {kpis.recoveryRate}% de l&apos;objectif mensuel
              </span>
            </div>
          </div>

          {/* DIAGRAMME SVG SPLINE DOUX */}
          <div className="relative w-full h-44 rounded-2xl bg-gradient-to-b from-slate-50/60 to-white border border-slate-100 p-2 sm:p-4 overflow-hidden">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 140"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="accountantAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#10B981" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="accountantLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>

              {/* Lignes repères horizontales */}
              <line x1="30" y1="35" x2="570" y2="35" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />
              <line x1="30" y1="75" x2="570" y2="75" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />
              <line x1="30" y1="115" x2="570" y2="115" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />

              {/* Remplissage de l'aire sous la courbe */}
              <path d={areaPath} fill="url(#accountantAreaGrad)" />

              {/* Courbe spline fluide */}
              <path
                d={curvePath}
                fill="none"
                stroke="url(#accountantLineGrad)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Points d'ancrage */}
              <circle cx="30" cy={y1} r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="240" cy={y2} r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="450" cy={y3} r="4" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="570" cy={y4} r="5.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2.5" className="animate-pulse" />
            </svg>

            {/* Bulle d'information flottante sur le dernier point */}
            <div className="absolute right-4 top-3 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-emerald-100 shadow-xs text-[11px] font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{fmt(kpis.monthCollected)} F encaissés</span>
            </div>

            {/* Repères temporels horizontaux */}
            <div className="absolute bottom-1.5 left-4 right-4 flex justify-between text-[10px] font-semibold text-slate-400">
              <span>Semaine 1</span>
              <span>Semaine 2</span>
              <span>Semaine 3</span>
              <span className="text-emerald-700 font-bold">Cette semaine</span>
            </div>
          </div>

          {/* Barre de progression mensuelle */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Progression mensuelle du recouvrement</span>
              <span>{kpis.recoveryRate}% atteint</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, kpis.recoveryRate))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 2 : SUIVI PAR NIVEAU / CYCLE ── */}
      {activeTab === "cycles" && (
        <div className="space-y-3">
          <div className="divide-y divide-slate-100">
            {cycleCollections.map((cyc) => {
              return (
                <div
                  key={cyc.cycle}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {cyc.label}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                        {cyc.rate}% perçu
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fmt(cyc.collected)} F perçus sur {fmt(cyc.expected)} F budgétés
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {fmt(cyc.collected)} F
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Recettes nettes
                      </span>
                    </div>

                    <Link
                      href="/dashboard/payments"
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                    >
                      <span>Factures</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 3 : DERNIÈRES TRANSACTIONS RÉELLES ── */}
      {activeTab === "journal" && (
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucun règlement enregistré récemment dans le journal.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {tx.studentName}
                      </p>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                        {tx.className}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {tx.invoiceTitle} {tx.receiptNumber ? `· Reçu #${tx.receiptNumber}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      +{fmt(tx.amount)} F
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {tx.methodLabel.split("/")[0].trim()} · {tx.timeFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIED : ACCÈS COMPLET ── */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">
          Caisse centrale certifiée · {academicYear}
        </span>
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
        >
          <span>Consulter tout le journal de caisse</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
