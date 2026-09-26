"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Receipt,
  Clock,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantSoftActionQueueProps {
  snapshot: AccountantDashboardSnapshot;
}

export default function AccountantSoftActionQueue({ snapshot }: AccountantSoftActionQueueProps) {
  const { kpis, agingBuckets } = snapshot;

  const priorityItems: {
    id: string;
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: typeof CreditCard;
    iconColor: string;
    iconBg: string;
    href: string;
    actionLabel: string;
  }[] = [];

  // 1. Échéances critiques (> 30 jours)
  const criticalBucket = agingBuckets.find((b) => b.label.includes("> 30"));
  if (criticalBucket && criticalBucket.amount > 0) {
    priorityItems.push({
      id: "overdue-critical",
      title: "Impayés critiques (> 30 jours)",
      description: `${criticalBucket.amount.toLocaleString("fr-FR")} F CFA sur ${criticalBucket.count} dossier(s) en retard sévère`,
      badge: "Urgent",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200/60",
      icon: AlertCircle,
      iconColor: "text-rose-600",
      iconBg: "bg-rose-50",
      href: "/dashboard/payments",
      actionLabel: "Relancer",
    });
  }

  // 2. Échéances modérées (15-30 jours)
  const moderateBucket = agingBuckets.find((b) => b.label.includes("15 – 30"));
  if (moderateBucket && moderateBucket.amount > 0) {
    priorityItems.push({
      id: "overdue-moderate",
      title: "Relances à effectuer (15-30 jours)",
      description: `${moderateBucket.amount.toLocaleString("fr-FR")} F CFA · ${moderateBucket.count} famille(s) à notifier par WhatsApp / SMS`,
      badge: "À suivre",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      href: "/dashboard/payments",
      actionLabel: "Notifier",
    });
  }

  // 3. Encaissements du jour à rapprocher
  if (kpis.todayTransactionsCount > 0) {
    priorityItems.push({
      id: "cash-reconciliation",
      title: "Clôture & Rapprochement de caisse",
      description: `${kpis.todayCollected.toLocaleString("fr-FR")} F CFA enregistrés sur ${kpis.todayTransactionsCount} reçu(s)`,
      badge: "Caisse du jour",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: Receipt,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      href: "/dashboard/payments",
      actionLabel: "Pointer",
    });
  }

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-4">
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Priorités Financières</span>
            {priorityItems.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                {priorityItems.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Actions requises pour sécuriser la trésorerie
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          Comptabilité
        </span>
      </div>

      {/* ── ÉTAT ZEN (0 ACTION) ── */}
      {priorityItems.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 max-w-sm">
            <h3 className="text-sm font-bold text-slate-900">
              Trésorerie parfaitement équilibrée
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aucun impayé bloquant ni relance urgente en attente d&apos;arbitrage.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {priorityItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-50/60 hover:bg-white border border-slate-100 hover:border-slate-200/80 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${item.iconBg} ${item.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-semibold border ${item.badgeColor} shrink-0`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 border border-slate-200/80 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shrink-0 shadow-2xs"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
