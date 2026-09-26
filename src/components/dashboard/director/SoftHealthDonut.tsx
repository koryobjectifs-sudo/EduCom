"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { DirectorKPIs, AcademicData, EnrollmentData } from "@/lib/dashboard-director";

interface SoftHealthDonutProps {
  kpis: DirectorKPIs;
  academic?: AcademicData | null;
  enrollment?: EnrollmentData | null;
}

export default function SoftHealthDonut({
  kpis,
  academic,
  enrollment,
}: SoftHealthDonutProps) {
  const recoveryRate = kpis.recovery.rate ?? 84;
  const attendanceRate = kpis.attendanceToday.rate ?? 95;
  const academicRate = academic?.gradesEntryCompletionRate ?? 78;

  // Calcul d'un indice composite d'efficacité global de l'établissement (0-100%)
  const globalScore = Math.round(
    recoveryRate * 0.4 + attendanceRate * 0.35 + academicRate * 0.25
  );

  // Mathématiques de l'anneau circulaire SVG calibré avec espacements nets
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~376.99

  // Espacement visible net entre les pointes arrondies (12px)
  // strokeLinecap="round" ajoute strokeWidth/2 (6px) à chaque extrémité de tracé.
  const visibleGap = 12;
  const capCompensation = strokeWidth; // 12px
  const gap = visibleGap + capCompensation; // 24px entre centres de départ/fin

  // Longueur disponible pour les 3 arcs actifs après déduction des 3 intervalles
  const totalGaps = 3 * gap; // 72px
  const availableLength = circumference - totalGaps; // ~305px

  // Répartition harmonieuse des 3 piliers
  const seg1Length = availableLength * 0.44; // Recouvrement (Indigo)
  const seg2Length = availableLength * 0.34; // Présences (Cyan / Sky)
  const seg3Length = availableLength * 0.22; // Saisie Notes (Mint / Emerald)

  // Offsets précis pour centrer le 1er intervalle à 12h et garantir un espacement 100% régulier
  const initialOffset = gap / 2;
  const offset1 = -initialOffset;
  const offset2 = -(initialOffset + seg1Length + gap);
  const offset3 = -(initialOffset + seg1Length + gap + seg2Length + gap);

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between space-y-6">
      {/* ── EN-TÊTE DE LA JAUGE (Style Image 1 "Platform Value") ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Indice de Fonctionnement</span>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Performance globale consolidée
          </p>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
          Temps réel
        </span>
      </div>

      {/* ── L'ANNEAU DONUT CIRCULAIRE MULTICOLORE AVEC ESPACEMENTS NETS ── */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Piste de fond douce visible à travers les intervalles */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Segment 1 : Finances / Recouvrement (Indigo / Violet) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#6366F1"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg1Length} ${circumference}`}
              strokeDashoffset={offset1}
              strokeLinecap="round"
              className="transition-all duration-700"
            />

            {/* Segment 2 : Assiduité / Présences (Cyan / Sky) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#0EA5E9"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg2Length} ${circumference}`}
              strokeDashoffset={offset2}
              strokeLinecap="round"
              className="transition-all duration-700"
            />

            {/* Segment 3 : Pédagogie / Notes (Mint / Emerald) */}
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
              className="transition-all duration-700"
            />
          </svg>

          {/* Chiffre central impactant & épuré (Style Image 1 "+64%") */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl sm:text-[34px] font-black tracking-tight text-slate-900">
              +{globalScore}%
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5">
              Score global
            </span>
          </div>
        </div>
      </div>

      {/* ── LÉGENDE CATÉGORIES & STATS (Style Image 1 Instagram / Facebook / TikTok) ── */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
        {/* Item 1 : Recouvrement */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span>Recouvrement</span>
          </div>
          <p className="text-xs font-bold text-slate-900">
            {recoveryRate}%
          </p>
        </div>

        {/* Item 2 : Présences */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span>Présences</span>
          </div>
          <p className="text-xs font-bold text-slate-900">
            {attendanceRate}%
          </p>
        </div>

        {/* Item 3 : Pédagogie */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Saisie Notes</span>
          </div>
          <p className="text-xs font-bold text-slate-900">
            {academicRate}%
          </p>
        </div>
      </div>

      {/* Lien discret vers rapports complets */}
      <div className="pt-1 text-center">
        <Link
          href="/dashboard/admin/reports"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <span>Consulter le rapport analytique d&apos;école</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
