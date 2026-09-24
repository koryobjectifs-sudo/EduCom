"use client";

import Link from "next/link";
import {
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Check,
} from "lucide-react";
import type { AttendanceTodayData, FinancialCommandData } from "@/lib/dashboard-director";

interface TodayPulseSectionProps {
  attendance?: AttendanceTodayData | null;
  finance?: FinancialCommandData | null;
  scope: {
    attendance?: boolean;
    money?: boolean;
  };
}

export default function TodayPulseSection({
  attendance,
  finance,
  scope,
}: TodayPulseSectionProps) {
  const showAttendance = Boolean(scope.attendance !== false && attendance);
  const showFinance = Boolean(scope.money && finance);

  if (!showAttendance && !showFinance) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── 1. MODULE ASSIDUITÉ DU JOUR ── */}
      {showAttendance && attendance && (
        <div className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <div className="flex items-center gap-2">
                <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-blue-50 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-text">
                    Présences du Jour
                  </h3>
                  <p className="text-[11px] text-text-soft">Appel et situation en classe</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-text-soft bg-sunk px-2 py-0.5 rounded-pill border border-rule">
                {attendance.classesRecordedCount}/{attendance.classesTotalCount} classes
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                  {attendance.recordedToday && attendance.globalRate !== null
                    ? `${attendance.globalRate} %`
                    : "—"}
                </span>
                <span className="text-xs text-text-soft ml-1.5">taux de présence</span>
              </div>
              {attendance.isFullSchoolRecorded ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill border border-emerald-100">
                  <Check className="h-3 w-3" /> Appel complet
                </span>
              ) : attendance.pendingClasses.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-pill border border-amber-100">
                  <AlertTriangle className="h-3 w-3" /> {attendance.pendingClasses.length} en attente
                </span>
              ) : null}
            </div>

            {/* Détails présents / absents / retards */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-control bg-emerald-50/40 p-2 text-center border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Présents</span>
                <p className="text-sm font-extrabold text-emerald-950">{attendance.presentCount}</p>
              </div>
              <div className="rounded-control bg-red-50/40 p-2 text-center border border-red-100">
                <span className="text-[10px] uppercase font-bold text-red-800">Absents</span>
                <p className="text-sm font-extrabold text-red-950">{attendance.absentCount}</p>
              </div>
              <div className="rounded-control bg-amber-50/40 p-2 text-center border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-800">Retards</span>
                <p className="text-sm font-extrabold text-amber-950">{attendance.lateCount}</p>
              </div>
            </div>

            {/* Raccourci classes en attente d'appel */}
            {attendance.pendingClasses.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-rule">
                <span className="text-[11px] text-text-soft font-medium">À pointer ce matin :</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {attendance.pendingClasses.slice(0, 3).map((c) => (
                    <Link
                      key={c.classId}
                      href={`/dashboard/attendance?classId=${c.classId}`}
                      className="inline-flex items-center text-[11px] font-medium bg-sunk hover:bg-slate-200 text-text px-2 py-0.5 rounded-control transition-colors"
                    >
                      {c.className}
                    </Link>
                  ))}
                  {attendance.pendingClasses.length > 3 && (
                    <span className="text-[10.5px] text-text-soft self-center">
                      +{attendance.pendingClasses.length - 3} autres
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/attendance"
            className="flex items-center justify-between pt-2.5 border-t border-rule text-xs font-semibold text-primary hover:underline"
          >
            <span>Feuille d&apos;appel générale</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── 2. MODULE CAISSE & ENCAISSEMENTS DU JOUR ── */}
      {showFinance && finance && (
        <div className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <div className="flex items-center gap-2">
                <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-emerald-50 text-emerald-700">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-text">
                    Encaissements & Caisse
                  </h3>
                  <p className="text-[11px] text-text-soft">Flux financiers du jour</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-pill border border-emerald-100">
                Direct
              </span>
            </div>

            <div className="mt-3.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700">
                {finance.collectionsToday.toLocaleString("fr-FR")}{" "}
                <span className="text-xs font-bold text-text-soft">FCFA</span>
              </span>
              <p className="text-xs text-text-soft mt-0.5">collectés aujourd&apos;hui</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-control bg-sunk/60 p-2.5 border border-rule">
                <span className="text-[10.5px] text-text-soft font-medium">Cette semaine</span>
                <p className="text-xs sm:text-sm font-bold text-text truncate mt-0.5">
                  {finance.collectionsThisWeek.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="rounded-control bg-sunk/60 p-2.5 border border-rule">
                <span className="text-[10.5px] text-text-soft font-medium">Factures à échoir</span>
                <p className="text-xs sm:text-sm font-bold text-text truncate mt-0.5">
                  {finance.upcomingReceivables.count} en attente
                </p>
              </div>
            </div>

            {finance.upcomingReceivables.amount > 0 && (
              <p className="mt-2.5 text-[11px] text-text-soft">
                Montant attendu :{" "}
                <strong className="text-text font-semibold">
                  {finance.upcomingReceivables.amount.toLocaleString("fr-FR")} FCFA
                </strong>
              </p>
            )}
          </div>

          <Link
            href="/dashboard/payments"
            className="flex items-center justify-between pt-2.5 border-t border-rule text-xs font-semibold text-primary hover:underline"
          >
            <span>Facturation & Reçus</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
