"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Star,
  MessageSquare,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getTesterFeedbacksAction } from "@/app/dashboard/settings/feedback-actions";
import ModalQuizTesteur from "./ModalQuizTesteur";

interface FeedbackItem {
  id: string;
  role: string;
  testerName?: string | null;
  metierLabel: string;
  overallRating: number;
  generalVerdict?: string | null;
  topPriorityChange?: string | null;
  modulesFeedback: Record<
    string,
    {
      rating: number;
      ceQuiMarche?: string;
      ceQuiBloque?: string;
      suggestions?: string;
      suggestion?: string;
      comprehension?: string;
      facilite?: string;
      qualite?: string;
      confusions?: string[];
      scoreGlobalSur100?: number;
      scoreComprehension?: number;
      scoreFacilite?: number;
      scoreQualite?: number;
      scoreClarte?: number;
      diagnostic?: string;
      niveauAutonomie?: string;
    }
  >;
  createdAt: string;
}

export default function VueRetoursTesteurs({ userRole = "OWNER" }: { userRole?: string }) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [avgOverall, setAvgOverall] = useState("0.0");
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const chargerFeedbacks = useCallback(async () => {
    setIsLoading(true);
    const res = await getTesterFeedbacksAction();
    if (res.success) {
      setFeedbacks(res.feedbacks || []);
      setTotal(res.total || 0);
      setAvgOverall(res.avgOverall || "0.0");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let actif = true;
    getTesterFeedbacksAction().then((res) => {
      if (actif && res.success) {
        setFeedbacks(res.feedbacks || []);
        setTotal(res.total || 0);
        setAvgOverall(res.avgOverall || "0.0");
      }
      if (actif) setIsLoading(false);
    });
    return () => {
      actif = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Bandeau d'action rapide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-purple-950">Quiz d&apos;Évaluation Testeur par Métier</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-900">
                {total} retour{total > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-purple-800 mt-0.5">
              Recueillez le ressenti micro de vos équipes (Accueil, Pédagogie, Finance, etc.) pour perfectionner le logiciel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={chargerFeedbacks}
            disabled={isLoading}
            className="p-2 rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-100/50 transition-colors cursor-pointer"
            title="Rafraîchir les retours"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsQuizOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Remplir une évaluation</span>
          </button>
        </div>
      </div>

      {/* Statistiques clés compactes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Note globale</div>
          <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span>{avgOverall} / 5</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Total avis</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{total}</div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Directeurs & Staff</div>
          <div className="text-lg font-bold text-purple-700 mt-0.5">
            {feedbacks.filter((f) => f.role !== "PARENT").length}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Familles / Parents</div>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">
            {feedbacks.filter((f) => f.role === "PARENT").length}
          </div>
        </div>
      </div>

      {/* Liste des retours testeurs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Derniers retours collectés
          </h4>
          <span className="text-[11px] text-slate-500">
            {feedbacks.length} réponse{feedbacks.length > 1 ? "s" : ""}
          </span>
        </div>

        {feedbacks.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Aucun retour enregistré pour l&apos;instant.</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Cliquez sur « Remplir une évaluation » pour tester un métier et enregistrer vos premières remarques micro.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedbacks.map((item) => {
              const isExpanded = expandedId === item.id;
              const modulesKeys = Object.keys(item.modulesFeedback || {});
              return (
                <div key={item.id} className="p-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          {item.metierLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {item.testerName || "Anonyme"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          · {new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Note globale & verdict */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center text-amber-600 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-500 inline mr-0.5" />
                          {item.overallRating}/5
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="font-semibold text-slate-700">{item.generalVerdict}</span>
                      </div>

                      {/* Changement prioritaire */}
                      {item.topPriorityChange && (
                        <div className="mt-1 text-xs text-rose-900 bg-rose-50/80 border border-rose-200/70 p-2 rounded-xl leading-relaxed">
                          <span className="font-bold">Priorité N°1 :</span> {item.topPriorityChange}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                      title={isExpanded ? "Replier" : "Voir le détail par module"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Détail par module accordéon */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                      {/* Diagnostic global si présent */}
                      {item.modulesFeedback.__analyse__ && (
                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-purple-950 font-bold">
                            <span>Analyse Diagnostique Automatique :</span>
                            <span className="text-[10px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                              {item.modulesFeedback.__analyse__.scoreGlobalSur100}%
                            </span>
                          </div>
                          {item.modulesFeedback.__analyse__.diagnostic && (
                            <p className="text-[11.5px] text-purple-900 leading-snug">
                              {item.modulesFeedback.__analyse__.diagnostic}
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] text-purple-800 font-semibold">
                            <div>Compréhension : {item.modulesFeedback.__analyse__.scoreComprehension}%</div>
                            <div>Facilité : {item.modulesFeedback.__analyse__.scoreFacilite}%</div>
                            <div>Qualité : {item.modulesFeedback.__analyse__.scoreQualite}%</div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {modulesKeys.map((mk) => {
                          const modData = item.modulesFeedback[mk];
                          return (
                            <div key={mk} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span className="capitalize text-purple-900">Module testé : {mk}</span>
                                <span className="text-amber-600 font-bold">{item.overallRating}/5</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700 pt-1">
                                {modData.facilite && (
                                  <div>
                                    <span className="font-semibold text-slate-500">Facilité : </span>
                                    <span className="font-medium text-slate-900">{modData.facilite.replace("_", " ")}</span>
                                  </div>
                                )}
                                {modData.qualite && (
                                  <div>
                                    <span className="font-semibold text-slate-500">Qualité perçue : </span>
                                    <span className="font-medium text-slate-900">{modData.qualite}</span>
                                  </div>
                                )}
                              </div>
                              {modData.confusions && modData.confusions.length > 0 && (
                                <div className="pt-1 flex flex-wrap gap-1 items-center">
                                  <span className="text-[10.5px] text-slate-500 font-semibold mr-1">Retours :</span>
                                  {modData.confusions.map((cf) => (
                                    <span
                                      key={cf}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        cf === "aucune"
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                          : "bg-amber-50 text-amber-900 border border-amber-200"
                                      }`}
                                    >
                                      {cf}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(modData.suggestion || modData.suggestions) && (
                                <p className="text-[11px] text-purple-900 bg-purple-50/60 p-2 rounded-lg mt-1">
                                  💡 <span className="font-medium">{modData.suggestion || modData.suggestions}</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale Quiz */}
      <ModalQuizTesteur
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        defaultRole={userRole}
        onSubmitted={chargerFeedbacks}
      />
    </div>
  );
}
