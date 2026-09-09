"use client";

import Link from "next/link";
import { DollarSign, TrendingUp, AlertOctagon, CreditCard, Calendar, ArrowRight, ShieldCheck, PieChart, Banknote, Landmark, Smartphone, FileSpreadsheet } from "lucide-react";
import type { FinancialCommandData } from "@/lib/dashboard-director";

interface FinancialCommandCenterProps {
  finance: FinancialCommandData | null;
}

export default function FinancialCommandCenter({ finance }: FinancialCommandCenterProps) {
  if (!finance) return null;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "MOBILE_MONEY":
        return <Smartphone className="h-4 w-4 text-blue-600" />;
      case "CASH":
        return <Banknote className="h-4 w-4 text-emerald-600" />;
      case "BANK_TRANSFER":
        return <Landmark className="h-4 w-4 text-purple-600" />;
      case "CHECK":
      default:
        return <FileSpreadsheet className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <section className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-4">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-emerald-50 text-emerald-700">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
              Poste de Pilotage Financier
            </h2>
            <p className="text-role-meta text-text-soft">
              Recouvrement, encaissements récents et analyse de l&apos;ancienneté des impayés
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/payments"
            className="inline-flex h-7.5 items-center gap-1 rounded-control bg-sunk hover:bg-slate-200 px-2.5 text-xs font-semibold text-text transition-colors"
          >
            <span>Facturation & Reçus</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/payments/statement"
            className="inline-flex h-7.5 items-center gap-1 rounded-control bg-primary hover:bg-primary-hover px-2.5 text-xs font-semibold text-white transition-colors shadow-2xs"
          >
            <span>États financiers</span>
          </Link>
        </div>
      </div>

      {/* Grille Principale */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* COLONNE 1 : ENCAISSEMENTS RÉCENTS & FLUX */}
        <div className="rounded-control bg-sunk/60 p-3.5 border border-rule flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-text-soft">
              Flux d&apos;encaissements
            </h3>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-control bg-surface p-2.5 border border-rule shadow-2xs">
                <span className="text-[10.5px] font-medium text-text-soft">Aujourd&apos;hui</span>
                <p className="mt-0.5 text-sm sm:text-base font-bold text-emerald-700 truncate">
                  {finance.collectionsToday.toLocaleString("fr-FR")} <span className="text-[10px] font-normal text-text-soft">FCFA</span>
                </p>
              </div>

              <div className="rounded-control bg-surface p-2.5 border border-rule shadow-2xs">
                <span className="text-[10.5px] font-medium text-text-soft">Cette semaine</span>
                <p className="mt-0.5 text-sm sm:text-base font-bold text-primary truncate">
                  {finance.collectionsThisWeek.toLocaleString("fr-FR")} <span className="text-[10px] font-normal text-text-soft">FCFA</span>
                </p>
              </div>
            </div>

            {/* Prochaines Échéances */}
            <div className="mt-2.5 rounded-control bg-surface p-2.5 border border-rule shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text">Factures à échoir</span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-bold text-primary">
                  {finance.upcomingReceivables.count} facture{finance.upcomingReceivables.count > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs font-bold text-text">
                {finance.upcomingReceivables.amount.toLocaleString("fr-FR")} FCFA à venir
              </p>
              {finance.upcomingReceivables.nextDueDate && (
                <p className="text-[10.5px] text-text-soft flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5 text-text-faint" />
                  Prochaine échéance :{" "}
                  {new Date(finance.upcomingReceivables.nextDueDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1">
            <Link
              href="/dashboard/payments/new"
              className="w-full inline-flex h-8 items-center justify-center gap-1.5 rounded-control bg-surface text-text hover:bg-sunk border border-rule text-xs font-semibold transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Enregistrer un encaissement</span>
            </Link>
          </div>
        </div>

        {/* COLONNE 2 : ANCIENNETÉ DE LA DETTE (AGING BUCKETS) */}
        <div className="rounded-control bg-sunk/60 p-3.5 border border-rule space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-text-soft">
                Ancienneté des impayés
              </h3>
              <p className="text-role-meta text-text-soft mt-0.5">
                Total : <strong className="text-danger">{finance.overdueAmount.toLocaleString("fr-FR")} FCFA</strong> ({finance.affectedFamilies} fam.)
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-0.5">
            {finance.agingBuckets.map((bucket, idx) => {
              const color =
                idx === 0
                  ? "bg-amber-500"
                  : idx === 1
                  ? "bg-orange-600"
                  : "bg-red-600";
              const lightBg =
                idx === 0
                  ? "bg-amber-50 text-amber-800"
                  : idx === 1
                  ? "bg-orange-50 text-orange-800"
                  : "bg-red-50 text-red-800";

              return (
                <div key={bucket.label} className="space-y-1 rounded-control bg-surface p-2.5 border border-rule shadow-2xs">
                  <div className="flex items-center justify-between text-role-meta font-semibold">
                    <span className="text-text">{bucket.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lightBg}`}>
                      {bucket.amount.toLocaleString("fr-FR")} FCFA ({bucket.count})
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunk">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${bucket.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-text-soft">
                    <span>{bucket.percentage}% du total impayé</span>
                    <span>{bucket.count} dossier{bucket.count > 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-0.5">
            <Link
              href="/dashboard/payments"
              className="text-role-meta font-semibold text-danger hover:underline flex items-center justify-end gap-1"
            >
              <span>Voir la liste des retards & relancer</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* COLONNE 3 : RÉPARTITION PAR CANAL DE PAIEMENT */}
        <div className="rounded-control bg-sunk/60 p-3.5 border border-rule space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-text-soft">
              Répartition par canal
            </h3>
            <span className="text-role-meta text-text-soft">Tous encaissements</span>
          </div>

          <div className="space-y-2">
            {finance.channelBreakdown.length === 0 ? (
              <p className="text-role-meta text-text-faint py-4 text-center">Aucun encaissement enregistré</p>
            ) : (
              finance.channelBreakdown.map((channel) => (
                <div
                  key={channel.method}
                  className="flex items-center justify-between p-2 rounded-control bg-surface border border-rule shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-sunk border border-rule">
                      {getMethodIcon(channel.method)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-text">{channel.label}</h4>
                      <p className="text-[10px] text-text-soft">{channel.count} transaction{channel.count > 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-text">
                      {channel.amount.toLocaleString("fr-FR")} FCFA
                    </span>
                    <p className="text-[10px] font-medium text-emerald-600">{channel.percentage}%</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-control bg-emerald-50/60 p-2.5 border border-emerald-200/60 text-xs text-emerald-800 flex items-center justify-between">
            <span>Taux de recouvrement global</span>
            <strong className="text-xs font-extrabold">{finance.recoveryRate ?? 0}%</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
