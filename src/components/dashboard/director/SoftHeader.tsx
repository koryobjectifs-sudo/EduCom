"use client";

import Link from "next/link";
import { UserPlus, CreditCard, Sparkles, ArrowRight } from "lucide-react";
import type { ConfigurationReadiness } from "@/lib/pedagogy";

interface SoftHeaderProps {
  firstName: string | null;
  todayFormatted: string;
  readiness?: ConfigurationReadiness | null;
  scope?: {
    money?: boolean;
    students?: boolean;
  };
}

/**
 * En-tête Unifié « Soft Cockpit »
 * Fusionne la salutation (« Bonjour, JM » + date), la jauge de progression
 * et les accès rapides dans UNE SEULE barre ultra-compacte et élégante.
 * Règle métier : l'assistant de configuration reste TOUJOURS visible et non masquable
 * tant que la configuration de l'établissement n'est pas accomplie à 100%.
 */
export default function SoftHeader({
  firstName,
  todayFormatted,
  readiness,
  scope,
}: SoftHeaderProps) {
  const greetingName = firstName ? firstName : "la Direction";
  const initials = greetingName.slice(0, 2).toUpperCase();

  // Règle produit : non masquable tant que les étapes ne sont pas accomplies à 100%
  const showSetup = Boolean(readiness && readiness.done < readiness.total);

  const isBlocking = readiness ? !readiness.canEnterGrades : false;
  const progressPct = readiness ? Math.round((readiness.done / readiness.total) * 100) : 0;
  const remainingIncomplete = readiness?.steps.filter((s) => s.state !== "done") ?? [];
  const remainingCount = remainingIncomplete.length;

  // Workflow préservé : routage exact vers l'étape attendue
  let resumeHref = "/dashboard/settings/pedagogie/wizard?step=1";
  const firstIncomplete = remainingIncomplete[0]?.id;
  if (firstIncomplete === "classes" || firstIncomplete === "programme") {
    resumeHref = "/dashboard/settings/pedagogie/wizard?step=1";
  } else if (firstIncomplete === "trimestres" || firstIncomplete === "evaluations") {
    resumeHref = "/dashboard/settings/pedagogie/wizard?step=1";
  } else if (firstIncomplete === "enseignants" || firstIncomplete === "affectations") {
    resumeHref = "/dashboard/settings/pedagogie/wizard?step=3";
  } else if (firstIncomplete === "calendrier") {
    resumeHref = "/dashboard/settings/pedagogie#calendrier";
  }

  return (
    <div className="rounded-[22px] bg-white p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-3.5 transition-all">
      {/* ── 1. LIGNE DU HAUT : Salutation du jour & Accès rapides ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 tracking-wider">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                Bonjour, {greetingName}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                En direct
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">
              {todayFormatted}
            </p>
          </div>
        </div>

        {/* Boutons d'actions rapides et profilés */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {Boolean(scope?.students) && (
            <Link
              href="/dashboard/students/new"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>Inscrire un élève</span>
            </Link>
          )}

          {Boolean(scope?.money) && (
            <Link
              href="/dashboard/payments"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <CreditCard className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Facturation</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── 2. LIGNE INTÉGRÉE : Assistant de configuration avec couleur légère ── */}
      {showSetup && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50/60 via-indigo-50/30 to-sky-50/40 border border-indigo-100/70 p-2.5 sm:px-3.5 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-indigo-700 font-bold text-[11px] shrink-0 border border-indigo-100/80 shadow-3xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>{isBlocking ? "Étape bloquante" : "Assistant"}</span>
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong className="font-semibold text-slate-900">
                  {isBlocking
                    ? `${remainingCount} étape${remainingCount > 1 ? "s" : ""} bloquante${remainingCount > 1 ? "s" : ""} :`
                    : `${remainingCount} étape${remainingCount > 1 ? "s" : ""} recommandée${remainingCount > 1 ? "s" : ""} pour finaliser l'établissement :`}
                </strong>{" "}
                <span className="text-slate-600">
                  {remainingIncomplete[0]?.purpose || "Configurez les paramètres recommandés pour optimiser le fonctionnement de votre établissement."}
                </span>
              </p>
            </div>

            {/* Jauge progressive dégradée fine */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0 pl-3">
              <div className="h-1.5 w-24 rounded-full bg-white overflow-hidden shadow-3xs">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {readiness?.done ?? 0}/{readiness?.total ?? 0} ({progressPct}%)
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-end md:self-auto">
            <Link
              href={resumeHref}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 text-xs font-semibold shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>{isBlocking ? "Reprendre l'installation" : "Compléter la configuration"}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

