"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ClipboardList,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import type { TeacherDashboardSnapshot } from "@/lib/dashboard-teacher";

interface TeacherSoftPerformanceChartProps {
  snapshot: TeacherDashboardSnapshot;
}

export default function TeacherSoftPerformanceChart({
  snapshot,
}: TeacherSoftPerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<"progression" | "classes" | "recent">("progression");

  const {
    classes,
    currentTermName,
    totalEntered,
    totalExpected,
    totalRemaining,
    globalCompletionRate,
    weeklyGradesHistory,
    recentGrades,
  } = snapshot;

  // Calcul du tracé de la courbe spline SVG dynamique
  // Échelle 600 x 140
  const w1 = weeklyGradesHistory[0] ?? 0;
  const w2 = weeklyGradesHistory[1] ?? 0;
  const w3 = weeklyGradesHistory[2] ?? 0;
  const w4 = weeklyGradesHistory[3] ?? 0;

  // Normalisation sur l'axe Y (de y=115 à y=25)
  const maxWeekly = Math.max(1, w1, w2, w3, w4, totalExpected);
  const getY = (val: number) => Math.round(115 - (val / maxWeekly) * 90);

  const y1 = getY(w1);
  const y2 = getY(w2);
  const y3 = getY(w3);
  const y4 = getY(w4);

  const curvePath = `M 30,${y1} C 120,${y1} 160,${y2} 240,${y2} C 320,${y2} 380,${y3} 450,${y3} C 510,${y3} 540,${y4} 570,${y4}`;
  const areaPath = `${curvePath} L 570,135 L 30,135 Z`;

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-6">
      {/* ── EN-TÊTE : Titre & Sélecteur d'onglets ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Avancement Pédagogique
            </h2>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des évaluations et complétion des notes
          </p>
        </div>

        {/* Pilules de bascule */}
        <div className="inline-flex rounded-full bg-slate-100/90 p-1 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("progression")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "progression"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
            <span>Progression</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "classes"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>Par classe</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("recent")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "recent"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-slate-600" />
            <span>Dernières notes</span>
          </button>
        </div>
      </div>

      {/* ── CONTENU ONGLET 1 : PROGRESSION GLOBALE (COURBE SPLINE) ── */}
      {activeTab === "progression" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Volume de saisies · {currentTermName}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {totalEntered}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {totalExpected} notes attendues
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  totalRemaining === 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-sky-50 text-sky-700 border-sky-100"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {globalCompletionRate}% accompli
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
                <linearGradient id="teacherAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#0EA5E9" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="teacherLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>

              {/* Lignes de repère douces */}
              <line x1="30" y1="35" x2="570" y2="35" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />
              <line x1="30" y1="75" x2="570" y2="75" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />
              <line x1="30" y1="115" x2="570" y2="115" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.7" />

              {/* Remplissage doux */}
              <path d={areaPath} fill="url(#teacherAreaGrad)" />

              {/* Courbe spline */}
              <path
                d={curvePath}
                fill="none"
                stroke="url(#teacherLineGrad)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Points d'ancrage */}
              <circle cx="30" cy={y1} r="4" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="240" cy={y2} r="4" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="450" cy={y3} r="4" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="570" cy={y4} r="5.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2.5" className="animate-pulse" />
            </svg>

            {/* Bulle d'information flottante sur le dernier point */}
            <div className="absolute right-4 top-3 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-sky-100 shadow-xs text-[11px] font-bold text-sky-800">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>{globalCompletionRate}% complété</span>
            </div>

            {/* Repères temporels horizontaux */}
            <div className="absolute bottom-1.5 left-4 right-4 flex justify-between text-[10px] font-semibold text-slate-400">
              <span>Semaine -3</span>
              <span>Semaine -2</span>
              <span>Semaine dernière</span>
              <span className="text-sky-700 font-bold">Cette semaine</span>
            </div>
          </div>

          {/* Barre de progression avec repères */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Progression globale</span>
              <span>{totalRemaining === 0 ? "Complète" : `${totalRemaining} notes restantes`}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, globalCompletionRate))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 2 : SUIVI PAR CLASSE ── */}
      {activeTab === "classes" && (
        <div className="space-y-3">
          {classes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune classe assignée pour cette année scolaire.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {classes.map((c) => {
                const pct = c.progress?.pct ?? 0;
                const isComplete = c.progress ? c.progress.remaining === 0 : false;
                return (
                  <div
                    key={c.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                          {c.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {c.cycle === "MOYEN" ? "Moyen" : c.cycle === "SECONDAIRE" ? "Secondaire" : "Élémentaire"}
                        </span>
                        {c.isTitulaire && (
                          <span className="rounded-full bg-purple-50 border border-purple-200/70 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            Titulaire
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {c.studentCount} élèves · {c.subjects.map((s) => s.name).join(", ") || "Toutes matières"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800 block">
                          {c.progress ? `${c.progress.entered}/${c.progress.total}` : "—"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            isComplete ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {isComplete ? "100% à jour" : `${pct}% fait`}
                        </span>
                      </div>

                      <Link
                        href={c.link}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-sky-50 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-600 hover:text-white transition-all shadow-2xs"
                      >
                        <span>Saisir</span>
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

      {/* ── CONTENU ONGLET 3 : DERNIÈRES SAISIES ── */}
      {activeTab === "recent" && (
        <div className="space-y-3">
          {recentGrades.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune note enregistrée récemment dans vos classes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentGrades.map((g) => {
                const isGood = g.value >= (g.max / 2);
                return (
                  <div
                    key={g.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {g.studentName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {g.className} · {g.subjectName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${
                          isGood
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {g.value} / {g.max}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {g.timeFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PIED : ACCÈS COMPLET ── */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">
          Rattachement officiel · {snapshot.academicYear}
        </span>
        <Link
          href="/dashboard/grades"
          className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800 transition-colors"
        >
          <span>Accéder au cahier de notes</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
