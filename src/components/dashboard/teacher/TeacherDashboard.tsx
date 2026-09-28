"use client";

import { Reveal } from "@/components/dashboard/Motion";
import TeacherSoftHeader from "./TeacherSoftHeader";
import TeacherSoftKpiStrip from "./TeacherSoftKpiStrip";
import TeacherSoftPerformanceChart from "./TeacherSoftPerformanceChart";
import TeacherSoftPedagogyDonut from "./TeacherSoftPedagogyDonut";
import TeacherSoftActionQueue from "./TeacherSoftActionQueue";
import TeacherSoftQuickNav from "./TeacherSoftQuickNav";
import TeacherSoftClassCards from "./TeacherSoftClassCards";
import type { TeacherDashboardSnapshot } from "@/lib/dashboard-teacher";

interface TeacherDashboardProps {
  snapshot: TeacherDashboardSnapshot;
}

/**
 * ESPACE ENSEIGNANT / TEACHER COCKPIT
 * Refonte « Soft Elegance » — Alignement parfait sur le poste de pilotage Directeur.
 * Courbes splines douces, jauge circulaire pédagogique, absence de bruit visuel,
 * micro-diagrammes et navigation fluide 100% orientée pédagogie.
 */
export default function TeacherDashboard({ snapshot }: TeacherDashboardProps) {
  const { teacherName, academicYear, todayFormatted, titulaireClasses, classes } = snapshot;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. EN-TÊTE ÉPURÉ & ACCUEILLANT (Salutation, Rôle, Live et Actions) ── */}
      <Reveal delay={0.02}>
        <TeacherSoftHeader
          teacherName={teacherName}
          academicYear={academicYear}
          todayFormatted={todayFormatted}
          titulaireClasses={titulaireClasses}
        />
      </Reveal>

      {/* ── 2. KPI STRIP ÉPURÉ (4 INDICATEURS CIBLÉS AVEC MICRO-DIAGRAMMES) ── */}
      <Reveal delay={0.06}>
        <TeacherSoftKpiStrip snapshot={snapshot} />
      </Reveal>

      {/* ── 3. GRILLE COCKPIT BENTO DOUCE & ÉQUILIBRÉE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── COLONNE GAUCHE (7/12) : COURBE D'AVANCEMENT & CARTES DE CLASSES ── */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <Reveal delay={0.08}>
            <TeacherSoftPerformanceChart snapshot={snapshot} />
          </Reveal>

          <Reveal delay={0.12} className="flex-1 flex flex-col">
            <div data-tour="teacher-classes" className="h-full flex-1">
              <TeacherSoftClassCards classes={classes} className="h-full flex-1" />
            </div>
          </Reveal>
        </div>

        {/* ── COLONNE DROITE (5/12) : ANNEAU CIRCULAIRE, PRIORITÉS & ACCÈS ── */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Anneau Donut Circulaire Pédagogique (Style Directeur) */}
          <Reveal delay={0.10}>
            <TeacherSoftPedagogyDonut snapshot={snapshot} />
          </Reveal>

          {/* Priorités & Alertes Recommandées (Non anxiogène, style doux) */}
          <Reveal delay={0.14}>
            <TeacherSoftActionQueue snapshot={snapshot} />
          </Reveal>

          {/* Accès Rapides vers les Modules Clés — Étiré pour s'aligner au bas */}
          <Reveal delay={0.18} className="flex-1 flex flex-col">
            <TeacherSoftQuickNav className="h-full flex-1" />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
