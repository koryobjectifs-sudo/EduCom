"use client";

import Link from "next/link";
import { ClipboardList, Clock, CheckCircle2, Sparkles, UserCheck } from "lucide-react";

interface TeacherSoftHeaderProps {
  teacherName: string;
  academicYear: string;
  todayFormatted: string;
  titulaireClasses: {
    id: string;
    name: string;
    studentCount: number;
    attendanceRecordedToday: boolean;
  }[];
}

/**
 * En-tête Unifié « Soft Cockpit Enseignant »
 * Salutation épurée, badge en direct, accès direct aux notes et appel du jour.
 */
export default function TeacherSoftHeader({
  teacherName,
  academicYear,
  todayFormatted,
  titulaireClasses,
}: TeacherSoftHeaderProps) {
  const greetingName = teacherName ? teacherName : "Professeur";
  const initials = greetingName.slice(0, 2).toUpperCase();

  const unrecordedTitulaire = titulaireClasses.filter((c) => !c.attendanceRecordedToday);
  const isTitulaire = titulaireClasses.length > 0;

  return (
    <div className="rounded-[22px] bg-white p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-3.5 transition-all">
      {/* ── 1. LIGNE DU HAUT : Salutation & Actions Rapides ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 tracking-wider">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                Bonjour, {greetingName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En direct
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100/60">
                <Sparkles className="h-3 w-3" />
                Espace Enseignant · {academicYear}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">
              {todayFormatted}
            </p>
          </div>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {isTitulaire && (
            <Link
              href={`/dashboard/attendance${unrecordedTitulaire.length > 0 ? `?classId=${unrecordedTitulaire[0].id}` : ""}`}
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <UserCheck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Faire l&apos;appel</span>
            </Link>
          )}

          <Link
            href="/dashboard/grades"
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-sky-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            <span>Saisir des notes</span>
          </Link>
        </div>
      </div>

      {/* ── 2. BANDEAU APPEL DU JOUR INTÉGRÉ (SI TITULAIRE) ── */}
      {isTitulaire && (
        <div className="pt-2 border-t border-slate-100/80">
          {unrecordedTitulaire.length > 0 ? (
            <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/80 to-amber-50/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100/80 flex items-center justify-center shrink-0 text-amber-800 shadow-2xs">
                  <Clock className="h-4 w-4" />
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
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 shadow-2xs hover:-translate-y-0.5 transition-all shrink-0"
              >
                Faire l&apos;appel &rarr;
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-2.5 px-3.5 flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Appel du jour validé pour {titulaireClasses.map((c) => c.name).join(", ")}.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
