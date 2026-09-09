"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, Clock, X } from "lucide-react";
import type { ConfigurationReadiness } from "@/lib/pedagogy";

interface PedagogySetupCardProps {
  readiness: ConfigurationReadiness | null;
}

/**
 * Carte intelligente affichée en haut du tableau de bord tant que
 * l'établissement n'a pas complété toutes les étapes recommandées.
 */
export default function PedagogySetupCard({ readiness }: PedagogySetupCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!readiness || isDismissed || readiness.done >= readiness.total) {
    return null;
  }

  const isBlocking = !readiness.canEnterGrades;
  const remainingIncomplete = readiness.steps.filter((s) => s.state !== "done");
  const remainingCount = remainingIncomplete.length;

  // Déterminer l'étape exacte pour reprendre le parcours sans recommencer à zéro
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

  const progressPct = Math.round((readiness.done / readiness.total) * 100);

  return (
    <div className={`relative overflow-hidden rounded-surface border p-3.5 sm:p-4 text-white shadow-sm transition-all ${
      isBlocking
        ? "border-primary/20 bg-gradient-to-r from-blue-950 via-[#0E2541] to-[#123055]"
        : "border-slate-800 bg-gradient-to-r from-slate-900 via-[#16253B] to-[#1E293B]"
    }`}>
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2 py-0.2 text-[10.5px] font-semibold text-blue-200">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>Assistant d&apos;installation</span>
            </div>
            {!isBlocking && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/20 text-emerald-300 px-2 py-0.2 text-[10px] font-medium border border-emerald-400/30">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Notes opérationnelles
              </span>
            )}
          </div>

          <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
            {isBlocking
              ? `${remainingCount} chose${remainingCount > 1 ? "s" : ""} à régler avant les bulletins`
              : `${remainingCount} étape${remainingCount > 1 ? "s" : ""} recommandée${remainingCount > 1 ? "s" : ""} pour finaliser l'établissement`}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            {remainingIncomplete[0]?.purpose ||
              "Configurez les paramètres recommandés pour optimiser le fonctionnement de votre établissement."}
          </p>

          <div className="flex items-center gap-2.5 pt-0.5">
            <div className="h-1.5 w-32 sm:w-40 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10.5px] font-semibold text-blue-200">
              {readiness.done} / {readiness.total} étapes ({progressPct}%)
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Link
            href={resumeHref}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover active:scale-[0.98] text-white px-3 text-xs font-semibold shadow-2xs transition-all whitespace-nowrap"
          >
            <span>{isBlocking ? "Reprendre l'installation" : "Compléter la configuration"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {!isBlocking && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-control hover:bg-white/10 transition-colors"
              title="Masquer ce rappel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
