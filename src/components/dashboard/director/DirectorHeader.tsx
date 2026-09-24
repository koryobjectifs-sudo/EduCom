"use client";

import Link from "next/link";
import { School as SchoolIcon, Layers, UserPlus, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

interface DirectorHeaderProps {
  firstName: string | null;
  schoolName: string | null;
  currentAcademicYear: string;
  todayFormatted: string;
  currentPeriodContext: string;
  urgentCount: number;
  scope?: {
    money?: boolean;
    students?: boolean;
  };
}

export default function DirectorHeader({
  firstName,
  schoolName,
  currentAcademicYear,
  todayFormatted,
  currentPeriodContext,
  urgentCount,
  scope,
}: DirectorHeaderProps) {
  const greetingName = firstName ? firstName : "la Direction";

  return (
    <div className="rounded-surface bg-surface p-5 sm:p-6 shadow-sm border border-rule">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Salutation et état de l'école */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-0.5 text-role-meta font-semibold text-primary">
              <SchoolIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">{schoolName || "Établissement Scolaire"}</span>
            </span>
            <span className="text-text-faint text-xs">•</span>
            <span className="text-xs font-medium text-text-soft">Année {currentAcademicYear}</span>
            <span className="text-text-faint text-xs">•</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill">
              <Layers className="h-3 w-3 shrink-0" />
              <span>{currentPeriodContext}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            Bonjour, {greetingName}
          </h1>

          <p className="text-xs sm:text-role-body text-text-soft max-w-2xl leading-relaxed">
            {urgentCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong className="font-semibold text-amber-900">
                    {urgentCount} point{urgentCount > 1 ? "s" : ""}
                  </strong>{" "}
                  à traiter aujourd&apos;hui dans votre établissement.
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Tous les voyants majeurs sont sous contrôle ce matin.</span>
              </span>
            )}
          </p>
        </div>

        {/* Date & Accès Rapides */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          {/* Badge Date */}
          <div className="hidden sm:flex flex-col justify-center rounded-control bg-sunk/60 px-3 py-1.5 border border-rule text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-soft">Aujourd&apos;hui</span>
            <span className="text-xs font-bold text-text capitalize">{todayFormatted}</span>
          </div>

          {/* Boutons d'actions rapides */}
          <div className="flex items-center gap-2 shrink-0">
            {Boolean(scope?.students) && (
              <Link
                href="/dashboard/students"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-primary text-white px-3.5 text-xs font-semibold hover:bg-primary-hover shadow-2xs active:scale-[0.98] transition-all"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                <span>Inscrire un élève</span>
              </Link>
            )}
            {Boolean(scope?.money) && (
              <Link
                href="/dashboard/payments"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-surface border border-rule text-text px-3.5 text-xs font-semibold hover:bg-sunk active:scale-[0.98] transition-all"
              >
                <CreditCard className="h-3.5 w-3.5 text-text-soft shrink-0" />
                <span>Facturation</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
