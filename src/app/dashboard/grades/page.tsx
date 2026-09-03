import Link from "next/link";
import { ClipboardList, FileText, Calendar, Clock } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Saisie de notes | EduCom",
  description: "Choisissez le type d'évaluation à saisir",
};

export default async function GradesEntryChoicePage() {
  const { schoolId } = await requireSchoolContext();

  // Fetch upcoming evaluations (limit to 10 for the widget)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvaluations = await prisma.evaluation.findMany({
    where: {
      schoolId,
      date: {
        gte: today, // Upcoming or today
      },
    },
    include: {
      term: true,
    },
    orderBy: {
      date: "asc",
    },
    take: 10,
  });

  return (
    <div className="space-y-8 pb-12 max-w-4xl mt-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">
          Saisie de notes
        </h1>
        <p className="mt-2 text-[15px] text-slate-500">
          Sélectionnez le type d&apos;évaluation pour lequel vous souhaitez saisir des notes.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link 
          href="/dashboard/grades/bulletin?type=controle"
          className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 flex items-center gap-3 w-full sm:w-64"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 group-hover:text-primary transition-colors">
              1. Contrôle
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Notes continues
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/bulletin?type=composition"
          className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 flex items-center gap-3 w-full sm:w-64"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 group-hover:text-primary transition-colors">
              2. Composition
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Fin de trimestre
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/report-card"
          className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 flex items-center gap-3 w-full sm:w-64"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 group-hover:text-primary transition-colors">
              3. Bulletins
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Générer et imprimer
            </p>
          </div>
        </Link>
      </div>

      {/* Planning des évaluations */}
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Planning des évaluations à venir
          </h2>
        </div>

        {upcomingEvaluations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-3" />
            <h3 className="text-sm font-medium text-slate-900">Aucune évaluation planifiée</h3>
            <p className="mt-1 text-sm text-slate-500">
              Les prochaines dates de contrôles et compositions apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <ul className="divide-y divide-slate-100">
              {upcomingEvaluations.map((evalItem) => (
                <li key={evalItem.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/5 text-primary shrink-0 border border-primary/10">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(evalItem.date) : "-"}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(evalItem.date) : "-"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {evalItem.name}
                        {evalItem.type === "EXAM" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Composition
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Contrôle
                          </span>
                        )}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(evalItem.date) : "Date à définir"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>{evalItem.term.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/dashboard/grades/bulletin?type=${evalItem.type === "EXAM" ? "composition" : "controle"}`}
                    className="shrink-0 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Saisir les notes &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
