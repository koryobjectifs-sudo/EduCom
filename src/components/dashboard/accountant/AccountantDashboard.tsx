"use client";

import { Reveal } from "@/components/dashboard/Motion";
import AccountantSoftHeader from "./AccountantSoftHeader";
import AccountantSoftKpiStrip from "./AccountantSoftKpiStrip";
import AccountantSoftFinanceChart from "./AccountantSoftFinanceChart";
import AccountantSoftFinancialDonut from "./AccountantSoftFinancialDonut";
import AccountantSoftActionQueue from "./AccountantSoftActionQueue";
import AccountantSoftQuickNav from "./AccountantSoftQuickNav";
import AccountantSoftAgingCards from "./AccountantSoftAgingCards";
import type { AccountantDashboardSnapshot } from "@/lib/dashboard-accountant";

interface AccountantDashboardProps {
  snapshot: AccountantDashboardSnapshot;
}

/**
 * ESPACE COMPTABILITÉ & TRÉSORERIE / ACCOUNTANT COCKPIT
 * Refonte « Soft Elegance » — Standard unifié avec Directeur, Enseignant et Famille.
 * Courbes splines douces de recettes, anneau circulaire de santé financière,
 * analyse de vieillissement des créances (aging buckets) et journal de caisse en temps réel.
 */
export default function AccountantDashboard({ snapshot }: AccountantDashboardProps) {
  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. EN-TÊTE ÉPURÉ & ACCUEILLANT (Salutation, Live Caisse, Actions et Relances) ── */}
      <Reveal delay={0.02}>
        <AccountantSoftHeader snapshot={snapshot} />
      </Reveal>

      {/* ── 2. KPI STRIP ÉPURÉ (4 INDICATEURS FINANCIERS CIBLÉS AVEC MICRO-DIAGRAMMES) ── */}
      <Reveal delay={0.06}>
        <AccountantSoftKpiStrip snapshot={snapshot} />
      </Reveal>

      {/* ── 3. GRILLE COCKPIT BENTO DOUCE & ÉQUILIBRÉE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── COLONNE GAUCHE (7/12) : COURBE DE RECETTES & ANALYSE DES CRÉANCES ── */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <Reveal delay={0.08}>
            <AccountantSoftFinanceChart snapshot={snapshot} />
          </Reveal>

          <Reveal delay={0.12} className="flex-1 flex flex-col">
            <AccountantSoftAgingCards snapshot={snapshot} className="h-full flex-1" />
          </Reveal>
        </div>

        {/* ── COLONNE DROITE (5/12) : ANNEAU CIRCULAIRE, PRIORITÉS & ACCÈS ── */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Anneau Donut Circulaire de Santé Financière */}
          <Reveal delay={0.10}>
            <AccountantSoftFinancialDonut snapshot={snapshot} />
          </Reveal>

          {/* Priorités Financières & Relances (Non anxiogène, style doux) */}
          <Reveal delay={0.14}>
            <AccountantSoftActionQueue snapshot={snapshot} />
          </Reveal>

          {/* Accès Rapides vers les Outils Comptables — Étiré pour s'aligner au bas */}
          <Reveal delay={0.18} className="flex-1 flex flex-col">
            <AccountantSoftQuickNav className="h-full flex-1" />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
