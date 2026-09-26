"use client";

import Link from "next/link";
import {
  ClipboardList,
  Users,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import type { TeacherDashboardSnapshot } from "@/lib/dashboard-teacher";

interface TeacherSoftKpiStripProps {
  snapshot: TeacherDashboardSnapshot;
}

export default function TeacherSoftKpiStrip({ snapshot }: TeacherSoftKpiStripProps) {
  const {
    classes,
    titulaireClasses,
    currentTermName,
    totalStudents,
    allSubjectsCount,
    totalEntered,
    totalExpected,
    totalRemaining,
    globalCompletionRate,
    upcomingEvaluations,
  } = snapshot;

  const isTitulaire = titulaireClasses.length > 0;
  const unrecordedTitulaire = titulaireClasses.filter((c) => !c.attendanceRecordedToday);
  const attendanceDone = isTitulaire && unrecordedTitulaire.length === 0;

  // Matières uniques
  const subjectNames = Array.from(
    new Set(classes.flatMap((c) => c.subjects.map((s) => s.name))),
  ).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARTE 1 : SAISIE DES NOTES DU TRIMESTRE ── */}
      <Link
        href="/dashboard/grades"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-sky-300 hover:shadow-[0_8px_24px_-4px_rgba(14,165,233,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Saisie des notes
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0">
            <ClipboardList className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {globalCompletionRate}%
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">complété</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                  totalRemaining === 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-sky-50 text-sky-700 border-sky-100/60"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                {totalRemaining === 0 ? "À jour" : `${totalRemaining} à saisir`}
              </span>
            </div>
          </div>

          {/* Mini histogramme de complétion */}
          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-3.5 bg-slate-100 rounded-full transition-all group-hover:h-4.5" />
            <span className="w-2 h-5 bg-slate-200 rounded-full transition-all group-hover:h-6" />
            <span className="w-2 h-4 bg-slate-150 rounded-full transition-all group-hover:h-5" />
            <span className="w-2 h-6.5 bg-slate-200 rounded-full transition-all group-hover:h-7.5" />
            <span
              className="w-2 rounded-full shadow-[0_2px_6px_rgba(14,165,233,0.30)] bg-gradient-to-t from-sky-600 to-indigo-600"
              style={{ height: `${Math.max(12, Math.min(32, Math.round((globalCompletionRate / 100) * 32)))}px` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-sky-600 transition-colors">
          <span>{totalEntered} / {totalExpected} notes · {currentTermName}</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 2 : MES CLASSES & EFFECTIFS ── */}
      <Link
        href="/dashboard/classes"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-indigo-300 hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Mes classes
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {classes.length}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">
                classe{classes.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-100/60">
                {totalStudents} élève{totalStudents > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Mini barres représentatives des classes */}
          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            {classes.slice(0, 5).map((c, i) => {
              const h = Math.max(10, Math.min(30, Math.round((c.studentCount / 40) * 30)));
              return (
                <span
                  key={c.id}
                  className={`w-2 rounded-full transition-all ${
                    c.isTitulaire
                      ? "bg-gradient-to-t from-indigo-600 to-violet-500 shadow-2xs"
                      : "bg-slate-200 group-hover:bg-indigo-300"
                  }`}
                  style={{ height: `${h}px` }}
                  title={`${c.name}: ${c.studentCount} élèves`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
          <span>
            {titulaireClasses.length > 0
              ? `${titulaireClasses.length} classe titulaire`
              : "Affectations pédagogiques"}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 3 : MATIÈRES ENSEIGNÉES ── */}
      <Link
        href="/dashboard/grades"
        className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-violet-300 hover:shadow-[0_8px_24px_-4px_rgba(139,92,246,0.12)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Disciplines
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
              {allSubjectsCount}
              <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">
                matière{allSubjectsCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-100/60 truncate max-w-[150px]">
                {subjectNames.join(", ") || "Général"}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
            <span className="w-2 h-4 bg-slate-100 rounded-full group-hover:h-5 transition-all" />
            <span className="w-2 h-6 bg-slate-200 rounded-full group-hover:h-7 transition-all" />
            <span className="w-2 h-8 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-full shadow-[0_2px_6px_rgba(139,92,246,0.30)]" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-violet-600 transition-colors">
          <span>Programme & barèmes</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </Link>

      {/* ── CARTE 4 : APPEL DU JOUR (SI TITULAIRE) OU ÉVALUATIONS ── */}
      {isTitulaire ? (
        <Link
          href={`/dashboard/attendance${unrecordedTitulaire.length > 0 ? `?classId=${unrecordedTitulaire[0].id}` : ""}`}
          className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-emerald-300 hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Appel titulaire
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0 ${
                attendanceDone
                  ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                  : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
              }`}
            >
              {attendanceDone ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </div>
          </div>

          <div className="my-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                {attendanceDone ? "Validé" : "À faire"}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                    attendanceDone
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                      : "bg-amber-50 text-amber-700 border-amber-100/60"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      attendanceDone ? "bg-emerald-500" : "bg-amber-500 animate-ping"
                    }`}
                  />
                  {attendanceDone ? "100% enregistré" : "Action requise"}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
              <span className="w-2 h-5 bg-slate-100 rounded-full" />
              <span className="w-2 h-6.5 bg-slate-200 rounded-full" />
              <span
                className={`w-2 h-8 rounded-full ${
                  attendanceDone
                    ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_2px_6px_rgba(16,185,129,0.30)]"
                    : "bg-gradient-to-t from-amber-500 to-orange-400 shadow-[0_2px_6px_rgba(245,158,11,0.30)]"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
            <span>{titulaireClasses.map((c) => c.name).join(", ")}</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      ) : (
        <Link
          href="/dashboard/grades"
          className="group relative flex flex-col justify-between rounded-xl bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] border border-slate-200/70 hover:border-emerald-300 hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Évaluations à venir
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="my-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                {upcomingEvaluations.length}
                <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">programmée{upcomingEvaluations.length > 1 ? "s" : ""}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100/60">
                  {upcomingEvaluations[0]?.dateFormatted
                    ? `Prochaine : ${upcomingEvaluations[0].dateFormatted}`
                    : "Calendrier scolaire"}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-1.5 h-8 pb-0.5 shrink-0">
              <span className="w-2 h-4 bg-slate-100 rounded-full" />
              <span className="w-2 h-5.5 bg-slate-200 rounded-full" />
              <span className="w-2 h-8 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-full shadow-[0_2px_6px_rgba(16,185,129,0.30)]" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
            <span>Calendrier trimestriel</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </Link>
      )}
    </div>
  );
}
