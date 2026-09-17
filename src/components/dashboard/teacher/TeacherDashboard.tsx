"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";
import type { TeacherDashboardSnapshot } from "@/lib/dashboard-teacher";

interface TeacherDashboardProps {
  snapshot: TeacherDashboardSnapshot;
}

export default function TeacherDashboard({ snapshot }: TeacherDashboardProps) {
  const {
    teacherName,
    academicYear,
    todayFormatted,
    titulaireClasses,
    classes,
    upcomingEvaluations,
  } = snapshot;

  // Calculs synthétiques
  const unrecordedTitulaire = titulaireClasses.filter((c) => !c.attendanceRecordedToday);
  const totalClasses = classes.length;
  const allSubjectsCount = new Set(classes.flatMap((c) => c.subjects.map((s) => s.id))).size;
  const totalRemaining = classes.reduce((sum, c) => sum + (c.progress?.remaining ?? 0), 0);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* ── EN-TÊTE ACCUEIL ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-pill bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 mb-2 border border-sky-100">
              <Sparkles className="h-3 w-3" /> Espace Enseignant · {academicYear}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">
              Bonjour, {teacherName}
            </h1>
            <p className="text-xs text-gray-500 mt-1 capitalize">
              {todayFormatted}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/grades"
              className="inline-flex items-center gap-1.5 rounded-control bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Accéder aux saisies &rarr;
            </Link>
          </div>
        </div>

        {/* ── BANDEAU APPEL DU JOUR (SI TITULAIRE) ── */}
        {titulaireClasses.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            {unrecordedTitulaire.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-amber-800" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Appel du jour à faire : {unrecordedTitulaire.map((c) => c.name).join(", ")}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Enregistrez les présences de votre classe pour la journée en cours.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/attendance?classId=${unrecordedTitulaire[0].id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 transition-colors shrink-0"
                >
                  Faire l&apos;appel &rarr;
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Appel du jour validé pour {titulaireClasses.map((c) => c.name).join(", ")}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CHIFFRES CLÉS ENSEIGNANT (AUCUN CHIFFRE FINANCIER) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Mes classes</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalClasses}</p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Affectations actives</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Mes matières</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{allSubjectsCount}</p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Enseignées au total</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Saisies en attente</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalRemaining > 0 ? (
              <span className="text-amber-700">{totalRemaining}</span>
            ) : (
              <span className="text-emerald-700">0</span>
            )}
          </p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">
            {totalRemaining > 0 ? "Notes à compléter" : "Toutes saisies à jour"}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Évaluations à venir</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingEvaluations.length}</p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Sur le calendrier</span>
        </div>
      </div>

      {/* ── CORPS DU TABLEAU DE BORD : CLASSES & ÉVALUATIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) : Mes Classes & Saisies */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600" />
              Mes classes et avancement des saisies
            </h2>
            <Link
              href="/dashboard/grades"
              className="text-xs font-semibold text-sky-600 hover:underline"
            >
              Vue complète &rarr;
            </Link>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">Aucune affectation active</p>
              <p className="text-xs text-gray-500 mt-1">
                L&apos;administration ne vous a pas encore rattaché de classe ou de matière pour cette année.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-sky-300 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                        <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                          {c.cycle === "MOYEN" ? "Moyen" : c.cycle === "SECONDAIRE" ? "Secondaire" : "Élémentaire"}
                        </span>
                        {c.isTitulaire && (
                          <span className="rounded-pill bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            Titulaire
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.studentCount} élève{c.studentCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    <Link
                      href={c.link}
                      className="inline-flex items-center gap-1.5 rounded-control bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shrink-0"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Saisir les notes &rarr;
                    </Link>
                  </div>

                  {/* Matières affectées */}
                  <div className="border-t border-gray-100 pt-2.5">
                    <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                      Matières enseignées :
                    </span>
                    {c.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {c.subjects.map((s) => (
                          <Link
                            key={s.id}
                            href={`/dashboard/grades/secondaire?class=${c.id}&subject=${s.id}`}
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-800 transition-all"
                          >
                            <BookOpen className="h-3 w-3 mr-1 text-gray-400" />
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 italic">Aucune matière affectée pour l&apos;instant</p>
                    )}
                  </div>

                  {/* Barre de progression des saisies */}
                  {c.progress && (
                    <div className="border-t border-gray-100 pt-2.5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-800">
                          {c.progress.termName} · {c.progress.entered}/{c.progress.total} note{c.progress.total > 1 ? "s" : ""}
                        </span>
                        <span className={`font-bold ${c.progress.remaining === 0 ? "text-emerald-700" : "text-gray-600"}`}>
                          {c.progress.remaining === 0 ? "✓ Complet" : `${c.progress.remaining} restante${c.progress.remaining > 1 ? "s" : ""}`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${c.progress.remaining === 0 ? "bg-emerald-500" : "bg-sky-600"}`}
                          style={{ width: `${c.progress.pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite (1/3) : Prochaines Évaluations */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            Calendrier des évaluations
          </h2>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
            {upcomingEvaluations.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Aucune évaluation à venir programmée dans le calendrier.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingEvaluations.map((ev) => (
                  <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{ev.name}</p>
                      <p className="text-[11px] text-gray-500">{ev.termName}</p>
                    </div>
                    {ev.dateFormatted && (
                      <span className="rounded-pill bg-sky-50 border border-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 shrink-0">
                        {ev.dateFormatted}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <Link
                href="/dashboard/grades"
                className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800"
              >
                Voir tout le calendrier &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
