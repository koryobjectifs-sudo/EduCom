import Link from "next/link";
import { ClipboardList, FileText, Calendar, Clock, TrendingDown } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Saisie de notes & Évaluations | EduCom",
  description: "Accédez à la saisie des contrôles, compositions, bulletins et suivi des élèves en difficulté",
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
    select: {
      id: true,
      name: true,
      type: true,
      date: true,
      term: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
    take: 10,
  });

  return (
    <div className="space-y-4 pb-8 max-w-5xl">
      <div>
        <h1 className="text-role-page font-bold tracking-tight text-text">
          Notes & Évaluations
        </h1>
        <p className="mt-1 text-role-body text-text-soft">
          Sélectionnez le module d&apos;évaluation, l&apos;édition des bulletins ou le suivi pédagogique.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
        <Link 
          href="/dashboard/grades/bulletin?type=controle"
          className="group relative rounded-surface border border-rule bg-surface p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              1. Contrôle
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Notes continues
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/bulletin?type=composition"
          className="group relative rounded-surface border border-rule bg-surface p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              2. Composition
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Fin de trimestre
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/report-card"
          className="group relative rounded-surface border border-rule bg-surface p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              3. Bulletins
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Générer et imprimer
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/difficultes"
          className="group relative rounded-surface border border-rose-200/80 bg-rose-50/20 p-3 shadow-2xs transition-all hover:border-rose-400 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-rose-700 transition-colors">
              4. En difficulté
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Moyenne &lt; 10/20
            </p>
          </div>
        </Link>
      </div>

      {/* Planning des évaluations */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-text-soft" />
          <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
            Planning des évaluations à venir
          </h2>
        </div>

        {upcomingEvaluations.length === 0 ? (
          <div className="rounded-surface border border-dashed border-rule bg-sunk/40 p-6 text-center">
            <Calendar className="mx-auto h-6 w-6 text-text-faint mb-2" />
            <h3 className="text-xs font-semibold text-text">Aucune évaluation planifiée</h3>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Les prochaines dates de contrôles et compositions apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="rounded-surface border border-rule bg-surface overflow-hidden shadow-2xs">
            <ul className="divide-y divide-rule">
              {upcomingEvaluations.map((evalItem) => (
                <li key={evalItem.id} className="p-3 sm:px-4 hover:bg-sunk transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center w-9 h-9 rounded-control bg-primary/5 text-primary shrink-0 border border-primary/10">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider">
                        {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(evalItem.date) : "-"}
                      </span>
                      <span className="text-xs font-bold leading-none">
                        {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(evalItem.date) : "-"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-text flex items-center gap-1.5">
                        {evalItem.name}
                        {evalItem.type === "EXAM" ? (
                          <span className="inline-flex items-center rounded-pill bg-amber-50 px-1.5 py-0.2 text-[9.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Composition
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-pill bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Contrôle
                          </span>
                        )}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-role-meta text-text-soft">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(evalItem.date) : "Date à définir"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-rule"></span>
                        <span>{evalItem.term.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/dashboard/grades/bulletin?type=${evalItem.type === "EXAM" ? "composition" : "controle"}`}
                    className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
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
