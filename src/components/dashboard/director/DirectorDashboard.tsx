"use client";

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
  } = snapshot;

  return (
    <div className="space-y-4 pb-10">
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

      {/* ── CARTE D'INSTALLATION PEDAGOGIQUE (Affichée tant qu'incomplète) ── */}
      {readiness && (
        <Reveal delay={0.04}>
          <PedagogySetupCard readiness={readiness} />
        </Reveal>
      )}

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

      {/* ── 7. SUIVI PÉDAGOGIQUE (DIFFÉRÉ VIA SUSPENSE) ── */}
      {academicSlot ? (
        academicSlot
      ) : academic ? (
        <Reveal delay={0.24}>
          <AcademicProgressSection academic={academic} />
        </Reveal>
      ) : null}

      {/* ── 8. ACTIVITÉ RÉCENTE (DIFFÉRÉE VIA SUSPENSE) ── */}
      {recentActivitySlot ? (
        recentActivitySlot
      ) : recentActivity ? (
        <Reveal delay={0.28}>
          <RecentActivityFeed activity={recentActivity} />
        </Reveal>
      ) : null}
    </div>
  );
}
