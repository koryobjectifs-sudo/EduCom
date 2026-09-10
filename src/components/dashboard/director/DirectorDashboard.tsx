"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/dashboard/Motion";
import DirectorHeader from "./DirectorHeader";
import DirectorKpiStrip from "./DirectorKpiStrip";
import PedagogySetupCard from "./PedagogySetupCard";
import ActionRequiredSection from "./ActionRequiredSection";
import FinancialCommandCenter from "./FinancialCommandCenter";
import DailyAttendanceSection from "./DailyAttendanceSection";
import EnrollmentAnalyticsSection from "./EnrollmentAnalyticsSection";
import AcademicProgressSection from "./AcademicProgressSection";
import RecentActivityFeed from "./RecentActivityFeed";
import { UserPlus, Sparkles, Check, ArrowRight, Mail, School, BookOpen, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DirectorDashboardSnapshot } from "@/lib/dashboard-director";

interface DirectorDashboardProps {
  snapshot: DirectorDashboardSnapshot;
  academicSlot?: React.ReactNode;
  recentActivitySlot?: React.ReactNode;
}

/**
 * DIRECTRICE / DIRECTOR COMMAND CENTER
 * Nouveau poste de pilotage quotidien d'EduCom.
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
    isDpaAccepted,
  } = snapshot;

  const [loadingDemo, setLoadingDemo] = useState(false);
  const isFirstDayEmpty = kpis.activeStudents.count === 0 && !hasDemoData;

  return (
    <div className="space-y-4 pb-10">
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

      {/* ── 1. HEADER DE PILOTAGE ── */}
      <Reveal delay={0.02}>
        <DirectorHeader
          firstName={firstName}
          schoolName={schoolName}
          currentAcademicYear={currentAcademicYear}
          todayFormatted={todayFormatted}
          currentPeriodContext={currentPeriodContext}
          urgentCount={kpis.urgentActionsCount}
        />
      </Reveal>

      {/* ── ÉTAT PREMIER JOUR : 0 ÉLÈVE (Masque les 0 KPIs et met en avant la 1ère classe) ── */}
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
          {/* ── CARTE D'INSTALLATION PEDAGOGIQUE (Affichée tant qu'incomplète) ── */}
          {readiness && (
            <Reveal delay={0.04}>
              <PedagogySetupCard readiness={readiness} />
            </Reveal>
          )}

          {/* ── CARTE DE TRANSITION / PRÉPARATION DE LA RENTRÉE ── */}
          <Reveal delay={0.05}>
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-text">
                    Préparer la rentrée ({currentAcademicYear} → Année suivante)
                  </h3>
                  <p className="text-[11.5px] text-text-soft">
                    Basculez vos effectifs en 1 clic grâce à la réinscription en masse et à la promotion automatique de cycle.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings/reinscription"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-white shadow-card transition-colors hover:bg-primary-hover shrink-0"
              >
                <span>Préparer la rentrée</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>

          {/* ── 2. KPI STRIP (4 INDICATEURS ESSENTIELS) ── */}
          <Reveal delay={0.06}>
            <DirectorKpiStrip kpis={kpis} scope={scope} />
          </Reveal>

          {/* ── 3. ZONE CRITIQUE : « À TRAITER AUJOURD'HUI » ── */}
          <div id="a-traiter" className="scroll-mt-6">
            <Reveal delay={0.08}>
              <ActionRequiredSection items={actionsRequired} />
            </Reveal>
          </div>

          {/* ── 4. FINANCIAL COMMAND CENTER ── */}
          {scope.money && financialCommand && (
            <Reveal delay={0.12}>
              <FinancialCommandCenter finance={financialCommand} />
            </Reveal>
          )}

          {/* ── 5. ASSIDUITÉ DU JOUR ── */}
          <Reveal delay={0.16}>
            <DailyAttendanceSection attendance={attendanceToday} />
          </Reveal>

          {/* ── 6. EFFECTIFS & OCCUPATION DES CLASSES ── */}
          <Reveal delay={0.20}>
            <EnrollmentAnalyticsSection enrollment={enrollment} />
          </Reveal>
        </>
      )}

      {/* ── 7. SUIVI PÉDAGOGIQUE (DIFFÉRÉ VIA SUSPENSE) ── */}
      {academicSlot ? (
        <div key="academic-slot-wrapper">{academicSlot}</div>
      ) : academic ? (
        <Reveal key="academic-reveal" delay={0.24}>
          <AcademicProgressSection academic={academic} />
        </Reveal>
      ) : null}

      {/* ── 8. ACTIVITÉ RÉCENTE (DIFFÉRÉE VIA SUSPENSE) ── */}
      {recentActivitySlot ? (
        <div key="recent-activity-slot-wrapper">{recentActivitySlot}</div>
      ) : recentActivity ? (
        <Reveal key="activity-reveal" delay={0.28}>
          <RecentActivityFeed activity={recentActivity} />
        </Reveal>
      ) : null}
    </div>
  );
}
