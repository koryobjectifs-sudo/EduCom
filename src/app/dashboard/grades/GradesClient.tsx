"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, Plus, Trash2, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { createTerm, deleteTerm, createSubject, deleteSubject, createEvaluation, deleteEvaluation } from "./actions";
import { useRouter } from "next/navigation";
import StudentEntryTab from "./StudentEntryTab";
import ClassSubjectsPanel from "./ClassSubjectsPanel";
import TermDates from "@/components/grades/TermDates";

// La saisie « par matière » a été fusionnée dans l'écran de saisie unique :
// le tableau récapitulatif permet déjà de travailler matière par matière.
type TabType = "saisie" | "config";

export default function GradesClient({ 
  initialTerms, 
  initialSubjects, 
  classes,
  defaults,
  canConfigure = false,
}: { 
  initialTerms: any[]; 
  initialSubjects: any[]; 
  classes: any[];
  /** Classe / trimestre / évaluation résolus par le serveur. */
  defaults?: { classId: string; termId: string; evaluationId: string };
  /** Droit d'écrire la configuration académique — direction et secrétariat. */
  canConfigure?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("saisie");
  // Un enseignant ne peut pas atterrir sur l'onglet configuration, même par un
  // état résiduel : la vue est ramenée à la saisie.
  const tab: TabType = canConfigure ? activeTab : "saisie";

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Il n'y a plus qu'un écran de saisie : une barre d'onglets à un seul
          bouton ne servait qu'à voler de la hauteur au bulletin. La
          configuration devient un accès discret, et un retour quand on y est. */}
      {tab === "config" ? (
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 bg-gray-50/50">
          <button
            onClick={() => setActiveTab("saisie")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à la saisie
          </button>
          <span className="text-[13px] font-semibold text-gray-900 ml-1">Configuration</span>
        </div>
      ) : canConfigure ? (
        <button
          onClick={() => setActiveTab("config")}
          className="absolute right-3 top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 bg-white/90 border border-gray-200 shadow-sm hover:text-gray-900 hover:border-gray-300 transition-colors"
          title="Trimestres, évaluations et matières"
        >
          <Settings className="w-3.5 h-3.5" /> Configuration
        </button>
      ) : null}

      {/* La saisie gère elle-même son espace : pas de marge extérieure, le
          bulletin doit occuper toute la largeur disponible. */}
      <div
        className={`flex-1 bg-gray-50/30 min-h-0 ${
          tab === "config" ? "overflow-auto p-6" : "overflow-hidden"
        }`}
      >
        {tab === "saisie" && (
          <StudentEntryTab terms={initialTerms} classes={classes} defaults={defaults} />
        )}
        {tab === "config" && (
          <ConfigTab terms={initialTerms} subjects={initialSubjects} classes={classes} />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// CONFIG TAB
// -------------------------------------------------------------
function ConfigTab({ terms, subjects, classes }: { terms: any[], subjects: any[], classes: any[] }) {
  const router = useRouter();
  const [newTerm, setNewTerm] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // States for adding evaluation to a specific term
  const [newEvaluationName, setNewEvaluationName] = useState("");
  const [newEvaluationType, setNewEvaluationType] = useState<'EXAM' | 'QUIZ'>('QUIZ');
  const [addingEvalForTerm, setAddingEvalForTerm] = useState<string | null>(null);
  const [isAddingEval, setIsAddingEval] = useState(false);

  const handleAddTerm = async () => {
    if (!newTerm.trim()) return;
    setIsAddingTerm(true);
    await createTerm(newTerm);
    setNewTerm("");
    setIsAddingTerm(false);
    router.refresh();
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    setIsAddingSubject(true);
    await createSubject(newSubject);
    setNewSubject("");
    setIsAddingSubject(false);
    router.refresh();
  };

  const handleAddEvaluation = async (termId: string) => {
    if (!newEvaluationName.trim()) return;
    setIsAddingEval(true);
    await createEvaluation(newEvaluationName, termId, newEvaluationType);
    setNewEvaluationName("");
    setAddingEvalForTerm(null);
    setIsAddingEval(false);
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/*
        ⚠️ Cet onglet est CONSERVÉ tel quel — il fonctionne, et des habitudes s'y
        sont prises. Mais il ne sait pas tout faire : coefficients, dates
        d'évaluation, affectations et état de la configuration n'existent que
        sur l'écran complet. Le dire ici évite qu'une directrice cherche
        longtemps un champ qui n'est pas dans cet onglet.
      */}
      <Link
        href="/dashboard/settings/pedagogie"
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm transition-colors hover:border-indigo-300"
      >
        <span className="text-gray-700">
          <span className="font-semibold text-gray-900">Configuration pédagogique complète</span>
          {" — "}coefficients, dates des évaluations, affectations des enseignants et état de
          votre configuration.
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
          Ouvrir <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Terms & Evaluations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Périodes & Évaluations</h3>
        <p className="text-sm text-gray-500 mb-4">
          Définissez vos trimestres, leurs dates et les contrôles/compositions associés.
          Les dates sont propres à votre établissement : elles décident quel trimestre EduCom ouvre par défaut.
        </p>
        
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Nouveau trimestre (ex: 1er Trimestre)" 
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleAddTerm}
            disabled={isAddingTerm}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            {isAddingTerm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter
          </button>
        </div>

        <div className="space-y-4">
          {terms.map(term => (
            <div key={term.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <div className="flex items-center justify-between p-3 bg-gray-50/80 border-b border-gray-100">
                <span className="font-semibold text-gray-800">{term.name}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setAddingEvalForTerm(term.id === addingEvalForTerm ? null : term.id)}
                    className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
                  >
                    + Évaluation
                  </button>
                  <button 
                    onClick={async () => { await deleteTerm(term.id); router.refresh(); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendrier du trimestre — propre à CHAQUE école */}
              <TermDates term={term} onSaved={() => router.refresh()} />

              {/* Evaluations list */}
              <div className="p-2 space-y-1">
                {term.evaluations?.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between p-2 pl-4 rounded-lg hover:bg-gray-50 text-sm">
                    <span className="text-gray-700">
                      {ev.name} <span className="text-[10px] uppercase font-bold text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded">{ev.type === 'EXAM' ? 'Composition' : 'Contrôle'}</span>
                    </span>
                    <button 
                      onClick={async () => { await deleteEvaluation(ev.id); router.refresh(); }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(!term.evaluations || term.evaluations.length === 0) && (
                  <div className="text-xs text-gray-400 p-2 pl-4 italic">Aucune évaluation ajoutée à ce trimestre.</div>
                )}
                
                {/* Form to add new evaluation */}
                {addingEvalForTerm === term.id && (
                  <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex flex-col gap-2">
                    <input 
                      type="text" 
                      placeholder="Nom (ex: Contrôle 1)" 
                      value={newEvaluationName}
                      onChange={(e) => setNewEvaluationName(e.target.value)}
                      className="border border-indigo-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                    />
                    <div className="flex gap-2">
                      <select 
                        value={newEvaluationType}
                        onChange={(e) => setNewEvaluationType(e.target.value as any)}
                        className="border border-indigo-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none flex-1"
                      >
                        <option value="QUIZ">Contrôle / Devoir</option>
                        <option value="EXAM">Composition / Examen</option>
                      </select>
                      <button 
                        onClick={() => handleAddEvaluation(term.id)}
                        disabled={isAddingEval}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700"
                      >
                        {isAddingEval ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {terms.length === 0 && (
            <div className="text-center p-4 text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Aucun trimestre défini.
            </div>
          )}
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Matières Enseignées</h3>
        <p className="text-sm text-gray-500 mb-4">Ajoutez les matières qui apparaîtront sur les bulletins.</p>
        
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Ex: Mathématiques" 
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleAddSubject}
            disabled={isAddingSubject}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            {isAddingSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter
          </button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {subjects.map(sub => (
            <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
              <span className="text-sm font-medium text-gray-700">{sub.name}</span>
              <button 
                onClick={async () => { await deleteSubject(sub.id); router.refresh(); }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {subjects.length === 0 && (
            <div className="text-center p-4 text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Aucune matière définie.
            </div>
          )}
        </div>
      </div>

      {/* Programme de chaque classe : quelles matières y sont enseignées. */}
      <ClassSubjectsPanel classes={classes} subjects={subjects} />
      </div>
    </div>
  );
}
