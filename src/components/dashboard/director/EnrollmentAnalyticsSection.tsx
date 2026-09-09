"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  ArrowRight,
  School,
  UserCheck,
  AlertCircle,
  BarChart3,
  LayoutGrid,
  TrendingUp,
  Layers,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Baby,
  Backpack,
  Building2,
} from "lucide-react";
import type { EnrollmentData } from "@/lib/dashboard-director";

interface EnrollmentAnalyticsSectionProps {
  enrollment: EnrollmentData;
}

const CYCLE_CONFIG: Record<string, { label: string; color: string; bgGradient: string; textClass: string; barGradient: string }> = {
  MATERNELLE: {
    label: "Maternelle",
    color: "#F59E0B",
    bgGradient: "from-amber-500 to-orange-500",
    textClass: "text-amber-700 bg-amber-50 border-amber-200",
    barGradient: "from-amber-400 to-orange-500",
  },
  ELEMENTAIRE: {
    label: "Élémentaire",
    color: "#2563EB",
    bgGradient: "from-blue-600 to-indigo-600",
    textClass: "text-blue-700 bg-blue-50 border-blue-200",
    barGradient: "from-blue-500 via-indigo-500 to-indigo-600",
  },
  COLLEGE: {
    label: "Collège",
    color: "#0D9488",
    bgGradient: "from-teal-600 to-emerald-600",
    textClass: "text-teal-700 bg-teal-50 border-teal-200",
    barGradient: "from-teal-500 to-emerald-600",
  },
  LYCEE: {
    label: "Lycée",
    color: "#7C3AED",
    bgGradient: "from-purple-600 to-violet-600",
    textClass: "text-purple-700 bg-purple-50 border-purple-200",
    barGradient: "from-purple-500 to-violet-600",
  },
  AUTRE: {
    label: "Autre",
    color: "#64748B",
    bgGradient: "from-slate-500 to-slate-600",
    textClass: "text-slate-700 bg-slate-50 border-slate-200",
    barGradient: "from-slate-400 to-slate-600",
  },
};

