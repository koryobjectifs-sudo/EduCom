"use client";

import Link from "next/link";
import { Sparkles, Calendar, School as SchoolIcon, Layers, ArrowUpRight, Plus, UserPlus, CreditCard, CheckCircle2 } from "lucide-react";

interface DirectorHeaderProps {
  firstName: string | null;
  schoolName: string | null;
  currentAcademicYear: string;
  todayFormatted: string;
  currentPeriodContext: string;
  urgentCount: number;
}

export default function DirectorHeader({
  firstName,
  schoolName,
  currentAcademicYear,
  todayFormatted,
  currentPeriodContext,
  urgentCount,
}: DirectorHeaderProps) {
  const greetingName = firstName ? firstName : "la Direction";

  return (
    <div className="relative overflow-hidden rounded-surface bg-gradient-to-br from-[#071A33] via-[#0E2541] to-[#123055] p-4 sm:p-5 text-white shadow-sm border border-white/10">
      {/* Halo de fond subtil */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#539BEB]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#9c0f15]/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Salutation et sous-titre */}
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-role-meta font-medium text-blue-200 backdrop-blur-md border border-white/5">
            <SchoolIcon className="h-3 w-3 text-[#539BEB] shrink-0" />
            <span className="truncate">{schoolName || "Établissement Scolaire"}</span>
            <span className="text-white/40">•</span>
            <span className="shrink-0">Année {currentAcademicYear}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Bonjour, {greetingName}
          </h1>

          <p className="text-xs sm:text-role-body text-slate-300 max-w-2xl leading-relaxed">
            {urgentCount > 0 ? (
              <span>
                Voici l&apos;état de votre établissement.{" "}
                <strong className="text-amber-300 font-semibold">
                  {urgentCount} point{urgentCount > 1 ? "s" : ""} requi{urgentCount > 1 ? "èrent" : "ert"} votre intervention
                </strong>{" "}
                aujourd&apos;hui.
              </span>
            ) : (
              <span>
                Voici le centre de pilotage de votre école. Tous les voyants majeurs sont sous contrôle ce matin.
              </span>
            )}
          </p>
        </div>

        {/* Métadonnées & Accès Rapides */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          {/* Badge Date & Trimestre */}
          <div className="flex flex-col justify-center rounded-control bg-white/[0.07] px-3 py-1.5 border border-white/10 backdrop-blur-md whitespace-nowrap shadow-inner">
            <div className="flex items-center gap-1.5 text-role-meta font-medium text-slate-200">
              <Calendar className="h-3 w-3 text-[#539BEB] shrink-0" />
              <span className="capitalize">{todayFormatted}</span>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] text-slate-300/90 mt-0.5">
              <Layers className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
              <span className="font-medium text-emerald-300">{currentPeriodContext}</span>
            </div>
          </div>

          {/* Boutons d'actions rapides */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/students"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control bg-white text-[#0E2541] px-3 text-xs font-semibold hover:bg-blue-50 active:scale-[0.98] transition-all shadow-sm whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#0E2541] shrink-0" />
              <span>Nouvel élève</span>
            </Link>
            <Link
              href="/dashboard/payments"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control bg-[#539BEB] text-white px-3 text-xs font-semibold hover:bg-[#4389d6] active:scale-[0.98] transition-all shadow-sm whitespace-nowrap"
            >
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              <span>Facturation</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
