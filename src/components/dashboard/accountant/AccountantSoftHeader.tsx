"use client";

import Link from "next/link";
import { CreditCard, Receipt, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantSoftHeaderProps {
  snapshot: AccountantDashboardSnapshot;
}

/**
 * En-tête Unifié « Soft Cockpit Comptable »
 * Salutation épurée, statut en direct de la caisse, accès immédiat aux encaissements et relances.
 */
export default function AccountantSoftHeader({ snapshot }: AccountantSoftHeaderProps) {
  const {
    accountantName,
    schoolName,
    academicYear,
    todayFormatted,
    kpis,
  } = snapshot;

  const greetingName = accountantName || "Comptable";
  const initials = greetingName.slice(0, 2).toUpperCase();
  const hasOverdue = kpis.overdueAmount > 0;

  return (
    <div className="rounded-[22px] bg-white p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-3.5 transition-all">
      {/* ── 1. LIGNE DU HAUT : Salutation & Actions Rapides ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 tracking-wider">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                Bonjour, {greetingName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Caisse en direct
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                <Sparkles className="h-3 w-3" />
                Comptabilité & Trésorerie · {academicYear}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">
              {todayFormatted} · {schoolName}
            </p>
          </div>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Link
            href="/dashboard/payments"
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <Receipt className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Journal de caisse</span>
          </Link>

          <Link
            href="/dashboard/payments"
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <CreditCard className="h-3.5 w-3.5 shrink-0" />
            <span>Encaisser un règlement</span>
          </Link>
        </div>
      </div>

      {/* ── 2. BANDEAU SANTÉ DES RECOUVREMENTS INTÉGRÉ ── */}
      <div className="pt-2 border-t border-slate-100/80">
        {hasOverdue ? (
          <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/80 to-amber-50/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100/80 flex items-center justify-center shrink-0 text-amber-800 shadow-2xs">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {kpis.overdueAmount.toLocaleString("fr-FR")} F CFA en retard de règlement ({kpis.overdueFamiliesCount} famille{kpis.overdueFamiliesCount > 1 ? "s" : ""})
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Échéances échues nécessitant un suivi ou une relance amiable.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/payments"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 shadow-2xs hover:-translate-y-0.5 transition-all shrink-0"
            >
              Gérer les relances &rarr;
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-2.5 px-3.5 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Trésorerie et recouvrement parfaitement alignés · Aucun impayé bloquant en souffrance.</span>
          </div>
        )}
      </div>
    </div>
  );
}
