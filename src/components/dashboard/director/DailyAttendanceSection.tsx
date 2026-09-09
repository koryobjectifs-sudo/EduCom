"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, UserCheck, Check, AlertCircle } from "lucide-react";
import type { AttendanceTodayData } from "@/lib/dashboard-director";

interface DailyAttendanceSectionProps {
  attendance: AttendanceTodayData;
}

export default function DailyAttendanceSection({ attendance }: DailyAttendanceSectionProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(() =>
    attendance.pendingClasses.length > 0 ? "pending" : "completed"
  );

  const {
    recordedToday,
    globalRate,
    presentCount,
    absentCount,
    lateCount,
    totalRecordedStudents,
    totalActiveStudents,
    classesRecordedCount,
    classesTotalCount,
    isFullSchoolRecorded,
    completedClasses,
    pendingClasses,
    alerts,
    unassignedClassesCount,
  } = attendance;

  return (
    <section className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-4">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-blue-50 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
              Assiduité & Situation du Jour
            </h2>
            <p className="text-role-meta text-text-soft">
              Avancement de l&apos;appel par classe et suivi de présence en temps réel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-role-meta font-semibold px-2.5 py-1 rounded-pill bg-sunk text-text-soft">
            {classesRecordedCount} / {classesTotalCount} cl. appelée{classesRecordedCount > 1 ? "s" : ""}
          </span>

          <Link
            href="/dashboard/attendance"
            className="inline-flex h-7.5 items-center gap-1 rounded-control bg-primary hover:bg-primary-hover px-2.5 text-xs font-semibold text-white transition-colors shadow-2xs"
          >
            <span>Feuille d&apos;appel générale</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Grille : Synthèse Globale + Détail des Classes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* BLOC GAUCHE : STATS GLOBALES (5 cols) */}
        <div className="lg:col-span-5 rounded-control bg-gradient-to-br from-sunk to-blue-50/30 p-3.5 border border-rule flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-soft">
                Taux de Présence
              </span>
              {recordedToday && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-pill ${
                    isFullSchoolRecorded
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isFullSchoolRecorded ? "École complète" : "Appel partiel"}
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
                  {recordedToday && globalRate !== null ? `${globalRate} %` : "—"}
                </span>
                <span className="text-role-meta font-medium text-text-soft">
                  {recordedToday
                    ? isFullSchoolRecorded
                      ? "sur toute l'école"
                      : "sur classes appelées"
                    : "Appel non démarré"}
                </span>
              </div>

              {recordedToday ? (
                <div className="mt-1.5 space-y-1">
                  <p className="text-role-meta text-text-soft font-medium">
                    <strong className="text-emerald-700">{presentCount}</strong> présents sur{" "}
                    <strong className="text-text">{totalRecordedStudents}</strong> élèves
                  </p>
                  {!isFullSchoolRecorded && (
                    <p className="text-[10.5px] text-amber-700 font-semibold bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200/60 inline-block">
                      ⚠️ {pendingClasses.length} classe{pendingClasses.length > 1 ? "s" : ""} à appeler sur {classesTotalCount}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-role-meta text-text-faint">
                  Aucun appel n&apos;a encore été validé pour cette journée.
                </p>
              )}
            </div>

            {/* Décomposition Présents / Absents / Retards */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-control bg-surface p-2 border border-rule shadow-2xs">
                <span className="text-[9.5px] uppercase font-bold text-emerald-700">Présents</span>
                <p className="mt-0.5 text-sm font-bold text-text">{presentCount}</p>
              </div>

              <div className="rounded-control bg-surface p-2 border border-rule shadow-2xs">
                <span className="text-[9.5px] uppercase font-bold text-danger">Absents</span>
                <p className="mt-0.5 text-sm font-bold text-text">{absentCount}</p>
              </div>

              <div className="rounded-control bg-surface p-2 border border-rule shadow-2xs">
                <span className="text-[9.5px] uppercase font-bold text-amber-600">Retards</span>
                <p className="mt-0.5 text-sm font-bold text-text">{lateCount}</p>
              </div>
            </div>
          </div>

          {/* Statut des classes sans titulaire */}
          {unassignedClassesCount > 0 && (
            <div className="rounded-control bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{unassignedClassesCount} classe{unassignedClassesCount > 1 ? "s" : ""} sans titulaire</p>
                <Link href="/dashboard/classes" className="underline font-bold text-amber-950 mt-0.5 inline-block text-[11px]">
                  Affecter un enseignant
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* BLOC DROIT : SITUATION PAR CLASSE (7 cols) */}
        <div className="lg:col-span-7 rounded-control bg-sunk/60 p-3.5 border border-rule flex flex-col justify-between space-y-3">
          {/* Onglets de filtrage */}
          <div className="flex items-center justify-between pb-2 border-b border-rule">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`text-xs font-semibold px-2.5 py-1 rounded-control transition-all ${
                  activeTab === "pending"
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-surface text-text-soft border border-rule hover:bg-sunk"
                }`}
              >
                À appeler ({pendingClasses.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`text-xs font-semibold px-2.5 py-1 rounded-control transition-all ${
                  activeTab === "completed"
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-surface text-text-soft border border-rule hover:bg-sunk"
                }`}
              >
                Validés ({completedClasses.length})
              </button>
            </div>

            <span className="text-[10.5px] font-medium text-text-soft">
              {classesTotalCount} classes
            </span>
          </div>

          {/* LISTE DES CLASSES SELON L'ONGLET */}
          <div className="space-y-2 min-h-[140px]">
            {activeTab === "pending" ? (
              pendingClasses.length === 0 ? (
                <div className="py-8 text-center bg-surface rounded-control border border-rule">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                  <p className="mt-1.5 text-xs font-bold text-text">
                    Toutes les classes ont fait l&apos;appel aujourd&apos;hui !
                  </p>
                  <p className="text-[10.5px] text-text-soft mt-0.5">
                    L&apos;assiduité de l&apos;école est 100% à jour ce matin.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pendingClasses.map((cls) => (
                    <div
                      key={cls.classId}
                      className="flex items-center justify-between p-2.5 rounded-control bg-surface border border-rule shadow-2xs hover:border-primary/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-text">{cls.className}</span>
                          <span className="rounded bg-sunk px-1.5 py-0.2 text-[9.5px] font-semibold text-text-soft">
                            {cls.cycle}
                          </span>
                        </div>
                        <p className="text-role-meta text-text-soft mt-0.5 font-medium">
                          {cls.totalStudents} élève{cls.totalStudents > 1 ? "s" : ""}
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/attendance/take?classId=${cls.classId}`}
                        className="inline-flex items-center gap-1 rounded-control bg-blue-50 text-primary hover:bg-primary hover:text-white px-2 py-1 text-xs font-semibold transition-colors"
                      >
                        <span>Appel</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )
            ) : completedClasses.length === 0 ? (
              <div className="py-8 text-center bg-surface rounded-control border border-rule">
                <Clock className="mx-auto h-6 w-6 text-amber-500" />
                <p className="mt-1.5 text-xs font-bold text-text">
                  Aucun appel n&apos;a encore été validé
                </p>
                <p className="text-[10.5px] text-text-soft mt-0.5">
                  Sélectionnez une classe dans l&apos;onglet « À appeler » pour démarrer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {completedClasses.map((cls) => {
                  const isLow = cls.status === "LOW_ATTENDANCE";

                  return (
                    <div
                      key={cls.classId}
                      className={`flex items-center justify-between p-2.5 rounded-control bg-surface border shadow-2xs transition-all ${
                        isLow ? "border-amber-300 bg-amber-50/20" : "border-rule"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-text">{cls.className}</span>
                          <span className="rounded bg-sunk px-1.5 py-0.2 text-[9.5px] font-semibold text-text-soft">
                            {cls.cycle}
                          </span>
                        </div>
                        <p className="text-role-meta text-text-soft mt-0.5 font-medium">
                          <span className="text-emerald-700 font-bold">{cls.presentCount}</span> / {cls.totalStudents} présents
                          {cls.absentCount > 0 && (
                            <span className="text-danger font-semibold ml-1">({cls.absentCount} abs)</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                            isLow
                              ? "bg-red-100 text-danger"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {cls.rate}%
                        </span>

                        <Link
                          href={`/dashboard/attendance/take?classId=${cls.classId}`}
                          className="rounded p-1 text-text-faint hover:text-text transition-colors"
                          title="Modifier l'appel"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-rule text-role-meta">
            <span className="text-text-soft">
              Notifications absences SMS/WhatsApp actives
            </span>
            <Link
              href="/dashboard/attendance"
              className="font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Tableau récapitulatif</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
