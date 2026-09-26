"use client";

import { Reveal } from "@/components/dashboard/Motion";
import FamilySoftHeader from "./FamilySoftHeader";
import FamilySoftKpiStrip from "./FamilySoftKpiStrip";
import FamilySoftPerformanceChart from "./FamilySoftPerformanceChart";
import FamilySoftHealthDonut from "./FamilySoftHealthDonut";
import FamilySoftActionQueue from "./FamilySoftActionQueue";
import FamilySoftQuickNav from "./FamilySoftQuickNav";
import FamilySoftChildrenCards from "./FamilySoftChildrenCards";
import type { FamilyDashboardSnapshot } from "@/lib/dashboard-family";

interface FamilyDashboardProps {
  snapshot: FamilyDashboardSnapshot;
}

/**
 * ESPACE FAMILLE / PARENT COCKPIT
 * Refonte « Soft Elegance » — Alignement parfait sur les standards Directeur & Enseignant.
 * Courbes splines douces d'évolution des notes, anneau circulaire de sérénité scolaire,
 * cartes enfants valorisantes, indicateurs financiers apaisés et accès rapides fluides.
 */
export default function FamilyDashboard({ snapshot }: FamilyDashboardProps) {
  const { children } = snapshot;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. EN-TÊTE ÉPURÉ & ACCUEILLANT (Salutation, École, Live, Actions et Démarches) ── */}
      <Reveal delay={0.02}>
        <FamilySoftHeader snapshot={snapshot} />
      </Reveal>

      {/* ── 2. KPI STRIP ÉPURÉ (4 INDICATEURS CIBLÉS AVEC MICRO-DIAGRAMMES) ── */}
      <Reveal delay={0.06}>
        <FamilySoftKpiStrip snapshot={snapshot} />
      </Reveal>

      {/* ── 3. GRILLE COCKPIT BENTO DOUCE & ÉQUILIBRÉE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── COLONNE GAUCHE (7/12) : COURBE D'ÉVOLUTION & CARTES ENFANTS ── */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <Reveal delay={0.08}>
            <FamilySoftPerformanceChart snapshot={snapshot} />
          </Reveal>

          <Reveal delay={0.12} className="flex-1 flex flex-col">
            <FamilySoftChildrenCards children={children} className="h-full flex-1" />
          </Reveal>
        </div>

        {/* ── COLONNE DROITE (5/12) : ANNEAU CIRCULAIRE, PRIORITÉS & ACCÈS ── */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Anneau Donut Circulaire de Sérénité Scolaire (Style Directeur) */}
          <Reveal delay={0.10}>
            <FamilySoftHealthDonut snapshot={snapshot} />
          </Reveal>

          {/* Priorités & Démarches Recommandées (Non anxiogène, style doux) */}
          <Reveal delay={0.14}>
            <FamilySoftActionQueue snapshot={snapshot} />
          </Reveal>

          {/* Accès Rapides vers les Modules Famille — Étiré pour s'aligner au bas */}
          <Reveal delay={0.18} className="flex-1 flex flex-col">
            <FamilySoftQuickNav className="h-full flex-1" />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
