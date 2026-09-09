"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  School,
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Plus,
  Layers,
  ArrowRight,
} from "lucide-react";

interface PedagogyAccordionViewProps {
  summary: {
    classesCount: number;
    studentsCount: number;
    weightedSubjectsCount: number;
    coveredClassesCount: number;
    termsCount: number;
    nextExamFormatted: string | null;
    teachersCount: number;
    assignedClassesCount: number;
  };
  children: {
    programme: React.ReactNode;
    calendar: React.ReactNode;
    assignments: React.ReactNode;
  };
  classesList: { id: string; name: string; cycle: string; studentCount: number }[];
}

export default function PedagogyAccordionView({
  summary,
  children,
  classesList,
}: PedagogyAccordionViewProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    classes: false,
    programme: false,
    calendar: false,
    assignments: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      {/* ── EN-TÊTE D'ACTION RAPIDE : ASSISTANT D'INSTALLATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 px-5 border border-blue-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-[#0E2541]">
              Assistant d&apos;installation rapide
            </p>
            <p className="text-[11px] text-slate-500">
              Réinitialisez ou ajustez les classes, programmes et trimestres en 3 écrans guidés.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings/pedagogie/wizard"
          className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 text-[#0E2541] hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors"
        >
          <span>Lancer l&apos;assistant</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 1 : CLASSES ET NIVEAUX
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("classes")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <School className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Classes et niveaux</h3>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                  {summary.classesCount} classes
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                {summary.classesCount} classes configurées · {summary.studentsCount} élèves inscrits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-slate-400">
              {openSections.classes ? "Replier" : "Modifier"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                openSections.classes ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openSections.classes && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-4">
              {classesList.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.cycle}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {c.studentCount} élève{c.studentCount > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/dashboard/classes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Gérer les classes et niveaux</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2 : PROGRAMME ET COEFFICIENTS
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("programme")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Programme et coefficients</h3>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
                  {summary.weightedSubjectsCount} matières
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                {summary.weightedSubjectsCount} matières pondérées · {summary.coveredClassesCount} classes concernées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-slate-400">
              {openSections.programme ? "Replier" : "Modifier"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                openSections.programme ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openSections.programme && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100">
            <div className="pt-4">{children.programme}</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 3 : CALENDRIER DE L'ANNÉE
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("calendar")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Calendrier de l&apos;année</h3>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
                  {summary.termsCount} trimestres
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                {summary.termsCount} trimestres
                {summary.nextExamFormatted ? ` · prochaine composition le ${summary.nextExamFormatted}` : " · trimestres datés"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-slate-400">
              {openSections.calendar ? "Replier" : "Modifier"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                openSections.calendar ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openSections.calendar && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100">
            <div className="pt-4">{children.calendar}</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 4 : ENSEIGNANTS ET AFFECTATIONS
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("assignments")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Enseignants et affectations</h3>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/60">
                  {summary.teachersCount} enseignants
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                {summary.teachersCount} enseignants · {summary.assignedClassesCount}/{summary.classesCount} classes couvertes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-slate-400">
              {openSections.assignments ? "Replier" : "Modifier"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                openSections.assignments ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openSections.assignments && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100">
            <div className="pt-4">{children.assignments}</div>
          </div>
        )}
      </div>
    </div>
  );
}
