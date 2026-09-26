"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/dashboard/Motion";
import SoftHeader from "./SoftHeader";
import SoftKpiStrip from "./SoftKpiStrip";
import SoftPerformanceChart from "./SoftPerformanceChart";
import SoftHealthDonut from "./SoftHealthDonut";
import SoftActionQueue from "./SoftActionQueue";
import SoftQuickNav from "./SoftQuickNav";
import AcademicProgressSection from "./AcademicProgressSection";
import { UserPlus, Sparkles, Check, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DirectorDashboardSnapshot } from "@/lib/dashboard-director";

interface DirectorDashboardProps {
  snapshot: DirectorDashboardSnapshot;
  academicSlot?: React.ReactNode;
  recentActivitySlot?: React.ReactNode;
}

/**
 * DIRECTRICE / DIRECTOR COMMAND CENTER
 * Refonte « Soft Elegance » — Cockpit fluide, unifiant et épuré.
 * Inspiré des standards visuels modernes : courbes splines douces,
 * anneau circulaire de santé scolaire et absence totale de bruit visuel.
 */
export default function DirectorDashboard({
  snapshot,
  academicSlot,
}: DirectorDashboardProps) {
  const {
    firstName,
    schoolName,
    currentAcademicYear,
    todayFormatted,
    currentPeriodContext,
    scope,
    kpis,
    financialCommand,
    actionsRequired,
    enrollment,
    attendanceToday,
    academic,
    recentActivity,
    readiness,
    hasDemoData,
    emailVerified,
  } = snapshot;

  const [loadingDemo, setLoadingDemo] = useState(false);
  const isFirstDayEmpty = kpis.activeStudents.count === 0 && !hasDemoData;

  return (
    <div className="space-y-6 pb-12">
      {/* ── BANDEAU DISCRET SI E-MAIL EN ATTENTE ── */}
      {!emailVerified && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-2.5 text-xs text-sky-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-600 shrink-0" />
            <span>
              Adresse e-mail en attente de confirmation. Votre école est pleinement opérationnelle.
            </span>
          </div>
        </div>
      )}

      {/* ── 1. EN-TÊTE ÉPURÉ & ACCUEILLANT (Intègre Salutation, Actions et Assistant) ── */}
      <Reveal delay={0.02}>
        <SoftHeader
          firstName={firstName}
          todayFormatted={todayFormatted}
          readiness={scope.settings ? readiness : null}
          scope={scope}
        />
      </Reveal>

      {/* ── ÉTAT PREMIER JOUR : ONBOARDING PREMIÈRE CLASSE ── */}
      {isFirstDayEmpty ? (
        <Reveal delay={0.04}>
          <div className="rounded-[28px] border border-indigo-100 bg-white p-7 sm:p-9 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] text-left space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Première rentrée
                </span>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Bienvenue sur votre poste de pilotage EduCom
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Votre établissement est initialisé. Donnez-lui vie en important votre première classe d&apos;élèves.
                </p>
              </div>

              <Link
                href="/dashboard/students/import?first=true"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 hover:-translate-y-0.5 transition-all shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span>Importer votre 1ère classe</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Check className="h-4 w-4" />
                  <span>Structure prête</span>
                </div>
                <p className="text-xs text-slate-500">{enrollment?.classesCount ?? 0} classes créées</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Check className="h-4 w-4" />
                  <span>Calendrier scolaire</span>
                </div>
                <p className="text-xs text-slate-500">Année {currentAcademicYear}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>Effectifs</span>
                </div>
                <p className="text-xs text-slate-500">En attente des élèves</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>Une seule classe suffit pour voir vos diagrammes et courbes s&apos;activer en temps réel.</span>
              <Button
                variant="ghost"
                size="sm"
                loading={loadingDemo}
                onClick={async () => {
                  setLoadingDemo(true);
                  const { injectDemoData } = await import("@/app/onboarding/demo-actions");
                  await injectDemoData();
                  window.location.reload();
                }}
              >
                Découvrir avec des données de démonstration
              </Button>
            </div>
          </div>
        </Reveal>
      ) : (
        <>
          {/* ── 2. KPI STRIP ÉPURÉ (4 INDICATEURS CIBLÉS AVEC MINI-DIAGRAMMES) ── */}
          <Reveal delay={0.06}>
            <SoftKpiStrip
              kpis={kpis}
              enrollment={enrollment}
              academicAverage={academic?.overallAverageOn20}
              gradesCompletionRate={academic?.gradesEntryCompletionRate}
              scope={scope}
            />
          </Reveal>

          {/* ── 3. GRILLE COCKPIT BENTO DOUCE & ÉQUILIBRÉE ── */}
          {/* ── 3. GRILLE COCKPIT BENTO DOUCE & ÉQUILIBRÉE — ALIGNEMENT AU BAS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* ── COLONNE GAUCHE (7/12) : COURBE D'ACTIVITÉ & TABLEAU ÉPURÉ ── */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <Reveal delay={0.08}>
                <SoftPerformanceChart
                  finance={financialCommand}
                  attendance={attendanceToday}
                  enrollment={enrollment}
                  recentActivity={recentActivity}
                />
              </Reveal>

              {/* Suivi Pédagogique (si autorisé) — Étiré pour s'aligner parfaitement au bas */}
              {scope.pedagogie && (
                academicSlot ? (
                  <div key="academic-slot-wrapper" className="flex-1 flex flex-col">
                    {academicSlot}
                  </div>
                ) : academic ? (
                  <Reveal key="academic-reveal" delay={0.12} className="flex-1 flex flex-col">
                    <AcademicProgressSection academic={academic} className="h-full flex-1" />
                  </Reveal>
                ) : null
              )}
            </div>

            {/* ── COLONNE DROITE (5/12) : ANNEAU CIRCULAIRE, PRIORITÉS & ACCÈS ── */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              {/* Anneau Donut Circulaire Multicolore (Style Image 1 & 3) */}
              <Reveal delay={0.10}>
                <SoftHealthDonut
                  kpis={kpis}
                  academic={academic}
                  enrollment={enrollment}
                />
              </Reveal>

              {/* Actions & Priorités Recommandées (Non anxiogène, style doux) */}
              <Reveal delay={0.14}>
                <SoftActionQueue items={actionsRequired} />
              </Reveal>

              {/* Accès Rapides vers les Modules Clés — Étiré pour s'aligner au bas avec la colonne gauche */}
              <Reveal delay={0.18} className="flex-1 flex flex-col">
                <SoftQuickNav className="h-full flex-1" />
              </Reveal>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
