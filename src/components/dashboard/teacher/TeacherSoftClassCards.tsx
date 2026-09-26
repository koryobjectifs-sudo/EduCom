"use client";

import Link from "next/link";
import {
  Layers,
  BookOpen,
  ClipboardList,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
} from "lucide-react";
import type { TeacherDashboardSnapshot } from "@/lib/dashboard-teacher";

interface TeacherSoftClassCardsProps {
  classes: TeacherDashboardSnapshot["classes"];
  className?: string;
}

export default function TeacherSoftClassCards({
  classes,
  className = "",
}: TeacherSoftClassCardsProps) {
  return (
    <div
      className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-5 ${className}`}
    >
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-600" />
            <span>Mes Classes Assignées</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Détail des enseignements et avancement des évaluations
          </p>
        </div>

        <Link
          href="/dashboard/grades"
          className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors inline-flex items-center gap-1"
        >
          <span>Tout voir</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── LISTE DES CARTES DE CLASSES ── */}
      {classes.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
          <BookOpen className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aucune affectation active</p>
          <p className="text-xs text-slate-400 max-w-sm">
            L&apos;administration n&apos;a pas encore relié votre compte à une classe ou matière pour cette année.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {classes.map((c) => {
            const isComplete = c.progress ? c.progress.remaining === 0 : false;
            return (
              <div
                key={c.id}
                className="group rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between gap-3.5"
              >
                {/* Ligne 1 : Nom, badges et bouton principal */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                        {c.name}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {c.cycle === "MOYEN"
                          ? "Moyen"
                          : c.cycle === "SECONDAIRE"
                          ? "Secondaire"
                          : "Élémentaire"}
                      </span>
                      {c.isTitulaire && (
                        <span className="rounded-full bg-purple-50 border border-purple-200/70 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                          Titulaire
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.studentCount} élève{c.studentCount > 1 ? "s" : ""}</span>
                    </p>
                  </div>

                  <Link
                    href={c.link}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-full bg-sky-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all shrink-0"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>Saisir les notes</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Ligne 2 : Matières enseignées */}
                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Matières enseignées :
                  </span>
                  {c.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {c.subjects.map((s) => (
                        <Link
                          key={s.id}
                          href={`/dashboard/grades/secondaire?class=${c.id}&subject=${s.id}`}
                          className="inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-800 transition-all"
                        >
                          <BookOpen className="h-3 w-3 mr-1 text-slate-400" />
                          <span>{s.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 italic">Aucune matière affectée pour l&apos;instant</p>
                  )}
                </div>

                {/* Ligne 3 : Barre de progression des saisies */}
                {c.progress && (
                  <div className="border-t border-slate-100 pt-2.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">
                        {c.progress.termName} · {c.progress.entered}/{c.progress.total} note{c.progress.total > 1 ? "s" : ""}
                      </span>
                      <span
                        className={`font-bold inline-flex items-center gap-1 ${
                          isComplete ? "text-emerald-700" : "text-sky-700"
                        }`}
                      >
                        {isComplete ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Complet</span>
                          </>
                        ) : (
                          <span>{c.progress.remaining} restante{c.progress.remaining > 1 ? "s" : ""}</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-sky-500 to-indigo-600"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(3, c.progress.pct))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
