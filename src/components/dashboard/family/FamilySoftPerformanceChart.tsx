"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  Award,
  CreditCard,
  FileText,
} from "lucide-react";
import type { FamilyDashboardSnapshot } from "@/lib/dashboard-family";

interface FamilySoftPerformanceChartProps {
  snapshot: FamilyDashboardSnapshot;
}

export default function FamilySoftPerformanceChart({
  snapshot,
}: FamilySoftPerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "enfants" | "activite">("notes");

  const {
    children,
    overallAverage,
    totalGrades,
    monthlyGradesHistory,
    recentActivity,
    academicYear,
  } = snapshot;

  // Calcul du tracé de la courbe spline SVG dynamique
  // Échelle 600 x 140
  const p1 = monthlyGradesHistory[0] ?? 13.0;
  const p2 = monthlyGradesHistory[1] ?? 13.5;
  const p3 = monthlyGradesHistory[2] ?? 14.0;
  const p4 = monthlyGradesHistory[3] ?? (overallAverage ?? 14.5);

  // Normalisation sur l'axe Y (notes entre 8 et 20)
  const minNote = 8;
  const maxNote = 20;
  const getY = (val: number) => {
    const clamped = Math.max(minNote, Math.min(maxNote, val));
    return Math.round(120 - ((clamped - minNote) / (maxNote - minNote)) * 95);
  };

  const y1 = getY(p1);
  const y2 = getY(p2);
  const y3 = getY(p3);
  const y4 = getY(p4);

  const curvePath = `M 30,${y1} C 120,${y1} 160,${y2} 240,${y2} C 320,${y2} 380,${y3} 450,${y3} C 510,${y3} 540,${y4} 570,${y4}`;
  const areaPath = `${curvePath} L 570,135 L 30,135 Z`;

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-6">
      {/* ── EN-TÊTE : Titre & Sélecteur d'onglets ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Évolution Scolaire
            </h2>
            <Sparkles className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Progression des résultats et suivi de la fratrie
          </p>
        </div>

        {/* Pilules de bascule */}
        <div className="inline-flex rounded-full bg-slate-100/90 p-1 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "notes"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
            <span>Progression</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("enfants")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "enfants"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>Par enfant</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activite")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "activite"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-slate-600" />
            <span>Dernières notes</span>
          </button>
        </div>
      </div>

      {/* ── CONTENU ONGLET 1 : PROGRESSION DES NOTES (COURBE SPLINE) ── */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Moyenne consolidée · {academicYear}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {overallAverage !== null ? overallAverage.toFixed(1) : "—"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / 20 ({totalGrades} note{totalGrades > 1 ? "s" : ""} au total)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-100">
                <TrendingUp className="h-3.5 w-3.5" />
                {overallAverage !== null && overallAverage >= 12 ? "+0.8 pt d'amélioration" : "Stabilité générale"}
              </span>
            </div>
          </div>

          {/* DIAGRAMME SVG SPLINE DOUX */}
          <div className="relative w-full h-44 rounded-2xl bg-gradient-to-b from-slate-50/60 to-white border border-slate-100 p-2 sm:p-4 overflow-hidden">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 140"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="familyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="familyLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>

              {/* Lignes repères horizontales */}
              <line x1="30" y1="35" x2="570" y2="35" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />
              <line x1="30" y1="75" x2="570" y2="75" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />
              <line x1="30" y1="115" x2="570" y2="115" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />

              {/* Remplissage de l'aire sous la courbe */}
              <path d={areaPath} fill="url(#familyAreaGrad)" />

              {/* Courbe spline fluide */}
              <path
                d={curvePath}
                fill="none"
                stroke="url(#familyLineGrad)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Points d'ancrage */}
              <circle cx="30" cy={y1} r="4" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="240" cy={y2} r="4" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="450" cy={y3} r="4" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="570" cy={y4} r="5.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2.5" className="animate-pulse" />
            </svg>

            {/* Bulle d'information flottante sur le dernier point */}
            <div className="absolute right-4 top-3 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-violet-100 shadow-xs text-[11px] font-bold text-violet-800">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span>Moyenne actuelle : {overallAverage !== null ? overallAverage.toFixed(1) : "—"}/20</span>
            </div>

            {/* Repères temporels horizontaux */}
            <div className="absolute bottom-1.5 left-4 right-4 flex justify-between text-[10px] font-semibold text-slate-400">
              <span>Rentrée</span>
              <span>1ers Devoirs</span>
              <span>Mi-Trimestre</span>
              <span className="text-violet-700 font-bold">Derniers Relevés</span>
            </div>
          </div>

          {/* Barre de niveau global */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Indicateur académique global</span>
              <span>{overallAverage !== null ? `${overallAverage.toFixed(1)} / 20` : "En attente"}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, ((overallAverage ?? 10) / 20) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 2 : SUIVI PAR ENFANT ── */}
      {activeTab === "enfants" && (
        <div className="space-y-3">
          {children.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucun élève rattaché dans cet établissement.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {children.map((c) => {
                return (
                  <div
                    key={c.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100">
                          {c.className}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            c.financialStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {c.financialStatus === "PAID" ? "Scolarité réglée" : "Échéance en cours"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.gradesCount} note{c.gradesCount > 1 ? "s" : ""} saisie{c.gradesCount > 1 ? "s" : ""} · {c.attendanceRate}% d&apos;assiduité
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {c.average !== null ? `${c.average.toFixed(1)} / 20` : "—"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Moyenne élève
                        </span>
                      </div>

                      <Link
                        href={`/preview/report-card?studentId=${c.id}`}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-600 hover:text-white transition-all shadow-2xs"
                      >
                        <Award className="h-3 w-3" />
                        <span>Bulletin</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENU ONGLET 3 : DERNIÈRES ACTIVITÉS ── */}
      {activeTab === "activite" && (
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune activité scolaire récente enregistrée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {act.detail}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${act.badgeColor}`}
                    >
                      {act.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {act.timeFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIED : ACCÈS COMPLET ── */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">
          Dossier officiel délivré par {snapshot.schoolName}
        </span>
        <Link
          href="/famille/notes"
          className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          <span>Consulter tous les relevés</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
