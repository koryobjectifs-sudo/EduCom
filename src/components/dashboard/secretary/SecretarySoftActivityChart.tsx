"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Users,
  ClipboardCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import type { SecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";

interface SecretarySoftActivityChartProps {
  snapshot: SecretaryDashboardSnapshot;
}

export default function SecretarySoftActivityChart({
  snapshot,
}: SecretarySoftActivityChartProps) {
  const [activeTab, setActiveTab] = useState<"admissions" | "presence" | "journal">("admissions");

  const {
    kpis,
    weeklyAdmissionsHistory,
    classesAttendance,
    recentAdmissions,
    academicYear,
  } = snapshot;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  // Calcul du tracé de la courbe spline SVG dynamique
  // Échelle 600 x 140
  const w1 = weeklyAdmissionsHistory[0] ?? 0;
  const w2 = weeklyAdmissionsHistory[1] ?? 0;
  const w3 = weeklyAdmissionsHistory[2] ?? 0;
  const w4 = weeklyAdmissionsHistory[3] ?? 0;

  const maxVal = Math.max(1, w1, w2, w3, w4, kpis.totalStudents);
  const getY = (val: number) => Math.round(115 - (val / maxVal) * 90);

  const y1 = getY(w1);
  const y2 = getY(w3 > 0 ? (w1 + w2) / 2 : w1);
  const y3 = getY(w3);
  const y4 = getY(w4);

  const curvePath = `M 30,${y1} C 120,${y1} 160,${y2} 240,${y2} C 320,${y2} 380,${y3} 450,${y3} C 510,${y3} 540,${y4} 570,${y4}`;
  const areaPath = `${curvePath} L 570,135 L 30,135 Z`;

  // Compteurs d'appel
  const recordedClasses = classesAttendance.filter((c) => c.status === "RECORDED");
  const missingClasses = classesAttendance.filter((c) => c.status === "NOT_TAKEN");

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-6">
      {/* ── EN-TÊTE : Titre & Sélecteur d'onglets ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Activité Administrative & Inscriptions
            </h2>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamique des admissions, assiduité quotidienne et flux des élèves
          </p>
        </div>

        {/* Pilules de bascule */}
        <div className="inline-flex rounded-full bg-slate-100/90 p-1 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("admissions")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "admissions"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
            <span>Admissions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("presence")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "presence"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Appel ({kpis.classesRecordedCount}/{kpis.classesTotalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("journal")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
              activeTab === "journal"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-slate-600" />
            <span>Dernières admissions</span>
          </button>
        </div>
      </div>

      {/* ── CONTENU ONGLET 1 : COURBE SPLINE ADMISSIONS ── */}
      {activeTab === "admissions" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Effectif total scolarisé · {academicYear}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {fmt(kpis.totalStudents)} élèves
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  répartis sur {kpis.classesTotalCount} classes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100">
                <TrendingUp className="h-3.5 w-3.5" />
                +{kpis.newStudents30d} inscrits ce mois-ci
              </span>
            </div>
          </div>

          {/* DIAGRAMME SVG SPLINE DOUX */}
          <div className="relative w-full h-44 rounded-2xl bg-gradient-to-b from-sky-50/40 via-white to-white border border-slate-100 p-2 sm:p-4 overflow-hidden">
            <svg
              viewBox="0 0 600 140"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="secretaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Lignes de repère */}
              <line x1="30" y1="25" x2="570" y2="25" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1="70" x2="570" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1="115" x2="570" y2="115" stroke="#f1f5f9" />

              {/* Remplissage doux */}
              <path d={areaPath} fill="url(#secretaryGradient)" />

              {/* Tracé principal */}
              <path
                d={curvePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Points d'ancrage */}
              <circle cx="30" cy={y1} r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
              <circle cx="240" cy={y2} r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
              <circle cx="450" cy={y3} r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
              <circle cx="570" cy={y4} r="5.5" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="grid grid-cols-4 text-center text-xs font-semibold text-slate-400">
            <div>Semaine -3</div>
            <div>Semaine -2</div>
            <div>Semaine dernière</div>
            <div className="text-sky-700 font-bold">Cette semaine</div>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 2 : ASSIDUITÉ PAR CLASSE ── */}
      {activeTab === "presence" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              État de transmission de l&apos;appel du jour
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {kpis.classesRecordedCount} sur {kpis.classesTotalCount} classes traitées
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classesAttendance.slice(0, 9).map((cls) => {
              const isRecorded = cls.status === "RECORDED";
              return (
                <div
                  key={cls.classId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isRecorded
                      ? "bg-slate-50/70 border-slate-200/70"
                      : "bg-amber-50/40 border-amber-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {cls.className}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isRecorded
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200/60"
                      }`}
                    >
                      {isRecorded ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Appel fait
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                          En attente
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{cls.totalStudents} élèves</span>
                    {isRecorded ? (
                      <span className="font-semibold text-slate-700">
                        {cls.rate !== null ? `${cls.rate}% présents` : "Complet"}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">Non saisi</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-right">
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
            >
              <span>Accéder à la feuille d&apos;appel générale</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 3 : DERNIÈRES ADMISSIONS ── */}
      {activeTab === "journal" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Élèves récemment inscrits ou admis
            </span>
            <span className="text-xs text-slate-400">6 dernières entrées</span>
          </div>

          {recentAdmissions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune admission récente enregistrée.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAdmissions.map((s) => (
                <div
                  key={s.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2.5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 font-bold text-xs shrink-0">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {s.studentName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {s.className} {s.matricule ? `· Matr. ${s.matricule}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      {s.timeFormatted}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {s.status === "ACTIVE" ? "Inscrit" : "En cours"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 text-right">
            <Link
              href="/dashboard/students"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
            >
              <span>Voir tout l&apos;annuaire des élèves</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
