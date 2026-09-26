"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  CreditCard,
  GraduationCap,
  FileCheck,
} from "lucide-react";
import type { FamilyDashboardSnapshot } from "@/lib/dashboard-family";

interface FamilySoftActionQueueProps {
  snapshot: FamilyDashboardSnapshot;
}

export default function FamilySoftActionQueue({ snapshot }: FamilySoftActionQueueProps) {
  const { pendingReminders, financialSummary, children } = snapshot;

  const priorityItems: {
    id: string;
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: typeof AlertCircle;
    iconColor: string;
    iconBg: string;
    href: string;
    actionLabel: string;
  }[] = [];

  // 1. Relances administratives et démarches en attente
  for (const r of pendingReminders.slice(0, 2)) {
    priorityItems.push({
      id: `remind-${r.id}`,
      title: r.requirementLabel,
      description: `Concernant ${r.studentName}${r.message ? ` · « ${r.message} »` : ""}`,
      badge: r.nature === "SIGN" ? "Signature" : "Document",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      icon: FileCheck,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      href: r.actionUrl || "/famille/actions",
      actionLabel: r.nature === "SIGN" ? "Signer" : "Déposer",
    });
  }

  // 2. Échéance financière si solde restant
  if (financialSummary.totalRemaining > 0 && financialSummary.earliestDueDate) {
    priorityItems.push({
      id: "action-tuition-due",
      title: "Échéance de scolarité à venir",
      description: `Montant : ${financialSummary.earliestDueAmount.toLocaleString("fr-FR")} F attendus avant le ${financialSummary.earliestDueDate}`,
      badge: "Écolage",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-100",
      icon: CreditCard,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
      href: "/famille/paiements",
      actionLabel: "Régler",
    });
  }

  // 3. Bulletins disponibles si des notes existent
  const childWithGrades = children.find((c) => c.gradesCount > 0);
  if (childWithGrades && priorityItems.length < 3) {
    priorityItems.push({
      id: `action-bulletin-${childWithGrades.id}`,
      title: `Bulletin officiel · ${childWithGrades.firstName}`,
      description: `Consultez les appréciations et moyennes officielles pour la classe de ${childWithGrades.className}`,
      badge: "Résultats",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-100",
      icon: GraduationCap,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
      href: `/preview/report-card?studentId=${childWithGrades.id}`,
      actionLabel: "Consulter",
    });
  }

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-4">
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Priorités & Démarches</span>
            {priorityItems.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700">
                {priorityItems.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Actions suggérées pour le suivi de vos enfants
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          Famille
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
              Scolarité parfaitement à jour
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toutes les pièces administratives, signatures et écolages sont en ordre.
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
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 border border-slate-200/80 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all shrink-0 shadow-2xs"
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
