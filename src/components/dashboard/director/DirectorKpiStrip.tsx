"use client";

import Link from "next/link";
import { Users, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { DirectorKPIs } from "@/lib/dashboard-director";

interface DirectorKpiStripProps {
  kpis: DirectorKPIs;
  scope: {
    money: boolean;
    students: boolean;
  };
}

export default function DirectorKpiStrip({ kpis, scope }: DirectorKpiStripProps) {
  const { activeStudents, recovery, overdue, attendanceToday, urgentActionsCount } = kpis;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. ÉLÈVES ACTIFS */}
      <Link
        href="/dashboard/students"
        className="group relative flex flex-col justify-between rounded-surface bg-surface p-3.5 sm:p-4 shadow-sm border border-rule hover:border-primary/50 hover:shadow-subtle transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
            Effectif Actif · {activeStudents.academicYear}
          </span>
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              {activeStudents.count.toLocaleString("fr-FR")}
            </span>
            <span className="text-role-meta font-medium text-text-soft">
              élèves inscrits ({activeStudents.academicYear})
            </span>
          </div>

          {activeStudents.prevYear && activeStudents.prevYearCount > 0 && activeStudents.count < activeStudents.prevYearCount ? (
            <div className="mt-2 rounded-control bg-secondary/30 border border-rule p-2 text-left text-role-meta text-text-soft space-y-0.5">
              <div className="font-semibold text-text">Année scolaire {activeStudents.academicYear}</div>
              <div className="text-[11px] leading-tight text-text-soft">
                <span className="font-medium text-text">{activeStudents.count} élève{activeStudents.count > 1 ? "s" : ""} inscrit{activeStudents.count > 1 ? "s" : ""}</span> pour {activeStudents.academicYear}.{" "}
                <span>{activeStudents.prevYearCount.toLocaleString("fr-FR")} élèves étaient inscrits en {activeStudents.prevYear}.</span>
              </div>
              <div className="pt-0.5 font-semibold text-primary group-hover:underline text-[11px]">
                Voir les effectifs {activeStudents.prevYear} →
              </div>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5 text-role-meta">
              {activeStudents.new30d > 0 ? (
                <span className="inline-flex items-center gap-0.5 rounded-pill bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                  <TrendingUp className="h-2.5 w-2.5" />
                  +{activeStudents.new30d} sur 30j
                </span>
              ) : (
                <span className="text-text-faint">Effectif stable</span>
              )}

              {activeStudents.pendingCount > 0 && (
                <span className="rounded-pill bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                  {activeStudents.pendingCount} en attente
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-rule text-role-meta text-text-soft group-hover:text-primary font-medium">
          <span>Consulter le registre</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      {/* 2. RECOUVREMENT FINANCIER */}
      {scope.money ? (
        <Link
          href="/dashboard/payments"
          className="group relative flex flex-col justify-between rounded-surface bg-surface p-3.5 sm:p-4 shadow-sm border border-rule hover:border-emerald-400/50 hover:shadow-subtle transition-all"
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
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-text">
                {recovery.rate !== null ? `${recovery.rate} %` : "—"}
              </span>
              <span className="text-role-meta font-medium text-text-soft">des factures</span>
            </div>

            {/* Barre de progression */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunk">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${Math.min(100, recovery.rate ?? 0)}%` }}
              />
            </div>

            <p className="mt-1.5 text-role-meta text-text-soft truncate">
              <span className="font-semibold text-text">
                {recovery.collected.toLocaleString("fr-FR")} FCFA
              </span>{" "}
              sur {recovery.expected.toLocaleString("fr-FR")} FCFA
            </p>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-rule text-role-meta text-text-soft group-hover:text-emerald-700 font-medium">
            <span>Détail des encaissements</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-surface bg-sunk p-3.5 sm:p-4 border border-dashed border-rule text-text-faint">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider">Recouvrement</span>
          <p className="text-xs font-medium">Information financière réservée à la gestion</p>
          <span className="text-role-meta">Accès restreint</span>
        </div>
      )}

      {/* 3. TOTAL IMPAYÉS & RETARDS */}
      {scope.money ? (
        <Link
          href="/dashboard/payments"
          className="group relative flex flex-col justify-between rounded-surface bg-surface p-3.5 sm:p-4 shadow-sm border border-rule hover:border-danger/50 hover:shadow-subtle transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
              Impayés échus
            </span>
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-red-50 text-danger group-hover:bg-danger group-hover:text-white transition-colors">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-danger">
                {overdue.totalAmount > 0 ? `${(overdue.totalAmount / 1_000_000).toFixed(1)} M` : "0"}
              </span>
              <span className="text-role-meta font-medium text-text-soft">FCFA en retard</span>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 text-role-meta">
              {overdue.affectedFamilies > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-red-50 px-1.5 py-0.5 font-semibold text-danger">
                  {overdue.affectedFamilies} famille{overdue.affectedFamilies > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Aucun retard</span>
              )}

              {overdue.invoicesCount > 0 && (
                <span className="text-text-faint">
                  ({overdue.invoicesCount} facture{overdue.invoicesCount > 1 ? "s" : ""})
                </span>
              )}
            </div>

            <p className="mt-1.5 text-role-meta text-text-soft truncate">
              {overdue.totalAmount > 0 ? `${overdue.totalAmount.toLocaleString("fr-FR")} FCFA à régulariser` : "Situation financière à jour"}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-rule text-role-meta text-text-soft group-hover:text-danger font-medium">
            <span>Relancer les familles</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ) : (
        <div className="flex flex-col justify-between rounded-surface bg-sunk p-3.5 sm:p-4 border border-dashed border-rule text-text-faint">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider">Impayés</span>
          <p className="text-xs font-medium">Information financière réservée à la gestion</p>
          <span className="text-role-meta">Accès restreint</span>
        </div>
      )}

      {/* 4. PRÉSENCE DU JOUR */}
      <Link
        href="/dashboard/attendance"
        className="group relative flex flex-col justify-between rounded-surface bg-surface p-3.5 sm:p-4 shadow-sm border border-rule hover:border-primary/50 hover:shadow-subtle transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-soft">
            Assiduité Aujourd&apos;hui
          </span>
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2">
          {attendanceToday.isRecorded ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-text">
                  {attendanceToday.rate !== null ? `${attendanceToday.rate} %` : "—"}
                </span>
                <span className="text-role-meta font-medium text-text-soft">
                  {attendanceToday.isFullSchoolRecorded ? "toute l'école" : "classes appelées"}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 text-role-meta">
                <span className="inline-flex items-center gap-0.5 rounded-pill bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                  {attendanceToday.presentCount} présent{attendanceToday.presentCount > 1 ? "s" : ""}
                </span>
                {attendanceToday.absentCount > 0 && (
                  <span className="rounded-pill bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                    {attendanceToday.absentCount} absent{attendanceToday.absentCount > 1 ? "s" : ""}
                  </span>
                )}
                {!attendanceToday.isFullSchoolRecorded && (
                  <span className="rounded-pill bg-blue-50 px-1.5 py-0.5 font-semibold text-primary">
                    {attendanceToday.classesRecordedCount}/{attendanceToday.classesTotalCount} cl.
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-role-meta text-text-soft truncate">
                {attendanceToday.presentCount} / {attendanceToday.totalRecordedStudents} élèves appelés
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-amber-700">Appel en attente</span>
              </div>
              <p className="mt-1.5 text-role-meta text-text-soft">
                0 sur {attendanceToday.classesTotalCount} classes ont validé l&apos;appel aujourd&apos;hui.
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-pill bg-amber-50 px-1.5 py-0.5 text-role-meta font-medium text-amber-800">
                Démarrer l&apos;appel
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-rule text-role-meta text-text-soft group-hover:text-primary font-medium">
          <span>Gérer les présences</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
    </div>
  );
}
