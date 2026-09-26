"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, X } from "lucide-react";
import type { ConfigurationReadiness } from "@/lib/pedagogy";

interface PedagogySetupCardProps {
  readiness: ConfigurationReadiness | null;
}

/**
 * Assistant d'installation pédagogique — Refonte « Soft Elegance »
 * Bandeau doux, lumineux et harmonieux avec la nouvelle UI épurée.
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
    <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-indigo-50/40 via-white to-sky-50/30 border border-indigo-100/70 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Informations de configuration */}
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100/60">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span>Assistant d&apos;installation</span>
            </span>

            {!isBlocking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Notes opérationnelles</span>
              </span>
            )}
          </div>

          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
              {isBlocking
                ? `${remainingCount} chose${remainingCount > 1 ? "s" : ""} à régler avant les bulletins`
                : `${remainingCount} étape${remainingCount > 1 ? "s" : ""} recommandée${remainingCount > 1 ? "s" : ""} pour finaliser l'établissement`}
            </h2>

            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              {remainingIncomplete[0]?.purpose ||
                "Configurez les paramètres recommandés pour optimiser le fonctionnement de votre établissement."}
            </p>
          </div>

          {/* Jauge de progression épurée */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-2 w-36 sm:w-44 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {readiness.done} / {readiness.total} étapes ({progressPct}%)
            </span>
          </div>
        </div>

        {/* Boutons d'action doux */}
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
          <Link
            href={resumeHref}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <span>{isBlocking ? "Reprendre l'installation" : "Compléter la configuration"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {!isBlocking && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Masquer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
