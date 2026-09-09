"use client";

import { useState, useMemo } from "react";
import {
  Folder,
  ArrowLeft,
  Users,
  School,
  Sparkles,
  BookOpen,
  GraduationCap,
  Landmark,
  User,
  ArrowRight,
  UserCheck,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import StudentListClient from "../StudentListClient";
import { CYCLE_LABELS } from "@/lib/schoolDocumentLabels";

interface DossiersClientProps {
  studentsData: any[];
  classesData: any[];
  selectedClassId?: string | null;
  onSelectClass?: (classId: string | null) => void;
}

// Configuration visuelle par cycle
const CYCLE_CONFIG: Record<
  string,
  {
    icon: any;
    accentColor: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    cardHoverBorder: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  MATERNELLE: {
    icon: Sparkles,
    accentColor: "rose",
    bgBadge: "bg-rose-50",
    textBadge: "text-rose-700",
    borderBadge: "border-rose-200",
    cardHoverBorder: "hover:border-rose-300 hover:shadow-rose-500/5",
    iconBg: "bg-rose-100/70 text-rose-600",
    iconColor: "text-rose-500",
  },
  ELEMENTAIRE: {
    icon: BookOpen,
    accentColor: "blue",
    bgBadge: "bg-blue-50",
    textBadge: "text-blue-700",
    borderBadge: "border-blue-200",
    cardHoverBorder: "hover:border-blue-300 hover:shadow-blue-500/5",
    iconBg: "bg-blue-100/70 text-blue-600",
    iconColor: "text-blue-500",
  },
  COLLEGE: {
    icon: GraduationCap,
    accentColor: "purple",
    bgBadge: "bg-purple-50",
    textBadge: "text-purple-700",
    borderBadge: "border-purple-200",
    cardHoverBorder: "hover:border-purple-300 hover:shadow-purple-500/5",
    iconBg: "bg-purple-100/70 text-purple-600",
    iconColor: "text-purple-500",
  },
  LYCEE: {
    icon: Landmark,
    accentColor: "emerald",
    bgBadge: "bg-emerald-50",
    textBadge: "text-emerald-700",
    borderBadge: "border-emerald-200",
    cardHoverBorder: "hover:border-emerald-300 hover:shadow-emerald-500/5",
    iconBg: "bg-emerald-100/70 text-emerald-600",
    iconColor: "text-emerald-500",
  },
  AUTRE: {
    icon: School,
    accentColor: "slate",
    bgBadge: "bg-slate-100",
    textBadge: "text-slate-700",
    borderBadge: "border-slate-200",
    cardHoverBorder: "hover:border-slate-300",
    iconBg: "bg-slate-100 text-slate-600",
    iconColor: "text-slate-500",
  },
};

export default function DossiersClient({
  studentsData,
  classesData,
  selectedClassId: externalSelectedClassId,
  onSelectClass,
}: DossiersClientProps) {
  const [internalSelectedClassId, setInternalSelectedClassId] = useState<string | null>(null);

  const selectedClassId = externalSelectedClassId !== undefined ? externalSelectedClassId : internalSelectedClassId;

  const handleSelectClass = (id: string | null) => {
    if (onSelectClass) {
      onSelectClass(id);
    } else {
      setInternalSelectedClassId(id);
    }
  };

  /**
   * Classe courante d'un élève.
   */
  const classeDe = (student: {
    enrollments?: { classId?: string | null; class?: { id?: string } | null }[];
  }): string | undefined => {
    const e = student.enrollments?.[0];
    return e?.classId ?? e?.class?.id ?? undefined;
  };

  const statsByClass = useMemo(() => {
    const stats: Record<string, number> = {};
    let unassigned = 0;

    classesData.forEach((c) => {
      stats[c.id] = 0;
    });

    studentsData.forEach((student) => {
      const classId = classeDe(student);
      if (classId) {
        stats[classId] = (stats[classId] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    return { stats, unassigned };
  }, [studentsData, classesData]);

  const groupes = useMemo(() => {
    const ordre = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE", "AUTRE"] as const;
    const connus = new Set<string>(ordre);
    const listes = ordre
      .map((cycle) => {
        const classes = classesData.filter((c) => c.cycle === cycle);
        const totalStudents = classes.reduce((sum, c) => sum + (statsByClass.stats[c.id] || 0), 0);
        return {
          cle: cycle as string,
          titre: CYCLE_LABELS[cycle] || cycle,
          classes,
          totalStudents,
          config: CYCLE_CONFIG[cycle] || CYCLE_CONFIG.AUTRE,
        };
      })
      .filter((g) => g.classes.length > 0);

    const orphelines = classesData.filter((c) => !connus.has(c.cycle));
    if (orphelines.length > 0) {
      const totalStudents = orphelines.reduce((sum, c) => sum + (statsByClass.stats[c.id] || 0), 0);
      listes.push({
        cle: "INCONNU",
        titre: "Autres classes",
        classes: orphelines,
        totalStudents,
        config: CYCLE_CONFIG.AUTRE,
      });
    }
    return listes;
  }, [classesData, statsByClass]);

  if (selectedClassId !== null) {
    const filteredStudents =
      selectedClassId === "UNASSIGNED"
        ? studentsData.filter((s) => !classeDe(s))
        : studentsData.filter((s) => classeDe(s) === selectedClassId);

    const targetClass = classesData.find((c) => c.id === selectedClassId);
    const className = selectedClassId === "UNASSIGNED" ? "Élèves non assignés" : targetClass?.name ?? "";
    const classCycle = targetClass?.cycle;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelectClass(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Toutes les classes</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-none">
                  {className}
                </h2>
                {classCycle && (
                  <span className="text-[11px] font-medium text-slate-500">
                    Cycle {(CYCLE_LABELS as any)[classCycle] || classCycle}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold self-start sm:self-auto">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>
              {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <StudentListClient
          students={filteredStudents}
          classesData={selectedClassId === "UNASSIGNED" ? [] : classesData.filter((c) => c.id === selectedClassId)}
          classesAssignables={classesData}
        />
      </div>
    );
  }

  const renderClassCard = (cls: any, cycleConfig: typeof CYCLE_CONFIG.MATERNELLE) => {
    const studentCount = statsByClass.stats[cls.id] ?? 0;
    const teacherName = cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : null;
    const CycleIcon = cycleConfig.icon;

    return (
      <div
        key={cls.id}
        onClick={() => handleSelectClass(cls.id)}
        className={`group relative rounded-surface border border-rule bg-surface p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-subtle cursor-pointer flex flex-col justify-between gap-2.5 ${cycleConfig.cardHoverBorder}`}
      >
        {/* En-tête de la carte */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-control flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${cycleConfig.iconBg}`}
            >
              <CycleIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-text text-sm leading-tight group-hover:text-primary transition-colors">
                {cls.name}
              </h3>
              <span className="text-[10.5px] font-medium text-text-soft mt-0.5 block">
                {(CYCLE_LABELS as any)[cls.cycle] || cls.cycle}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-control border ${
              studentCount > 0
                ? "bg-sunk text-text border-rule"
                : "bg-sunk/50 text-text-faint border-rule"
            }`}
          >
            <Users className="h-2.5 w-2.5 text-text-soft" />
            <span>{studentCount}</span>
          </span>
        </div>

        {/* Section Professeur & Métriques */}
        <div className="pt-1.5 border-t border-rule flex items-center justify-between text-role-meta">
          <div className="flex items-center gap-1 text-text-soft truncate max-w-[75%]">
            <User className="h-3 w-3 text-text-faint shrink-0" />
            <span className="truncate" title={teacherName || "Aucun titulaire assigné"}>
              {teacherName ? (
                <span className="font-medium text-text">{teacherName}</span>
              ) : (
                <span className="text-text-faint italic">Sans titulaire</span>
              )}
            </span>
          </div>

          <span className="text-primary font-bold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>Ouvrir</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {groupes.map((g) => {
        const CycleIcon = g.config.icon;

        return (
          <section key={g.cle} className="space-y-3">
            {/* En-tête de section de Cycle avec badges et compteurs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-rule">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${g.config.iconBg}`}>
                  <CycleIcon className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold tracking-wider text-text uppercase">
                  {g.titre}
                </h2>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${g.config.bgBadge} ${g.config.textBadge} ${g.config.borderBadge}`}
                >
                  {g.classes.length} classe{g.classes.length > 1 ? "s" : ""}
                </span>
              </div>

              <span className="text-role-meta font-semibold text-text-soft">
                {g.totalStudents} élève{g.totalStudents > 1 ? "s" : ""} au total
              </span>
            </div>

            {/* Grille responsive des cartes de classe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {g.classes.map((cls) => renderClassCard(cls, g.config))}
            </div>
          </section>
        );
      })}

      {/* Section spéciale : Élèves hors classe / non assignés */}
      {statsByClass.unassigned > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between pb-1 border-b border-amber-200/60">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-extrabold tracking-wider uppercase">
                Élèves non assignés
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
              {statsByClass.unassigned} élève{statsByClass.unassigned > 1 ? "s" : ""} à affecter
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              onClick={() => handleSelectClass("UNASSIGNED")}
              className="group relative rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-amber-300 cursor-pointer flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-base leading-tight">
                      Sans classe
                    </h3>
                    <span className="text-[11px] font-medium text-amber-700/80 mt-0.5 block">
                      En attente d&apos;affectation
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-200/80 text-amber-900">
                  {statsByClass.unassigned}
                </span>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-900 font-semibold">
                <span>Affecter aux classes</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
