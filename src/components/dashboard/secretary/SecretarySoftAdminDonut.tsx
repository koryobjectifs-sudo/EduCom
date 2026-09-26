"use client";

import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import type { SecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";

interface SecretarySoftAdminDonutProps {
  snapshot: SecretaryDashboardSnapshot;
}

export default function SecretarySoftAdminDonut({ snapshot }: SecretarySoftAdminDonutProps) {
  const { kpis, adminHealthScore } = snapshot;

  const admissionsScore =
    kpis.pendingAdmissions === 0 ? 100 : Math.max(40, 100 - kpis.pendingAdmissions * 10);
  const attendanceScore =
    kpis.classesTotalCount > 0
      ? Math.round((kpis.classesRecordedCount / kpis.classesTotalCount) * 100)
      : 95;
  const docScore = 90;

  // Mathématiques de l'anneau circulaire SVG calibré avec espacements nets
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~376.99

  const visibleGap = 12;
  const capCompensation = strokeWidth; // 12px
  const gap = visibleGap + capCompensation; // 24px entre centres

  const totalGaps = 3 * gap; // 72px
  const availableLength = circumference - totalGaps; // ~305px

  // Répartition des 3 piliers administratifs
  const seg1Length = availableLength * 0.45; // Admissions & Inscriptions (Sky)
  const seg2Length = availableLength * 0.35; // Appel & Assiduité (Indigo)
  const seg3Length = availableLength * 0.20; // Documents & Bulletins (Emerald)

  const initialOffset = gap / 2;
  const offset1 = -initialOffset;
  const offset2 = -(initialOffset + seg1Length + gap);
  const offset3 = -(initialOffset + seg1Length + gap + seg2Length + gap);

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between space-y-6">
      {/* ── EN-TÊTE DE LA JAUGE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Efficacité Administrative</span>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Indice de tenue des registres et dossiers
          </p>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
          Temps réel
        </span>
      </div>

      {/* ── L'ANNEAU DONUT CIRCULAIRE AVEC ESPACEMENTS NETS ── */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Piste de fond douce */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Arc 1 : Admissions & Inscriptions (Sky) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#0EA5E9"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg1Length} ${circumference}`}
              strokeDashoffset={offset1}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Arc 2 : Appel & Assiduité (Indigo) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#6366F1"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg2Length} ${circumference}`}
              strokeDashoffset={offset2}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Arc 3 : Documents & Bulletins (Emerald) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg3Length} ${circumference}`}
              strokeDashoffset={offset3}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Valeur Centrale Épurée */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {adminHealthScore}%
            </span>
            <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              {adminHealthScore >= 80 ? "Excellente" : "En cours"}
            </span>
          </div>
        </div>
      </div>

      {/* ── LÉGENDE DES 3 PILIERS ADMINISTRATIFS ── */}
      <div className="space-y-2.5 pt-1">
        {/* Pilier 1 : Admissions */}
        <Link
          href="/dashboard/students/dossiers/review"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-sky-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                Dossiers d&apos;inscription
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.pendingAdmissions > 0
                  ? `${kpis.pendingAdmissions} à instruire`
                  : "Registres complets"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-700">{admissionsScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>

        {/* Pilier 2 : Assiduité */}
        <Link
          href="/dashboard/attendance"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                Couverture de l&apos;appel
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.classesRecordedCount} sur {kpis.classesTotalCount} classes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-700">{attendanceScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>

        {/* Pilier 3 : Documents & Bulletins */}
        <Link
          href="/dashboard/grades/report-cards"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                Bulletins & Pièces officielles
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.reportCardsSubmitted > 0
                  ? `${kpis.reportCardsSubmitted} en attente visa`
                  : "Édition fluide"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-700">{docScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      </div>
    </div>
  );
}
