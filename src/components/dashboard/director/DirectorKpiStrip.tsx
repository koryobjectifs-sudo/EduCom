"use client";

import Link from "next/link";
import { Users, TrendingUp, CheckCircle2, Clock, ArrowUpRight, ShieldAlert } from "lucide-react";
import type { DirectorKPIs } from "@/lib/dashboard-director";

interface DirectorKpiStripProps {
  kpis: DirectorKPIs;
  scope: {
    money: boolean;
    students: boolean;
    attendance?: boolean;
  };
}

export default function DirectorKpiStrip({ kpis, scope }: DirectorKpiStripProps) {
  const { activeStudents, recovery, attendanceToday, urgentActionsCount } = kpis;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. ÉLÈVES ACTIFS */}
      {scope.students ? (
        <Link
          href="/dashboard/students"
          className="group relative flex flex-col justify-between rounded-surface bg-surface p-4 shadow-sm border border-rule hover:border-primary/50 hover:shadow-subtle transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
              Effectif Actif
            </span>
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {activeStudents.count.toLocaleString("fr-FR")}
              </span>
              <span className="text-role-meta font-medium text-text-soft">élèves</span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {activeStudents.new30d > 0 ? (
                <span className="inline-flex items-center gap-0.5 rounded-pill bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  +{activeStudents.new30d} sur 30j
                </span>
              ) : (
                <span className="text-text-soft">Effectif stable</span>
              )}

              {activeStudents.pendingCount > 0 && (
                <span className="rounded-pill bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">
                  {activeStudents.pendingCount} en attente
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-rule text-role-meta text-text-soft group-hover:text-primary font-medium">
            <span>Annuaire des élèves</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-surface bg-surface p-4 shadow-sm border border-rule">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">Effectif</span>
          <span className="text-2xl font-bold text-text">{activeStudents.count}</span>
          <span className="text-role-meta text-text-faint">Accès restreint</span>
        </div>
      )}

      {/* 2. PRÉSENCE DU JOUR */}
      {scope.attendance !== false ? (
        <Link
          href="/dashboard/attendance"
          className="group relative flex flex-col justify-between rounded-surface bg-surface p-4 shadow-sm border border-rule hover:border-primary/50 hover:shadow-subtle transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
              Présence Aujourd&apos;hui
            </span>
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {attendanceToday.rate !== null ? `${attendanceToday.rate} %` : "—"}
              </span>
              <span className="text-role-meta font-medium text-text-soft">
                {attendanceToday.isRecorded ? "taux du jour" : "appel en cours"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-text-soft">
              {attendanceToday.isRecorded ? (
                <span>
                  <strong className="text-emerald-700 font-semibold">{attendanceToday.presentCount} présents</strong>
                  {attendanceToday.absentCount > 0 && ` · ${attendanceToday.absentCount} absents`}
                </span>
              ) : (
                <span className="text-amber-700 font-medium">Pointage non débuté</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-rule text-role-meta text-text-soft group-hover:text-primary font-medium">
            <span>
              {attendanceToday.classesRecordedCount}/{attendanceToday.classesTotalCount} classes pointées
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-surface bg-surface p-4 shadow-sm border border-rule text-text-faint">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider">Assiduité</span>
          <span className="text-role-meta">Accès restreint</span>
        </div>
      )}

      {/* 3. RECOUVREMENT FINANCIER */}
      {scope.money ? (
        <Link
          href="/dashboard/payments"
          className="group relative flex flex-col justify-between rounded-surface bg-surface p-4 shadow-sm border border-rule hover:border-emerald-400/50 hover:shadow-subtle transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
              Recouvrement
            </span>
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {recovery.rate !== null ? `${recovery.rate} %` : "—"}
              </span>
              <span className="text-role-meta font-medium text-text-soft">collecté</span>
            </div>

            <div className="mt-1 text-xs text-text-soft truncate">
              <strong className="text-emerald-700 font-semibold">{recovery.collected.toLocaleString("fr-FR")} FCFA</strong>
              {" "}encaissés
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-rule text-role-meta text-text-soft group-hover:text-emerald-700 font-medium">
            <span>Facturation & Reçus</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-surface bg-surface p-4 shadow-sm border border-rule text-text-faint">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider">Recouvrement</span>
          <span className="text-role-meta">Accès restreint</span>
        </div>
      )}

      {/* 4. ACTIONS & POINTS À ARBITRER */}
      <a
        href="#a-traiter"
        className={`group relative flex flex-col justify-between rounded-surface p-4 shadow-sm border transition-all ${
          urgentActionsCount > 0
            ? "bg-amber-50/40 border-amber-200/90 hover:border-amber-400 hover:shadow-subtle"
            : "bg-surface border-rule hover:border-emerald-400/50 hover:shadow-subtle"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
            Points à Traiter
          </span>
          <div
            className={`flex h-7.5 w-7.5 items-center justify-center rounded-control transition-colors ${
              urgentActionsCount > 0
                ? "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white"
                : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
            }`}
          >
            {urgentActionsCount > 0 ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                urgentActionsCount > 0 ? "text-amber-800" : "text-emerald-700"
              }`}
            >
              {urgentActionsCount}
            </span>
            <span className="text-role-meta font-medium text-text-soft">
              {urgentActionsCount > 1 ? "arbitrages requis" : "arbitrage requis"}
            </span>
          </div>

          <div className="mt-1 text-xs">
            {urgentActionsCount > 0 ? (
              <span className="font-semibold text-amber-700">Intervention conseillée</span>
            ) : (
              <span className="font-semibold text-emerald-700">Tous les voyants au vert</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-rule text-role-meta text-text-soft group-hover:text-text font-medium">
          <span>{urgentActionsCount > 0 ? "Examiner les points" : "Voir le journal"}</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    </div>
  );
}