export default function EnrollmentAnalyticsSection({ enrollment }: EnrollmentAnalyticsSectionProps) {
  const {
    totalActive,
    pendingAdmissions,
    newIn30Days,
    classesCount,
    activeClassesCount,
    emptyClassesCount,
    averageStudentsPerActiveClass,
    studentTeacherRatio,
    assignedTeachersCount,
    cycleDistribution,
    classesOccupancy,
  } = enrollment;

  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"chart" | "grid">("chart");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "empty">("all");

  // Maximum d'élèves pour calibrer les barres visuelles
  const maxClassStudents = Math.max(1, ...classesOccupancy.map((c) => c.studentCount));
  const avgStudents = averageStudentsPerActiveClass || 0;
  const avgMarkerPercent = maxClassStudents > 0 ? Math.min(100, Math.round((avgStudents / maxClassStudents) * 100)) : 0;

  // Filtrage des classes
  const filteredClasses = useMemo(() => {
    let list = [...classesOccupancy];

    if (selectedCycleFilter !== "ALL") {
      list = list.filter((c) => c.cycle === selectedCycleFilter);
    }

    if (statusFilter === "active") {
      list = list.filter((c) => c.hasStudents);
    } else if (statusFilter === "empty") {
      list = list.filter((c) => !c.hasStudents);
    }

    return list;
  }, [classesOccupancy, selectedCycleFilter, statusFilter]);

  return (
    <section className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-4">
      {/* ── 1. EN-TÊTE DE SECTION ÉPURÉ ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-blue-50 text-primary border border-blue-100 shadow-2xs">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
                Effectifs & Répartition par Classe
              </h2>
              <span className="hidden sm:inline-flex items-center rounded-pill bg-blue-50 px-2 py-0.2 text-[10.5px] font-semibold text-primary border border-blue-100">
                {totalActive} élèves
              </span>
            </div>
            <p className="text-role-meta text-text-soft mt-0.5">
              Distribution des élèves par cycle et par niveau
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/students"
            className="inline-flex h-7.5 items-center gap-1 rounded-control border border-rule bg-surface hover:bg-sunk px-2.5 text-xs font-semibold text-text transition-colors shadow-2xs"
          >
            <span>Annuaire</span>
            <ArrowRight className="h-3 w-3 text-text-faint" />
          </Link>
          <Link
            href="/dashboard/classes"
            className="inline-flex h-7.5 items-center gap-1 rounded-control bg-primary hover:bg-primary-hover px-2.5 text-xs font-semibold text-white transition-colors shadow-2xs"
          >
            <span>Gestion des classes</span>
          </Link>
        </div>
      </div>

      {/* ── 2. KPI STRIP MODERNE (LUMINEUX & HARMONIEUX) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. Total Actifs */}
        <div className="relative overflow-hidden rounded-control bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-surface p-3 border border-blue-100 shadow-2xs">
          <span className="text-[10.5px] font-bold text-blue-900/70 uppercase tracking-wider">
            Total Actifs
          </span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-text tabular-nums">
              {totalActive}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-pill bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-700 border border-emerald-200">
              <TrendingUp className="h-2 w-2" />
              {newIn30Days > 0 ? `+${newIn30Days} ce mois` : "Stable"}
            </span>
            {pendingAdmissions > 0 && (
              <span className="text-[9.5px] text-amber-700 font-medium">
                · {pendingAdmissions} en attente
              </span>
            )}
          </div>
        </div>

        {/* 2. Classes */}
        <div className="relative overflow-hidden rounded-control bg-sunk/60 p-3 border border-rule shadow-2xs">
          <span className="text-[10.5px] font-bold text-text-soft uppercase tracking-wider">
            Classes
          </span>
          <p className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-text tabular-nums">
            {classesCount}
          </p>
          <p className="mt-1 text-[10.5px] text-text-soft flex items-center gap-1">
            <span className="font-semibold text-emerald-700">{activeClassesCount} actives</span>
            <span>·</span>
            <span className={emptyClassesCount > 0 ? "text-amber-600 font-medium" : "text-text-faint"}>
              {emptyClassesCount} vide{emptyClassesCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>

        {/* 3. Moyenne / Classe active */}
        <div className="relative overflow-hidden rounded-control bg-sunk/60 p-3 border border-rule shadow-2xs">
          <span className="text-[10.5px] font-bold text-text-soft uppercase tracking-wider">
            Moyenne / Classe
          </span>
          <p className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-text tabular-nums">
            {averageStudentsPerActiveClass !== null ? averageStudentsPerActiveClass : "—"}
          </p>
          <p className="mt-1 text-[10.5px] text-text-soft">
            Élèves par classe occupée
          </p>
        </div>

        {/* 4. Ratio Élèves / Enseignant */}
        <div className="relative overflow-hidden rounded-control bg-sunk/60 p-3 border border-rule shadow-2xs">
          <span className="text-[10.5px] font-bold text-text-soft uppercase tracking-wider">
            Ratio Élèves / Prof
          </span>
          <p className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-text tabular-nums">
            {studentTeacherRatio !== null ? `${studentTeacherRatio} : 1` : "—"}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {assignedTeachersCount > 0 ? (
              <span className="text-[10.5px] text-emerald-700 font-medium flex items-center gap-1">
                <UserCheck className="h-2.5 w-2.5" />
                {assignedTeachersCount} prof{assignedTeachersCount > 1 ? "s" : ""}
              </span>
            ) : (
              <Link
                href="/dashboard/classes?filter=unassigned"
                className="text-[10.5px] text-amber-700 hover:underline font-semibold flex items-center gap-0.5"
              >
                <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
                <span>0 titulaire</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. VISUALISATION DE LA RÉPARTITION PAR CYCLE (MULTI-SEGMENT BAR) ── */}
      {cycleDistribution.length > 0 && (
        <div className="rounded-2xl bg-slate-50/60 p-4 border border-slate-200/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Répartition par cycle d&apos;enseignement</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {totalActive} élèves au total
            </span>
          </div>

          {/* Multi-segment distribution bar */}
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            {cycleDistribution.map((cy) => {
              const cfg = CYCLE_CONFIG[cy.cycle] || CYCLE_CONFIG.AUTRE;
              const pct = totalActive > 0 ? Math.round((cy.studentsCount / totalActive) * 100) : 0;
              if (pct === 0 && cy.studentsCount === 0) return null;

              return (
                <div
                  key={cy.cycle}
                  className={`h-full bg-gradient-to-r ${cfg.barGradient} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${Math.max(pct, cy.studentsCount > 0 ? 4 : 0)}%` }}
                  title={`${cy.label} : ${cy.studentsCount} élèves (${pct}%)`}
                />
              );
            })}
          </div>

          {/* Pastilles interactives de filtrage rapide par cycle */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCycleFilter("ALL")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                selectedCycleFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Tous les cycles</span>
              <span className="rounded-full bg-slate-200/60 px-1.5 py-0.2 text-[10px]">
                {classesCount}
              </span>
            </button>

            {cycleDistribution.map((cy) => {
              const cfg = CYCLE_CONFIG[cy.cycle] || CYCLE_CONFIG.AUTRE;
              const isSelected = selectedCycleFilter === cy.cycle;
              const pct = totalActive > 0 ? Math.round((cy.studentsCount / totalActive) * 100) : 0;

              return (
                <button
                  key={cy.cycle}
                  type="button"
                  onClick={() => setSelectedCycleFilter(isSelected ? "ALL" : cy.cycle)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                    isSelected
                      ? `bg-gradient-to-r ${cfg.bgGradient} text-white shadow-xs ring-2 ring-blue-400/40`
                      : `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50`
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: isSelected ? "#ffffff" : cfg.color }}
                  />
                  <span>{cy.label}</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {cy.studentsCount} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. BARRE DE COMMANDE & BASCULE DE VUE (CHART / GRID) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Effectif par classe
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs font-semibold text-slate-600">
            {filteredClasses.length} classe{filteredClasses.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre d'occupation */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
              }`}
            >
              Toutes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                statusFilter === "active" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
              }`}
            >
              Avec élèves
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("empty")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                statusFilter === "empty" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
              }`}
            >
              Vides
            </button>
          </div>

          {/* Bascule Mode Graphique / Mode Cartes */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "chart" ? "bg-white text-primary shadow-2xs" : "hover:text-slate-900"
              }`}
              title="Vue graphique de comparaison"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white text-primary shadow-2xs" : "hover:text-slate-900"
              }`}
              title="Vue cartes"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. VUE 1 : GRAPHIQUE DE DISTRIBUTION COMPARATIF (CHART VIEW) ── */}
      {viewMode === "chart" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Ligne d'en-tête du graphique avec repère de moyenne */}
          <div className="hidden sm:flex items-center justify-between text-[11px] font-semibold text-slate-400 px-2 pb-1 border-b border-slate-100">
            <span className="w-1/3">Classe & Titulaire</span>
            <div className="w-1/2 relative">
              <span>Répartition relative</span>
              {avgStudents > 0 && (
                <span
                  className="absolute text-slate-500 font-medium -top-0.5 transform -translate-x-1/2 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]"
                  style={{ left: `${avgMarkerPercent}%` }}
                >
                  Moyenne : {avgStudents}
                </span>
              )}
            </div>
            <span className="w-24 text-right">Effectif</span>
          </div>

          {filteredClasses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune classe ne correspond à ces critères.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClasses.map((cls) => {
                const cfg = CYCLE_CONFIG[cls.cycle] || CYCLE_CONFIG.AUTRE;
                const relativeWidth = maxClassStudents > 0
                  ? Math.round((cls.studentCount / maxClassStudents) * 100)
                  : 0;

                return (
                  <div
                    key={cls.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Infos Classe */}
                    <div className="w-full sm:w-1/3 flex items-center gap-2.5">
                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${cfg.textClass}`}>
                        {cls.cycle}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/classes/${cls.id}`}
                          className="font-bold text-xs sm:text-sm text-slate-900 hover:text-primary transition-colors truncate block"
                        >
                          {cls.name}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate">
                          {cls.teacherName ? (
                            <span className="text-slate-600 font-medium">{cls.teacherName}</span>
                          ) : (
                            <Link
                              href="/dashboard/classes?filter=unassigned"
                              className="text-amber-700 hover:underline font-semibold"
                            >
                              Titulaire à désigner
                            </Link>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Barre de comparaison dynamique */}
                    <div className="w-full sm:w-1/2 relative py-1">
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden relative">
                        {cls.hasStudents ? (
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${cfg.barGradient} transition-all duration-500`}
                            style={{ width: `${Math.max(relativeWidth, 4)}%` }}
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-50 border border-dashed border-slate-200 rounded-full" />
                        )}
                      </div>

                      {/* Repère de moyenne verticale */}
                      {avgStudents > 0 && maxClassStudents > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-300 pointer-events-none hidden sm:block"
                          style={{ left: `${avgMarkerPercent}%` }}
                          title={`Moyenne : ${avgStudents} élèves`}
                        />
                      )}
                    </div>

                    {/* Chiffre effectif & part de l'école */}
                    <div className="w-full sm:w-24 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                        {cls.studentCount} <span className="text-[11px] font-normal text-slate-500">élèves</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                        {cls.hasStudents ? `${cls.shareOfSchool}% de l'école` : "Classe vide"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 6. VUE 2 : GRILLE DE CARTES MODERNES (GRID VIEW) ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">
              Aucune classe ne correspond à ces critères.
            </div>
          ) : (
            filteredClasses.map((cls) => {
              const cfg = CYCLE_CONFIG[cls.cycle] || CYCLE_CONFIG.AUTRE;
              const relativeBarWidth = maxClassStudents > 0
                ? Math.round((cls.studentCount / maxClassStudents) * 100)
                : 0;

              return (
                <div
                  key={cls.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    cls.hasStudents
                      ? "bg-white border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs"
                      : "bg-slate-50/40 border-dashed border-slate-200 text-slate-400"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/classes/${cls.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-primary transition-colors"
                        >
                          {cls.name}
                        </Link>
                        <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${cfg.textClass}`}>
                          {cls.cycle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        Titulaire :{" "}
                        {cls.teacherName ? (
                          <span className="font-semibold text-slate-700">{cls.teacherName}</span>
                        ) : (
                          <Link
                            href="/dashboard/classes?filter=unassigned"
                            className="italic text-amber-700 font-semibold hover:underline"
                          >
                            Non désigné
                          </Link>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {cls.studentCount}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          élève{cls.studentCount > 1 ? "s" : ""}
                        </span>
                      </span>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 tabular-nums">
                        {cls.hasStudents ? `${cls.shareOfSchool}% de l'école` : "Classe vide"}
                      </p>
                    </div>
                  </div>

                  {/* Barre de répartition proportionnelle */}
                  <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cfg.barGradient} transition-all duration-500`}
                      style={{ width: `${Math.max(relativeBarWidth, cls.hasStudents ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
