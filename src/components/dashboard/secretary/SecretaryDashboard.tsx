"use client";

import { Reveal } from "@/components/dashboard/Motion";
import SecretarySoftHeader from "./SecretarySoftHeader";
import SecretarySoftKpiStrip from "./SecretarySoftKpiStrip";
import SecretarySoftActivityChart from "./SecretarySoftActivityChart";
import SecretarySoftAdminDonut from "./SecretarySoftAdminDonut";
import SecretarySoftActionQueue from "./SecretarySoftActionQueue";
import SecretarySoftQuickNav from "./SecretarySoftQuickNav";
import SecretarySoftAttendanceGrid from "./SecretarySoftAttendanceGrid";
import type { SecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";

interface SecretaryDashboardProps {
  snapshot: SecretaryDashboardSnapshot;
}

/**
 * ESPACE SECRÉTARIAT & ADMISSIONS / SECRETARY COCKPIT
 * Refonte « Soft Elegance » — Standard unifié avec Directeur, Enseignant, Comptable et Famille.
 * Courbes d'inscriptions, anneau circulaire d'efficacité administrative,
 * registre d'appel du jour et file d'attente d'instruction des dossiers.
 */
export default function SecretaryDashboard({ snapshot }: SecretaryDashboardProps) {
  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. EN-TÊTE ÉPURÉ & ACCUEILLANT (Salutation, Live Statut, Alerte Admissions) ── */}
      <Reveal delay={0.02}>
        <SecretarySoftHeader snapshot={snapshot} />
      </Reveal>

      {/* ── 2. KPI STRIP ÉPURÉ (4 INDICATEURS SECRÉTARIAT AVEC MICRO-DIAGRAMMES) ── */}
      <Reveal delay={0.06}>
        <SecretarySoftKpiStrip snapshot={snapshot} />
      </Reveal>

      {/* ── 3. GRILLE COCKPIT BENTO DOUCE & ÉQUILIBRÉE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── COLONNE GAUCHE (7/12) : COURBE D'ADMISSIONS & REGISTRE D'APPEL ── */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <Reveal delay={0.08}>
            <SecretarySoftActivityChart snapshot={snapshot} />
          </Reveal>

          <Reveal delay={0.12} className="flex-1 flex flex-col">
            <SecretarySoftAttendanceGrid
              classesAttendance={snapshot.classesAttendance}
              className="h-full flex-1"
            />
          </Reveal>
        </div>

        {/* ── COLONNE DROITE (5/12) : ANNEAU CIRCULAIRE, PRIORITÉS & ACCÈS ── */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Anneau Donut Circulaire d'Efficacité Administrative */}
          <Reveal delay={0.10}>
            <SecretarySoftAdminDonut snapshot={snapshot} />
          </Reveal>

          {/* Priorités du Secrétariat (Admissions en attente, appels manquants, bulletins) */}
          <Reveal delay={0.14}>
            <SecretarySoftActionQueue snapshot={snapshot} />
          </Reveal>

          {/* Accès Rapides vers les Outils du Secrétariat — Étiré pour s'aligner */}
          <Reveal delay={0.18} className="flex-1 flex flex-col">
            <SecretarySoftQuickNav className="h-full flex-1" />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
