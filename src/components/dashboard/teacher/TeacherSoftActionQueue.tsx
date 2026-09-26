"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  Clock,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import type { TeacherDashboardSnapshot } from "@/lib/dashboard-teacher";

interface TeacherSoftActionQueueProps {
  snapshot: TeacherDashboardSnapshot;
}

export default function TeacherSoftActionQueue({ snapshot }: TeacherSoftActionQueueProps) {
  const { classes, titulaireClasses, upcomingEvaluations } = snapshot;

  const unrecordedTitulaire = titulaireClasses.filter((c) => !c.attendanceRecordedToday);
  const classesNeedingGrades = classes.filter(
    (c) => c.progress && c.progress.remaining > 0,
  );

  // Construction de la file des priorités
  const priorityItems: {
    id: string;
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: typeof ClipboardList;
    iconColor: string;
    iconBg: string;
    href: string;
    actionLabel: string;
  }[] = [];

  // 1. Appel du jour non fait
  if (unrecordedTitulaire.length > 0) {
    priorityItems.push({
      id: "action-attendance",
      title: "Appel du jour à enregistrer",
      description: `Classe titulaire : ${unrecordedTitulaire.map((c) => c.name).join(", ")}`,
      badge: "Aujourd'hui",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      href: `/dashboard/attendance?classId=${unrecordedTitulaire[0].id}`,
      actionLabel: "Faire l'appel",
    });
  }

  // 2. Classes avec des notes restantes
  for (const c of classesNeedingGrades.slice(0, 2)) {
    priorityItems.push({
      id: `action-grade-${c.id}`,
      title: `Notes à compléter · ${c.name}`,
      description: `${c.progress?.remaining} note(s) restante(s) sur ${c.progress?.total} pour le ${c.progress?.termName}`,
      badge: `${c.progress?.pct}% fait`,
      badgeColor: "bg-sky-50 text-sky-700 border-sky-100",
      icon: ClipboardList,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
      href: c.link,
      actionLabel: "Saisir",
    });
  }

  // 3. Prochaine évaluation
  if (upcomingEvaluations.length > 0) {
    const nextEval = upcomingEvaluations[0];
    priorityItems.push({
      id: `action-eval-${nextEval.id}`,
      title: `Évaluation : ${nextEval.name}`,
      description: `${nextEval.termName} ${nextEval.dateFormatted ? `· Programmée le ${nextEval.dateFormatted}` : ""}`,
      badge: "Calendrier",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-100",
      icon: CalendarCheck,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
      href: "/dashboard/grades",
      actionLabel: "Voir",
    });
  }

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-4">
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Priorités Pédagogiques</span>
            {priorityItems.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700">
                {priorityItems.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interventions suggérées pour votre journée
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          Enseignant
        </span>
      </div>

      {/* ── ÉTAT ZEN (0 ACTION) ── */}
      {priorityItems.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 max-w-sm">
            <h3 className="text-sm font-bold text-slate-900">
              Pédagogie parfaitement à jour
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toutes vos saisies de notes et vos présences sont complètes pour cette période.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {priorityItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-50/60 hover:bg-white border border-slate-100 hover:border-slate-200/80 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${item.iconBg} ${item.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-semibold border ${item.badgeColor} shrink-0`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 border border-slate-200/80 hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all shrink-0 shadow-2xs"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
