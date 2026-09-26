"use client";

import Link from "next/link";
import {
  Layers,
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  UserX,
} from "lucide-react";
import type { SecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";

interface SecretarySoftAttendanceGridProps {
  classesAttendance: SecretaryDashboardSnapshot["classesAttendance"];
  className?: string;
}

export default function SecretarySoftAttendanceGrid({
  classesAttendance,
  className = "",
}: SecretarySoftAttendanceGridProps) {
  const recordedCount = classesAttendance.filter((c) => c.status === "RECORDED").length;

  return (
    <div
      className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-5 ${className}`}
    >
      {/* ── EN-TÊTE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-600" />
            <span>Suivi des Classes & Registre d&apos;Appel</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            État d&apos;assiduité du jour et effectifs par division
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
            {recordedCount} / {classesAttendance.length} classes pointées
          </span>
          <Link
            href="/dashboard/attendance"
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors inline-flex items-center gap-1"
          >
            <span>Feuille générale</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── GRILLE DES CLASSES ── */}
      {classesAttendance.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
          <Layers className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aucune classe enregistrée</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Créez les classes et divisions depuis les paramètres de l&apos;établissement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classesAttendance.map((c) => {
            const isRecorded = c.status === "RECORDED";
            const attendancePct = c.rate ?? (isRecorded ? 100 : null);

            return (
              <div
                key={c.classId}
                className="group rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between gap-3.5"
              >
                {/* Ligne 1 : Nom de la classe et badge de cycle */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {c.className}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {c.cycle === "MOYEN"
                          ? "Moyen"
                          : c.cycle === "SECONDAIRE"
                          ? "Secondaire"
                          : "Élémentaire"}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {c.totalStudents} élève{c.totalStudents > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isRecorded
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-200/60"
                    }`}
                  >
                    {isRecorded ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Fait</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                        <span>En attente</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Ligne 2 : Présents / Absents */}
                <div className="rounded-xl bg-slate-50/70 p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{isRecorded ? `${c.presentCount} présents` : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                    <UserX className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>{isRecorded ? `${c.absentCount} absent(s)` : "—"}</span>
                  </div>
                  {attendancePct !== null && (
                    <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                      {attendancePct}%
                    </span>
                  )}
                </div>

                {/* Ligne 3 : Actions rapides */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <Link
                    href={`/dashboard/classes/${c.classId}`}
                    className="font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Voir l&apos;effectif
                  </Link>

                  <Link
                    href={`/dashboard/attendance?classId=${c.classId}`}
                    className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>{isRecorded ? "Détail de l'appel" : "Pointer l'appel"}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
