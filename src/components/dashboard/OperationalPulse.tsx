"use client";

import { CountUp } from "./Motion";
import type { OperationalPulseFacts } from "@/lib/dashboard";
import type { CurrentContext } from "@/lib/contextEngine";
import { CalendarClock, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * « Pulse Opérationnel »
 *
 * Affiche la situation immédiate de l'établissement sans nécessiter d'action.
 * Répond à : "Qu'est-ce qui se passe aujourd'hui ?"
 */
export default function OperationalPulse({
  pulse,
  context,
  scope
}: {
  pulse: OperationalPulseFacts;
  context: CurrentContext;
  scope: { money: boolean; students: boolean; validation: boolean; pedagogie: boolean };
}) {
  const d = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const isAssessment = context.period === "Assessment" || context.period === "Grade Entry";
  const isAdmission = context.period === "Admission" || context.period === "Re-registration";
  const isVacation = context.period === "Vacation";

  // Filter out non-actionable zeros to avoid "0 padding" unless it adds value
  const hasAttendanceData = pulse.attendance.totalClasses > 0;
  const showMissingGrades = (isAssessment || pulse.grades.missingClasses > 0) && pulse.grades.missingClasses > 0;
  const showIncompleteFiles = scope.students && (isAdmission || pulse.admissions.incomplete > 0) && pulse.admissions.incomplete > 0;
  const showOverduePayments = scope.money && pulse.payments.overdueCount > 0;

  const hasAnySignal = hasAttendanceData || showMissingGrades || showIncompleteFiles || showOverduePayments;

  if (isVacation) {
    return (
      <div className="rounded-[20px] border border-rule/40 bg-surface p-6 mb-6 flex items-center gap-4">
        <div className="bg-text-faint/10 text-text p-3 rounded-xl border border-rule shrink-0">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div>
          <div className="text-[16px] font-bold text-text mb-1">
            L&apos;établissement est en pause
          </div>
          <p className="text-[13px] text-text-soft">
            Période de vacances scolaires. Aucun signal opérationnel actif.
          </p>
        </div>
      </div>
    );
  }

  if (!hasAnySignal) {
    return null; // The Dashboard will naturally fall back to First Win or other elements
  }

  return (
    <section className="mb-8 rounded-[24px] border border-rule/50 bg-surface/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-primary/10 p-2 rounded-lg text-primary">
          <Activity className="h-4 w-4" />
        </div>
        <h2 className="text-[15px] font-bold uppercase tracking-wider text-text">
          Pulse Opérationnel
        </h2>
        <span className="text-rule/60 mx-2">|</span>
        <span className="text-[13px] font-medium text-text-soft">{d}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hasAttendanceData && (
          <AttendancePulse pulse={pulse.attendance} isVacation={isVacation} />
        )}

        {showMissingGrades && (
          <SignalCard
            label="Saisie des notes"
            value={pulse.grades.missingClasses}
            suffix="classes en attente"
            tone="warning"
            detail={isAssessment ? "Période d'évaluation en cours" : "Notes manquantes"}
            href="/dashboard/grades"
          />
        )}

        {showIncompleteFiles && (
          <SignalCard
            label="Dossiers élèves"
            value={pulse.admissions.incomplete}
            suffix="incomplets"
            tone="warning"
            detail={isAdmission ? "Priorité d'admission" : "À régulariser"}
            href="/dashboard/students"
          />
        )}

        {showOverduePayments && (
          <SignalCard
            label="Trésorerie"
            value={pulse.payments.overdueCount}
            suffix="paiements en retard"
            tone="danger"
            detail="Relances nécessaires"
            href="/dashboard/payments"
          />
        )}
      </div>
    </section>
  );
}

function AttendancePulse({
  pulse,
  isVacation
}: {
  pulse: OperationalPulseFacts["attendance"];
  isVacation: boolean;
}) {
  if (pulse.totalClasses === 0) return null;
  if (isVacation) return null; // Context Engine rule: less relevant during vacation

  if (pulse.recordedClasses === 0) {
    return (
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-[16px] border border-rule/50 bg-surface p-5 shadow-sm">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-faint mb-4">
          Présences aujourd&apos;hui
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="text-[15px] font-medium text-text mb-1">
              Aucune classe n&apos;a encore enregistré l&apos;appel.
            </p>
            <p className="text-[13px] text-text-soft">
              {pulse.pendingClasses} classe{pulse.pendingClasses > 1 ? "s" : ""} attend{pulse.pendingClasses > 1 ? "ent" : ""} leur appel.
            </p>
          </div>
          <Link
            href="/dashboard/attendance"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Voir les appels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-[16px] border border-rule/50 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-faint">
          Présences aujourd&apos;hui
        </h3>
        <Link href="/dashboard/attendance" className="text-[12px] font-semibold text-primary hover:underline">
          Détails &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 divide-x divide-rule/30">
        <div className="px-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold tabular-nums leading-none tracking-tight text-text">
              <CountUp value={pulse.recordedClasses} />
            </span>
            <span className="text-[14px] font-medium text-text-soft">/ {pulse.totalClasses}</span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-text-soft">
            Classes terminées
          </p>
        </div>

        <div className="px-4">
          <div className="text-[28px] font-bold tabular-nums leading-none tracking-tight text-warning-dark">
            <CountUp value={pulse.pendingClasses} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-warning-dark/80">
            En attente
          </p>
        </div>

        <div className="px-4">
          <div className="text-[28px] font-bold tabular-nums leading-none tracking-tight text-danger">
            <CountUp value={pulse.absents} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-danger/80">
            Absents
          </p>
        </div>

        <div className="px-4">
          <div className="text-[28px] font-bold tabular-nums leading-none tracking-tight text-warning-dark">
            <CountUp value={pulse.lates} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-warning-dark/80">
            Retards
          </p>
        </div>
      </div>
    </div>
  );
}

function SignalCard({
  label, value, suffix, detail, tone, href
}: {
  label: string; value: number; suffix: string; detail: string; tone: "success" | "warning" | "danger" | "neutral"; href: string;
}) {
  const styles = {
    success: "bg-success/5 border-success/20 text-success",
    warning: "bg-warning/5 border-warning/20 text-warning-dark",
    danger: "bg-danger/5 border-danger/20 text-danger",
    neutral: "bg-surface border-rule text-text",
  };
  const valColor = tone === "neutral" ? "text-text" : styles[tone].split(" ").pop();

  return (
    <Link href={href} className={`block rounded-[16px] border ${styles[tone]} p-5 transition-transform hover:scale-[1.01]`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</span>
        <ArrowRight className="w-3.5 h-3.5 opacity-50" />
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[28px] font-bold tabular-nums leading-none tracking-tight ${valColor}`}>
          <CountUp value={value} />
        </span>
      </div>
      
      <p className={`mt-1 text-[13px] font-medium opacity-90 ${valColor}`}>
        {suffix}
      </p>
      
      <div className="mt-3 text-[12px] opacity-70 border-t border-current/10 pt-3">
        {detail}
      </div>
    </Link>
  );
}
