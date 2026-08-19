"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Printer, Save, Download, FileText, X,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, LayoutTemplate,
  ListTodo, AlertTriangle, Trash2, CalendarDays
} from "lucide-react";

const getEmptyState = () => ({
  academicYear: "2023-2024",
  period: "",
  notes: "",
  cells: {} as Record<string, string>
});

export default function TimetableGenerator({ classes }: { classes: any[] }) {
  const [selectedClassId, setSelectedClassId] = useState("");
  
  // State for document data
  const [academicYear, setAcademicYear] = useState("2023-2024");
  const [period, setPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [cells, setCells] = useState<Record<string, string>>({});

  // Modals state
  const [showEditorModal, setShowEditorModal] = useState(false);

  // Drafts Modal
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [savedDraftsList, setSavedDraftsList] = useState<any[]>([]);

  const openDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("draft_timetable_")) {
        const classId = key.replace("draft_timetable_", "");
        const c = classes.find((cl) => cl.id === classId);
        if (c) {
          drafts.push(c);
        }
      }
    }
    setSavedDraftsList(drafts);
    setShowDraftsModal(true);
  };
  
  const deleteDraft = (classId: string) => {
    localStorage.removeItem(`draft_timetable_${classId}`);
    setSavedDraftsList(savedDraftsList.filter(c => c.id !== classId));
  };

  // WYSIWYG options
  const [paperFormat, setPaperFormat] = useState<"A4" | "A5">("A4");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  // Drafts & Unsaved changes state
  const [pendingClassId, setPendingClassId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setSavedSnapshot(JSON.stringify(getEmptyState()));
    
    // Auto-load draft from URL if resuming from drafts page
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const classIdFromUrl = params.get("classId"); // Reusing similar logic, but param is classId
      if (classIdFromUrl) {
        setTimeout(() => {
          setSelectedClassId(classIdFromUrl);
          
          const draftKey = `draft_timetable_${classIdFromUrl}`;
          const savedData = localStorage.getItem(draftKey);
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setAcademicYear(parsed.academicYear || "2023-2024");
              setPeriod(parsed.period || "");
              setNotes(parsed.notes || "");
              setCells(parsed.cells || {});
              setSavedSnapshot(savedData);
            } catch (e) {
              setSavedSnapshot(JSON.stringify(getEmptyState()));
            }
          }
          setShowEditorModal(true);
          window.history.replaceState({}, '', '/dashboard/documents/timetable');
        }, 50);
      }
    }
  }, []);

  const currentStateStr = JSON.stringify({ academicYear, period, notes, cells });
  const hasChanges = isClient && currentStateStr !== savedSnapshot;

  const applyState = (state: any) => {
    setAcademicYear(state.academicYear || "2023-2024");
    setPeriod(state.period || "");
    setNotes(state.notes || "");
    setCells(state.cells || {});
    setSavedSnapshot(JSON.stringify({
      academicYear: state.academicYear || "2023-2024",
      period: state.period || "",
      notes: state.notes || "",
      cells: state.cells || {}
    }));
  };

  const loadDraftOrEmpty = (classId: string) => {
    if (!classId) {
      applyState(getEmptyState());
      return;
    }
    const draftStr = localStorage.getItem(`draft_timetable_${classId}`);
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
    if (selectedClassId) {
      const stateToSave = { academicYear, period, notes, cells };
      localStorage.setItem(`draft_timetable_${selectedClassId}`, JSON.stringify(stateToSave));
      setSavedSnapshot(JSON.stringify(stateToSave));
    }
  };

  const handleClassSelect = (newId: string) => {
    if (newId === selectedClassId) return;
    
    if (selectedClassId && hasChanges) {
      setPendingClassId(newId);
    } else {
      setSelectedClassId(newId);
      loadDraftOrEmpty(newId);
      if (newId) setShowEditorModal(true);
    }
  };

  const confirmChangeClass = (action: "save" | "discard") => {
    if (action === "save") {
      saveDraft();
    }
    setSelectedClassId(pendingClassId!);
    loadDraftOrEmpty(pendingClassId!);
    if (pendingClassId) setShowEditorModal(true);
    setPendingClassId(null);
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false, undefined);
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Dynamic layout calculations
  const aspect = orientation === "landscape" ? 1.414 / 1 : 1 / 1.414;
  const maxWidth = paperFormat === "A4" 
    ? (orientation === "landscape" ? "297mm" : "210mm") 
    : (orientation === "landscape" ? "210mm" : "148mm");

  const handlePrint = () => {
    window.print();
  };

  const handleCellBlur = (key: string, content: string) => {
    setCells(prev => ({ ...prev, [key]: content }));
  };

  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const hours = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00 (Pause)",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
    "16:00 - 17:00"
  ];

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
              value={selectedClassId}
              onChange={(e) => handleClassSelect(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold text-gray-800 focus:ring-0 cursor-pointer py-1 pl-2 pr-6 hover:bg-gray-100 rounded-md"
            >
              <option value="">Sélectionner une classe...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            <button onClick={() => setShowEditorModal(true)} className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 rounded-md text-sm text-gray-700">
              <ListTodo className="w-4 h-4 text-blue-600" />
              Éditeur de Configuration
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
                <option value="landscape">Paysage</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>
          
          <div className="ml-auto flex items-center text-xs text-gray-400 font-medium italic">
            Cliquez directement sur les cases du tableau pour les modifier.
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
          className="bg-white w-full p-10 shadow-sm border border-gray-200 rounded-sm flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:max-w-none print:aspect-auto overflow-hidden z-10 transition-all duration-300"
        >
          <div className="flex justify-between items-end border-b-2 border-gray-900 pb-4 mb-6 z-10">
            <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-gray-900" />
                Emploi du Temps {period ? `- ${period}` : ""}
              </h1>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">Année Scolaire <span contentEditable suppressContentEditableWarning className="outline-none focus:bg-gray-100 rounded px-1">{academicYear}</span></p>
            </div>
            {selectedClass && (
              <div className="text-right">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Classe</span>
                <span className="text-2xl font-black text-gray-900 border-2 border-gray-900 px-4 py-1 rounded inline-block bg-gray-100" contentEditable suppressContentEditableWarning>{selectedClass.name}</span>
              </div>
            )}
          </div>

          {selectedClass ? (
            <div className="flex-grow flex flex-col z-10">
              <table className="w-full h-full border-collapse border-2 border-gray-900 text-center table-fixed">
                <thead>
                  <tr>
                    <th className="border-2 border-gray-900 bg-gray-100 p-2 w-32">Heures</th>
                    {days.map(day => (
                      <th key={day} className="border-2 border-gray-900 bg-gray-100 p-2 font-semibold uppercase text-xs tracking-wider">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((hour, idx) => {
                    const isPause = hour.includes("Pause");
                    return (
                      <tr key={idx} className={isPause ? "bg-gray-100/50" : ""}>
                        <td className="border border-gray-900 p-2 font-semibold text-xs text-gray-700 bg-gray-50 whitespace-nowrap">{hour}</td>
                        {days.map((day, dIdx) => {
                          const cellKey = `${idx}-${dIdx}`;
                          return (
                            <td 
                              key={cellKey} 
                              className={`border border-gray-900 p-2 min-h-[4rem] relative ${isPause ? "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2U1ZTdlYiIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] text-gray-400 font-semibold tracking-widest uppercase text-xs" : ""}`}
                            >
                              {isPause ? (
                                "RECRÉATION"
                              ) : (
                                <div 
                                  contentEditable 
                                  suppressContentEditableWarning 
                                  onBlur={(e) => handleCellBlur(cellKey, e.currentTarget.innerText)}
                                  className="w-full h-full min-h-[3rem] outline-none focus:bg-blue-50/50 rounded flex flex-col justify-center items-center p-1 break-words"
                                  dangerouslySetInnerHTML={{ __html: cells[cellKey] || "" }}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-6 flex justify-between">
                <div className="text-sm text-gray-600 italic">
                  Document généré le {new Date().toLocaleDateString("fr-FR")}
                </div>
                {notes && (
                  <div className="text-sm font-medium text-gray-800">
                    {notes}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 print:hidden mt-12 z-10">
              Sélectionnez une classe dans la barre d'outils.
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                Configuration de l'Emploi du Temps
              </h3>
              <button onClick={() => setShowEditorModal(false)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Année Scolaire</label>
                <input 
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Période (Optionnel)</label>
                <input 
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="Ex: 1er Semestre"
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Note en bas de page (Optionnel)</label>
                <input 
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Emploi du temps provisoire..."
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">💡 Astuce d'édition</p>
                <p className="text-xs text-blue-600 mt-1">Pour remplir les matières, fermez cette fenêtre et cliquez directement dans les cases du tableau sur le document. Vous pouvez utiliser la barre d'outils pour mettre en gras, centrer, etc.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowEditorModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                Valider et remplir le tableau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {pendingClassId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Changements non enregistrés</h3>
              <p className="text-sm text-gray-600 mb-8">
                Vous avez des modifications en cours pour {classes.find(c => c.id === selectedClassId)?.name}. 
                Voulez-vous les enregistrer dans vos brouillons avant de changer de classe ?
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => confirmChangeClass("save")}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Oui, enregistrer le brouillon
                </button>
                <button 
                  onClick={() => confirmChangeClass("discard")}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Non, ignorer les modifications
                </button>
                <button 
                  onClick={() => setPendingClassId(null)}
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
                Brouillons d'Emplois du Temps
              </h3>
              <button onClick={() => setShowDraftsModal(false)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {savedDraftsList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucun brouillon d'emploi du temps sauvegardé.
                </div>
              ) : (
                savedDraftsList.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Classe de {c.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedClassId(c.id);
                          loadDraftOrEmpty(c.id);
                          setShowDraftsModal(false);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                      >
                        Reprendre
                      </button>
                      <button 
                        onClick={() => deleteDraft(c.id)}
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
