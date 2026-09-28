import Link from "next/link";
import { Users, FolderKanban, Plus, UserCheck } from "lucide-react";
import StudentsUnifiedClient from "./StudentsUnifiedClient";
import { loadStudentsData, resumeStudents } from "./data";

import { redirect } from "next/navigation";

export interface StudentsPageProps {
  searchParams: Promise<{
    annee?: string;
    view?: "list" | "classes";
    classId?: string;
  }>;
}

/**
 * Registre des élèves — Hub unifié (Liste globale et Par classe).
 *
 * ═══ FUSION ANNUAIRE / REGISTRE (Phase 2) ═══
 * - `/dashboard/directory` redirige en 308 vers `/dashboard/students`
 * - `/dashboard/students/dossiers` redirige en 308 vers `/dashboard/students?view=classes`
 * - L'état de vue (`view=list | classes`) et le drilldown (`classId`) vivent dans les `searchParams`.
 * - Portée par rôle appliquée strictement côté serveur via `loadStudentsData`.
 */
export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const sp = await searchParams;
  const d = await loadStudentsData(sp.annee);

  if (d.userRole === "PARENT") {
    redirect("/famille/enfants");
  }

  const isClassesView = sp.view === "classes";

  return (
    <div className="space-y-6 pb-10">
      {/* ── EN-TÊTE UNIFIÉ SOFT COCKPIT ── */}
      <div className="rounded-[22px] bg-white p-4.5 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-200/70 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xs shrink-0">
              {isClassesView ? (
                <FolderKanban className="h-5 w-5" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                  {isClassesView ? "Dossiers de classe" : "Registre des élèves"}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {d.anneeActive}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5 max-w-2xl">
                {resumeStudents(d)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Link
              href="/dashboard/students/dossiers/review"
              data-tour="admissions-link"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <UserCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Admissions</span>
            </Link>
            <Link
              href="/dashboard/students/new"
              data-tour="student-create-btn"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Inscrire un élève</span>
            </Link>
          </div>
        </div>
      </div>

      <StudentsUnifiedClient
        studentsData={d.studentsData}
        classesData={d.classes}
        teachersData={d.teachers}
        annees={d.annees}
        countsByYear={d.countsByYear}
        anneeActive={d.anneeActive}
        userRole={d.userRole}
        initialView={sp.view ?? "list"}
        initialClassId={sp.classId ?? null}
      />
    </div>
  );
}
