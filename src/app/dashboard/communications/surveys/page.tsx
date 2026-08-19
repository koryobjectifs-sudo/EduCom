import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, BarChart3, Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import CopyLinkButton from "./CopyLinkButton";
import { requireSchoolContext } from "@/lib/documentContext";

export default async function SurveysPage() {
  // ⚠️ Cette requête tournait SANS filtre `schoolId` : la liste montrait les
  // sondages de tous les établissements de la base. Même défaut que l'annuaire
  // des élèves, non couvert par le lot 00.
  const { schoolId } = await requireSchoolContext();

  const surveys = await prisma.survey.findMany({
    where: { schoolId },
    include: {
      responses: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/communications"
            className="rounded-full p-1.5 text-text-faint hover:bg-ground hover:text-text-soft transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Sondages (Surveys)
            </h1>
            <p className="mt-1 text-sm text-text-soft">
              Créez des sondages simples pour récolter l'avis des parents ou gérer les réinscriptions.
            </p>
          </div>
        </div>
        <Link 
          href="/dashboard/communications/surveys/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau Sondage
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {surveys.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-dashed border-rule rounded-xl">
            <BarChart3 className="mx-auto h-12 w-12 text-text-faint mb-3" />
            <h3 className="text-sm font-semibold text-text">Aucun sondage</h3>
            <p className="mt-1 text-sm text-text-soft">Commencez par créer votre premier sondage pour vos parents.</p>
          </div>
        ) : (
          surveys.map(survey => (
            <div key={survey.id} className="bg-white rounded-xl shadow-sm border border-rule overflow-hidden flex flex-col">
              <div className="p-5 border-b border-rule flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-text text-lg">{survey.title}</h3>
                  {survey.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span> Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ground px-2 py-1 text-xs font-medium text-text-soft ring-1 ring-inset ring-primary/40/10">
                      Fermé
                    </span>
                  )}
                </div>
                {survey.description && (
                  <p className="text-sm text-text-soft mb-4 line-clamp-2">{survey.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-text-soft mt-4 bg-ground p-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span className="font-semibold">{survey.responses.length}</span> réponses reçues
                </div>
              </div>
              
              {/* ⚠️ Un bouton « Voir Résultats » figurait ici SANS handler, et
                  aucune route de résultats n'existe dans l'application. Retiré,
                  comme la recherche et les notifications au lot 06 : on
                  n'affiche pas la coquille d'une fonction absente. Le nombre de
                  réponses reçues, lui, est réel et reste affiché au-dessus. */}
              <div className="flex items-center justify-between gap-3 border-t border-rule bg-ground px-5 py-3">
                <span className="text-role-meta text-text-soft">
                  Lien public du sondage
                </span>
                <CopyLinkButton surveyId={survey.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
