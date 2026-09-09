import { type DashboardSnapshot } from "@/lib/dashboard";
import { Reveal } from "@/components/dashboard/Motion";
import MorningBrief from "@/components/dashboard/MorningBrief";
import AttentionCenter from "@/components/dashboard/AttentionCenter";
import SchoolHealth from "@/components/dashboard/SchoolHealth";
import OperationalPulse from "@/components/dashboard/OperationalPulse";
import { FinanceSummary, AcademicSummary, ParentsSummary } from "@/components/dashboard/Summaries";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import PremiersPas from "@/components/dashboard/PremiersPas";
import DemoDataBanner from "@/components/dashboard/DemoDataBanner";
import NextBestAction from "@/components/dashboard/NextBestAction";
import DomainAccess from "@/components/dashboard/DomainAccess";

interface LegacyDashboardProps {
  snap: DashboardSnapshot;
}

/**
 * Archive du dashboard legacy (version antérieure au chantier Command Center).
 * Permet un rollback immédiat sans perte de logique ni de composants.
 */
export default function LegacyDashboard({ snap }: LegacyDashboardProps) {
  return (
    <div className="space-y-5 pb-12">
      {/* ── NIVEAU 1 — CURRENT CONTEXT ── */}
      <MorningBrief
        firstName={snap.firstName}
        schoolName={snap.schoolName}
        summary={snap.brief.summary}
        period={snap.context.period}
      />

      {/* ── NIVEAU 2 — OPERATIONAL PULSE ── */}
      <Reveal delay={0.06}>
        <OperationalPulse pulse={snap.pulse} context={snap.context} scope={snap.scope} />
      </Reveal>

      {/* ── NIVEAU 3 — ATTENTION CENTER ── */}
      <div id="a-traiter" className="scroll-mt-6">
        <Reveal delay={0.08}>
          <AttentionCenter items={snap.attention} />
        </Reveal>
      </div>

      {/* ── NIVEAU 4 — NEXT BEST ACTION ── */}
      <Reveal delay={0.10}>
        <NextBestAction action={snap.nextBestAction} period={snap.context.period} />
      </Reveal>

      {/* ── NIVEAU 5 — DOMAIN ACCESS ── */}
      <Reveal delay={0.11}>
        <DomainAccess scope={snap.scope} />
      </Reveal>

      {/* The activation engine stays visible until 100% activated */}
      {!snap.activation.isActivated && (
        <Reveal delay={0.12}>
          <PremiersPas
            schoolName={snap.schoolName ?? "Votre établissement"}
            classesCount={snap.fresh.classes}
            canAddStudent={snap.scope.students}
            activation={snap.activation}
          />
        </Reveal>
      )}

      {snap.hasDemoData && (
        <DemoDataBanner />
      )}

      {/* ── NIVEAU 5 — SCHOOL HEALTH ── */}
      <Reveal delay={0.18}>
        <SchoolHealth score={snap.health.score} axes={snap.health.axes} />
      </Reveal>

      {/* ── NIVEAU 6 — SUPPORTING INFORMATION (Summaries) ── */}
      <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${snap.scope.money ? "xl:grid-cols-3" : ""}`}>
        {snap.scope.money && (
          <Reveal delay={0.30} className="h-full"><FinanceSummary finance={snap.finance} /></Reveal>
        )}
        <Reveal delay={0.34} className="h-full"><AcademicSummary academic={snap.academic} /></Reveal>
        <Reveal delay={0.38} className="h-full"><ParentsSummary parents={snap.parents} /></Reveal>
      </div>

      {/* ── NIVEAU 6 — activité, et les factures en fin de page ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Reveal delay={0.44}>
          <ActivityFeed events={snap.activity} />
        </Reveal>
        {snap.scope.money && (
          <Reveal delay={0.48}>
            <RecentInvoices invoices={snap.invoices} />
          </Reveal>
        )}
      </div>
    </div>
  );
}
