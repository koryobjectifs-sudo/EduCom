"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/dashboard/Motion";
import DirectorHeader from "./DirectorHeader";
import DirectorKpiStrip from "./DirectorKpiStrip";
import PedagogySetupCard from "./PedagogySetupCard";
import ActionRequiredSection from "./ActionRequiredSection";
import TodayPulseSection from "./TodayPulseSection";
import AcademicProgressSection from "./AcademicProgressSection";
import RecentActivityFeed from "./RecentActivityFeed";
import { UserPlus, Sparkles, Check, ArrowRight, Mail, School, CreditCard, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DirectorDashboardSnapshot } from "@/lib/dashboard-director";

interface DirectorDashboardProps {
  snapshot: DirectorDashboardSnapshot;
  academicSlot?: React.ReactNode;
  recentActivitySlot?: React.ReactNode;
}

/**
 * DIRECTRICE / DIRECTOR COMMAND CENTER
 * Poste de pilotage quotidien épuré d'EduCom.
 */
export default function DirectorDashboard({
  snapshot,
  academicSlot,
  recentActivitySlot,
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
    <div className="space-y-5 pb-10">
      {/* ── BANDEAU DISCRET : VÉRIFICATION D'E-MAIL DIFFÉRÉE ── */}
      {!emailVerified && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-xs text-sky-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-600 shrink-0" />
            <span>
              Adresse e-mail en attente de confirmation. Vous pouvez configurer votre école librement. La confirmation sera requise avant l&apos;envoi de messages ou de documents officiels.
            </span>
          </div>
        </div>
      )}

      {/* ── 1. EN-TÊTE ÉPURÉ DE PILOTAGE ── */}
      <Reveal delay={0.02}>
        <DirectorHeader
          firstName={firstName}
          schoolName={schoolName}
          currentAcademicYear={currentAcademicYear}
          todayFormatted={todayFormatted}
          currentPeriodContext={currentPeriodContext}
          urgentCount={kpis.urgentActionsCount}
          scope={scope}
        />
      </Reveal>

      {/* ── ÉTAT PREMIER JOUR : 0 ÉLÈVE (Onboarding première classe) ── */}
      {isFirstDayEmpty ? (
        <Reveal delay={0.04}>
          <div className="rounded-3xl border border-primary/20 bg-surface p-6 sm:p-8 shadow-card text-left space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-rule">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Première rentrée
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-text">
                  Bienvenue sur votre espace de pilotage
                </h2>
                <p className="text-xs text-text-soft">
                  Votre établissement est initialisé. Donnez-lui vie en important votre première classe.
                </p>
              </div>

              <Link
                href="/dashboard/students/import?first=true"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-8 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-hover shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                Importez votre première classe
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Étapes d'installation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-rule bg-sunk/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Check className="h-4 w-4" />
                  <span>Classes configurées</span>
                </div>
                <p className="text-xs text-text-soft">{enrollment.classesCount} classes prêtes</p>
              </div>

              <div className="rounded-2xl border border-rule bg-sunk/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Check className="h-4 w-4" />
                  <span>Session scolaire</span>
                </div>
                <p className="text-xs text-text-soft">Année {currentAcademicYear}</p>
              </div>

              <div className="rounded-2xl border border-rule bg-sunk/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>Effectif élèves</span>
                </div>
                <p className="text-xs text-text-soft">En attente du 1er import</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-soft">
              <span>Une seule classe suffit pour voir vos indicateurs s&apos;activer en temps réel.</span>
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
          {/* ── ASSISTANT D'INSTALLATION PEDAGOGIQUE (Affiché seulement si incomplet) ── */}
          {scope.settings && readiness && (
            <Reveal delay={0.04}>
              <PedagogySetupCard readiness={readiness} />
            </Reveal>
          )}

          {/* ── 2. KPI STRIP : 4 INDICATEURS ESSENTIELS ── */}
          <Reveal delay={0.06}>
            <DirectorKpiStrip kpis={kpis} scope={scope} />
          </Reveal>

          {/* ── 3. GRILLE COCKPIT BENTO (2 COLONNES ÉQUILIBRÉES) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── COLONNE GAUCHE (7/12) : PRIORITÉS & DIRECT OPÉRATIONNEL ── */}
            <div className="lg:col-span-7 space-y-5">
              {/* Zone Actions Requises */}
              <div id="a-traiter" className="scroll-mt-6">
                <Reveal delay={0.08}>
                  <ActionRequiredSection items={actionsRequired} />
                </Reveal>
              </div>

              {/* Situation du Jour (Présences & Caisse compacts) */}
              <Reveal delay={0.12}>
                <TodayPulseSection
                  attendance={attendanceToday}
                  finance={financialCommand}
                  scope={scope}
                />
              </Reveal>
            </div>

            {/* ── COLONNE DROITE (5/12) : PÉDAGOGIE, ACTIVITÉ & RACCOURCIS ── */}
            <div className="lg:col-span-5 space-y-5">
              {/* Suivi Pédagogique (si autorisé) */}
              {scope.pedagogie && (
                academicSlot ? (
                  <div key="academic-slot-wrapper">{academicSlot}</div>
                ) : academic ? (
                  <Reveal key="academic-reveal" delay={0.16}>
                    <AcademicProgressSection academic={academic} />
                  </Reveal>
                ) : null
              )}

              {/* Activité Récente (si disponible) */}
              {recentActivitySlot ? (
                <div key="recent-activity-slot-wrapper">{recentActivitySlot}</div>
              ) : recentActivity ? (
                <Reveal key="activity-reveal" delay={0.20}>
                  <RecentActivityFeed activity={recentActivity} />
                </Reveal>
              ) : null}

              {/* Raccourcis Rapides vers les Modules Clés */}
              <Reveal delay={0.24}>
                <div className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-soft">
                    Accès Rapides & Pilotage
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Link
                      href="/dashboard/classes"
                      className="flex items-center gap-2 p-2.5 rounded-control bg-sunk/60 hover:bg-sunk border border-rule transition-colors font-medium text-text group"
                    >
                      <School className="h-4 w-4 text-primary shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">Classes & Effectifs</span>
                    </Link>
                    <Link
                      href="/dashboard/settings/fees"
                      className="flex items-center gap-2 p-2.5 rounded-control bg-sunk/60 hover:bg-sunk border border-rule transition-colors font-medium text-text group"
                    >
                      <CreditCard className="h-4 w-4 text-emerald-600 shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">Grille tarifaire</span>
                    </Link>
                    <Link
                      href="/dashboard/documents"
                      className="flex items-center gap-2 p-2.5 rounded-control bg-sunk/60 hover:bg-sunk border border-rule transition-colors font-medium text-text group"
                    >
                      <FileText className="h-4 w-4 text-amber-600 shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">Documents officiels</span>
                    </Link>
                    <Link
                      href="/dashboard/settings/reinscription"
                      className="flex items-center gap-2 p-2.5 rounded-control bg-sunk/60 hover:bg-sunk border border-rule transition-colors font-medium text-text group"
                    >
                      <Calendar className="h-4 w-4 text-purple-600 shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">Préparer rentrée</span>
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
