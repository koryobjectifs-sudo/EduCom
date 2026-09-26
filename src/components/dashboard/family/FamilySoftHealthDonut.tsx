"use client";

import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import type { FamilyDashboardSnapshot } from "@/lib/dashboard-family";

interface FamilySoftHealthDonutProps {
  snapshot: FamilyDashboardSnapshot;
}

export default function FamilySoftHealthDonut({ snapshot }: FamilySoftHealthDonutProps) {
  const {
    overallAverage,
    overallAttendanceRate,
    financialSummary,
    pendingActionsCount,
    healthScore,
  } = snapshot;

  const notesScore = Math.min(100, Math.round(((overallAverage ?? 14) / 20) * 100));
  const attendanceScore = overallAttendanceRate;
  const financeScore = financialSummary.paymentRate;

  // Mathématiques de l'anneau circulaire SVG calibré avec espacements nets (identique Directeur & Enseignant)
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~376.99

  const visibleGap = 12;
  const capCompensation = strokeWidth; // 12px
  const gap = visibleGap + capCompensation; // 24px entre centres

  const totalGaps = 3 * gap; // 72px
  const availableLength = circumference - totalGaps; // ~305px

  // Répartition des 3 piliers
  const seg1Length = availableLength * 0.44; // Résultats Scolaires (Violet)
  const seg2Length = availableLength * 0.36; // Assiduité (Emerald)
  const seg3Length = availableLength * 0.20; // Démarches & Écolage (Sky)

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
            <span>Sérénité Scolaire</span>
            <Sparkles className="h-4 w-4 text-violet-500" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Indice de santé globale de la scolarité
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

            {/* Arc 1 : Résultats Scolaires (Violet / Indigo) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg1Length} ${circumference}`}
              strokeDashoffset={offset1}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Arc 2 : Assiduité & Présences (Emerald / Teal) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg2Length} ${circumference}`}
              strokeDashoffset={offset2}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Arc 3 : Démarches & Écolage (Sky / Cyan) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#0EA5E9"
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
              {healthScore}%
            </span>
            <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              {healthScore >= 80 ? "Excellente" : "En ordre"}
            </span>
          </div>
        </div>
      </div>

      {/* ── LÉGENDE DES 3 PILIERS FAMILIAUX ── */}
      <div className="space-y-2.5 pt-1">
        {/* Pilier 1 : Résultats scolaires */}
        <Link
          href="/famille/notes"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-violet-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-violet-600 transition-colors truncate">
                Travail & Résultats
              </p>
              <p className="text-[11px] text-slate-400">
                Moyenne : {overallAverage !== null ? `${overallAverage.toFixed(1)} / 20` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-900">{notesScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
        </Link>

        {/* Pilier 2 : Assiduité & Présences */}
        <Link
          href="/famille/enfants"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                Assiduité en classe
              </p>
              <p className="text-[11px] text-slate-400">
                Ponctualité et présence régulière
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-900">{attendanceScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
        </Link>

        {/* Pilier 3 : Démarches & Écolage */}
        <Link
          href="/famille/paiements"
          className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 rounded-full bg-sky-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                Régularité administrative
              </p>
              <p className="text-[11px] text-slate-400">
                {pendingActionsCount === 0 ? "Dossier et écolages à jour" : `${pendingActionsCount} démarche(s) à finaliser`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-900">{financeScore}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
