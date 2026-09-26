"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  FileClock,
  ClipboardCheck,
  Award,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import type { SecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";

interface SecretarySoftActionQueueProps {
  snapshot: SecretaryDashboardSnapshot;
}

export default function SecretarySoftActionQueue({ snapshot }: SecretarySoftActionQueueProps) {
  const { kpis, classesAttendance } = snapshot;

  const priorityItems: {
    id: string;
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: typeof FileClock;
    iconColor: string;
    iconBg: string;
    href: string;
    actionLabel: string;
  }[] = [];

  // 1. Dossiers d'admission en attente
  if (kpis.pendingAdmissions > 0) {
    priorityItems.push({
      id: "pending-admissions",
      title: "Dossiers d'admission à instruire",
      description: `${kpis.pendingAdmissions} élève(s) en attente de vérification des pièces et affectation`,
      badge: "Prioritaire",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      icon: FileClock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      href: "/dashboard/students/dossiers/review",
      actionLabel: "Instruire",
    });
  }

  // 2. Appel du jour incomplet
  const missingClassesCount = Math.max(0, kpis.classesTotalCount - kpis.classesRecordedCount);
  if (missingClassesCount > 0) {
    priorityItems.push({
      id: "missing-attendance",
      title: "Appel non transmis",
      description: `${missingClassesCount} classe(s) n'ont pas encore retourné leur feuille de présence aujourd'hui`,
      badge: "Assiduité",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
      icon: ClipboardCheck,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      href: "/dashboard/attendance",
      actionLabel: "Relancer",
    });
  }

  // 3. Bulletins en attente de visa / validation
  if (kpis.reportCardsSubmitted > 0) {
    priorityItems.push({
      id: "report-cards-review",
      title: "Bulletins à vérifier ou imprimer",
      description: `${kpis.reportCardsSubmitted} bulletin(s) soumis par les enseignants en attente d'édition`,
      badge: "Bulletins",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: Award,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      href: "/dashboard/grades/report-cards",
      actionLabel: "Consulter",
    });
  }

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-4">
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Priorités du Secrétariat</span>
            {priorityItems.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700">
                {priorityItems.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Actions requises pour fluidifier la scolarité et les registres
          </p>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
          File d&apos;attente
        </span>
      </div>

      {/* ── LISTE DES ACTIONS PRIORITAIRES ── */}
      {priorityItems.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center space-y-2">
          <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-emerald-900">
            Excellente nouvelle ! Tout est à jour
          </p>
          <p className="text-[11px] text-emerald-700 max-w-sm mx-auto">
            Aucun dossier d&apos;inscription en attente et toutes les feuilles d&apos;appel sont bien reçues.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {priorityItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-sky-200 hover:shadow-xs transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center gap-1.5 self-end sm:self-auto rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shrink-0"
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
