/**
 * ARCHIVE — copie figée, phase 0 du chantier « Générateur de documents ».
 *
 * Origine  : src/app/dashboard/documents/info-sheet/Generator.tsx
 * Figé le  : 2026-09-11, étiquette Git v17-documents-baseline
 * Référence : docs/documents-reference/ (PDF générés depuis CETTE version)
 *
 * ⚠️ Copie de lecture seule, non importée par l'application. Sert de point
 * de comparaison et de retour si le nouveau générateur (jalons v17-documents
 * / v17-documents-libre) doit être abandonné. Ne pas modifier : modifier
 * l'original à `src/app/dashboard/documents/info-sheet/Generator.tsx`.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/dateUtils";
import { 
  ArrowLeft, Printer, Save, Download, FileText, X,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, LayoutTemplate,
  ListTodo, AlertTriangle, Trash2
} from "lucide-react";

const getEmptyState = () => ({});

export default function InfoSheetGenerator({
  students,
  initialStudentId,
  school,
}: {
  students: any[];
  initialStudentId?: string | null;
  school?: { name: string; address: string | null } | null;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  // Modals state
  const [showEditorModal, setShowEditorModal] = useState(false);

  // Drafts Modal
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [savedDraftsList, setSavedDraftsList] = useState<any[]>([]);

  const openDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("draft_infosheet_")) {
        const studentId = key.replace("draft_infosheet_", "");
        const s = students.find((st) => st.id === studentId);
        if (s) {
          drafts.push(s);
        }
      }
    }
    setSavedDraftsList(drafts);
    setShowDraftsModal(true);
  };
  
  const deleteDraft = (studentId: string) => {
    localStorage.removeItem(`draft_infosheet_${studentId}`);
    setSavedDraftsList(savedDraftsList.filter(s => s.id !== studentId));
  };

  // WYSIWYG options
  const [paperFormat, setPaperFormat] = useState<"A4" | "A5">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  // Drafts & Unsaved changes state
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setSavedSnapshot(JSON.stringify(getEmptyState()));
    
    // Auto-load draft from URL if resuming from drafts page
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const studentIdFromUrl = params.get("studentId");
      if (studentIdFromUrl) {
        setTimeout(() => {
          setSelectedStudentId(studentIdFromUrl);
          
          const draftKey = `draft_infosheet_${studentIdFromUrl}`;
          const savedData = localStorage.getItem(draftKey);
          // Draft state removed since medical data is removed
          window.history.replaceState({}, '', '/dashboard/documents/info-sheet');
        }, 50);
      }
    }
  }, []);

  const currentStateStr = JSON.stringify({});
  const hasChanges = false;

  const applyState = (state: any) => {
    setSavedSnapshot(JSON.stringify({}));
  };

  const loadDraftOrEmpty = (studentId: string) => {
    if (!studentId) {
      applyState(getEmptyState());
      return;
    }
    const draftStr = localStorage.getItem(`draft_infosheet_${studentId}`);
    if (draftStr) {
      try {
        applyState(JSON.parse(draftStr));
      } catch (e) {
        applyState(getEmptyState());
      }
    } else {
      applyState(getEmptyState());
    }
  };

  const saveDraft = () => {
    // No-op since we removed the editable fields
  };

  // Présélection depuis le profil élève (?studentId=...). On passe par
  // handleStudentSelect pour réutiliser exactement le chemin d'une sélection
  // manuelle : chargement du brouillon et ouverture de l'éditeur compris.
  useEffect(() => {
    if (initialStudentId) handleStudentSelect(initialStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStudentSelect = (newId: string) => {
    if (newId === selectedStudentId) return;
    
    if (selectedStudentId && hasChanges) {
      setPendingStudentId(newId);
    } else {
      setSelectedStudentId(newId);
      loadDraftOrEmpty(newId);
      if (newId) setShowEditorModal(true);
    }
  };

  const confirmChangeStudent = (action: "save" | "discard") => {
    if (action === "save") {
      saveDraft();
    }
    setSelectedStudentId(pendingStudentId!);
    loadDraftOrEmpty(pendingStudentId!);
    if (pendingStudentId) setShowEditorModal(true);
    setPendingStudentId(null);
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false, undefined);
  };

  const student = students.find(s => s.id === selectedStudentId);
  const currentClass = student?.enrollments[0]?.class?.name || "Non assigné";

  // Dynamic layout calculations
  const aspect = orientation === "portrait" ? 1 / 1.414 : 1.414 / 1;
  const maxWidth = paperFormat === "A4" 
    ? (orientation === "portrait" ? "210mm" : "297mm") 
    : (orientation === "portrait" ? "148mm" : "210mm");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-7xl pb-12 print:p-0 print:m-0 print:pb-0 relative">

      {/* WYSIWYG Toolbar */}
      <div className="w-full bg-white border border-gray-200 rounded-xl print:hidden shadow-sm flex flex-col relative z-20 mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/documents" className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 mr-1" title="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Automation Dropdown */}
            <select 
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold text-gray-800 focus:ring-0 cursor-pointer py-1 pl-2 pr-6 hover:bg-gray-100 rounded-md"
            >
              <option value="">Sélectionner un élève...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            <button onClick={() => setShowEditorModal(true)} className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 rounded-md text-sm text-gray-700">
              <ListTodo className="w-4 h-4 text-blue-600" />
              Éditeur de Fiche
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={openDrafts}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded px-3 py-1.5 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Brouillons
            </button>
            <button 
              onClick={saveDraft}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded px-3 py-1.5 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Enregistrer {hasChanges && <span className="w-2 h-2 rounded-full bg-blue-500 ml-1"></span>}
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-700 rounded px-3 py-1.5 shadow-sm hover:bg-green-800">
              <Download className="w-3.5 h-3.5" /> Exporter PDF
            </button>
          </div>
        </div>

        {/* Text Formatting Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-b-xl overflow-x-auto">
          {/* Style */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Gras">
              <Bold className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Italique">
              <Italic className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Souligné">
              <Underline className="w-4 h-4" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyLeft'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Aligner à gauche">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyCenter'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Centrer">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyRight'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Aligner à droite">
              <AlignRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page Setup */}
          <div className="flex items-center gap-3 text-sm pl-2">
            <div className="flex items-center gap-1.5 hover:bg-gray-100 rounded px-2 py-1 transition-colors">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value as any)} className="bg-transparent border-none text-xs focus:ring-0 cursor-pointer p-0 pr-4 text-gray-700 font-medium">
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 hover:bg-gray-100 rounded px-2 py-1 transition-colors">
              <LayoutTemplate className="w-3.5 h-3.5 text-gray-500" />
              <select value={orientation} onChange={(e) => setOrientation(e.target.value as any)} className="bg-transparent border-none text-xs focus:ring-0 cursor-pointer p-0 pr-4 text-gray-700 font-medium">
                <option value="portrait">Portrait</option>
                <option value="landscape">Paysage</option>
              </select>
            </div>
          </div>
          
          <div className="ml-auto flex items-center text-xs text-gray-400 font-medium italic">
            Vous pouvez cliquer directement sur le texte du document pour le modifier.
          </div>
        </div>
      </div>

      {/* Action Bar below Toolbar */}
      <div className="flex justify-end w-full max-w-5xl mx-auto mb-6 print:hidden">
         <button onClick={() => setShowEditorModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.3)] hover:-translate-y-0.5 transition-all font-semibold text-sm">
           <ListTodo className="w-4 h-4" />
           Ouvrir l'éditeur automatique
         </button>
      </div>

      {/* Document Area */}
      <div className="flex flex-col items-center print:block print:static">
          
        {/* The Document */}
        <div 
          style={{ maxWidth, aspectRatio: aspect }} 
          className="bg-white w-full p-10 shadow-sm border border-gray-200 rounded-xl flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:max-w-none overflow-hidden z-10 transition-all duration-300"
        >
          {/* En-tête (Design minimaliste) */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6 z-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">Fiche d'Information</h1>
              <p className="text-gray-500 mt-1 uppercase tracking-widest text-xs font-semibold">Année Scolaire 2023-2024</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900">{school?.name || "—"}</h2>
              {school?.address && <p className="text-sm text-gray-600 mt-1">{school.address}</p>}
              <p className="text-xs text-gray-400">Réf: INFO-{new Date().getFullYear()}-{student?.id?.substring(0, 5) || "XXXXX"}</p>
            </div>
          </div>

          {student ? (
            <div className="space-y-6">
              {/* Section Élève */}
              <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 border-b border-gray-200 pb-2">1. Identité de l'Élève</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Nom de famille</p>
                    <p className="font-semibold text-lg text-gray-900" contentEditable suppressContentEditableWarning>{student.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Prénoms</p>
                    <p className="font-semibold text-lg text-gray-900" contentEditable suppressContentEditableWarning>{student.firstName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Date de naissance</p>
                    <p className="font-medium text-gray-700" contentEditable suppressContentEditableWarning>
                      {student.dateOfBirth ? formatDate(student.dateOfBirth) : "Non renseignée"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Classe assignée</p>
                    <p className="font-bold text-blue-700 bg-blue-50 w-fit px-2 py-0.5 rounded" contentEditable suppressContentEditableWarning>{currentClass}</p>
                  </div>
                </div>
              </div>

              {/* Section Responsable */}
              <div className="rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 border-b border-gray-200 pb-2">2. Responsable Légal</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase">Nom complet</p>
                    <p className="font-semibold text-gray-900" contentEditable suppressContentEditableWarning>{student.parent?.firstName} {student.parent?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Téléphone</p>
                    <p className="font-medium text-gray-700" contentEditable suppressContentEditableWarning>{student.parent?.phone || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Email</p>
                    <p className="font-medium text-gray-700" contentEditable suppressContentEditableWarning>{student.parent?.email || "Non renseigné"}</p>
                  </div>
                </div>
              </div>



              <div className="pt-8 flex justify-between items-end">
                <div className="w-1/2">
                  <p className="text-xs text-gray-500 italic">
                    Je soussigné(e), certifie l'exactitude des renseignements portés sur cette fiche.
                  </p>
                </div>
                <div className="text-center w-48">
                  <p className="text-sm text-gray-600 mb-2">Signature du parent</p>
                  <div className="h-16 border-b border-dotted border-gray-400"></div>
                </div>
              </div>

            </div>
          ) : (
            <div className="w-full h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 print:hidden mt-8">
              Sélectionnez un élève dans la barre d'outils.
            </div>
          )}
        </div>
      </div>



      {/* Unsaved Changes Warning Modal */}
      {pendingStudentId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Changements non enregistrés</h3>
              <p className="text-sm text-gray-600 mb-8">
                Vous avez des modifications en cours pour {students.find(s => s.id === selectedStudentId)?.firstName}. 
                Voulez-vous les enregistrer dans vos brouillons avant de changer d'élève ?
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => confirmChangeStudent("save")}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Oui, enregistrer le brouillon
                </button>
                <button 
                  onClick={() => confirmChangeStudent("discard")}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Non, ignorer les modifications
                </button>
                <button 
                  onClick={() => setPendingStudentId(null)}
                  className="w-full py-3 px-4 text-gray-500 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drafts Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Brouillons de Fiches
              </h3>
              <button onClick={() => setShowDraftsModal(false)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {savedDraftsList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucun brouillon de fiche sauvegardé.
                </div>
              ) : (
                savedDraftsList.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-gray-500">{s.enrollments?.[0]?.class?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          loadDraftOrEmpty(s.id);
                          setShowDraftsModal(false);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                      >
                        Reprendre
                      </button>
                      <button 
                        onClick={() => deleteDraft(s.id)}
                        className="px-2 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
