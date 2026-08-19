"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Printer, Save, Download, FileText, X,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, LayoutTemplate,
  ListTodo, AlertTriangle, Trash2
} from "lucide-react";
import { SignaturePad } from "@/app/dashboard/payments/new/SignaturePad";

const getEmptyState = () => ({
  issueDate: new Date().toISOString().split('T')[0],
  signatureData: null as string | null
});

/**
 * ⚠️ `academicYear` vient du SERVEUR (chantier PLG). L'année était écrite en
 * dur — « 2023-2024 » — dans le corps du certificat : le tout premier document
 * produit par une école sortait avec une année scolaire vieille de trois ans.
 * Elle ne peut pas être calculée ici : `currentAcademicYear()` vit dans
 * `studentFile.ts`, qui importe Prisma, et un composant client qui l'importerait
 * casserait la route (piège du lot 13.1). La page la calcule et la descend.
 */
export default function CertificateGenerator({ students, school, initialStudentId, academicYear }: { students: any[], school: any, initialStudentId?: string | null, academicYear: string }) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  // State for document data
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Modals state
  const [showEditorModal, setShowEditorModal] = useState(false);

  // Drafts Modal
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [savedDraftsList, setSavedDraftsList] = useState<any[]>([]);

  const openDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("draft_certificate_")) {
        const studentId = key.replace("draft_certificate_", "");
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
    localStorage.removeItem(`draft_certificate_${studentId}`);
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
          
          const draftKey = `draft_certificate_${studentIdFromUrl}`;
          const savedData = localStorage.getItem(draftKey);
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setIssueDate(parsed.issueDate || new Date().toISOString().split('T')[0]);
              setSignatureData(parsed.signatureData || null);
              setSavedSnapshot(savedData);
            } catch (e) {
              setSavedSnapshot(JSON.stringify(getEmptyState()));
            }
          }
          setShowEditorModal(true);
          window.history.replaceState({}, '', '/dashboard/documents/certificate');
        }, 50);
      }
    }
  }, []);

  const currentStateStr = JSON.stringify({ issueDate, signatureData });
  const hasChanges = isClient && currentStateStr !== savedSnapshot;

  const applyState = (state: any) => {
    setIssueDate(state.issueDate || new Date().toISOString().split('T')[0]);
    setSignatureData(state.signatureData || null);
    setSavedSnapshot(JSON.stringify({
      issueDate: state.issueDate || new Date().toISOString().split('T')[0],
      signatureData: state.signatureData || null
    }));
  };

  const loadDraftOrEmpty = (studentId: string) => {
    if (!studentId) {
      applyState(getEmptyState());
      return;
    }
    const draftStr = localStorage.getItem(`draft_certificate_${studentId}`);
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
    if (selectedStudentId) {
      const stateToSave = { issueDate, signatureData };
      localStorage.setItem(`draft_certificate_${selectedStudentId}`, JSON.stringify(stateToSave));
      setSavedSnapshot(JSON.stringify(stateToSave));
    }
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
        {/* ⚠️ Chantier PLG — CAUSE RÉELLE du débordement de 847 px sur un écran de
            390 : cette rangée était un `flex` sans `flex-wrap`. Ses deux groupes
            (retour + sélecteur d'élève + éditeur à gauche, trois boutons à
            droite) ne peuvent pas descendre sous leur largeur mini — un enfant
            de flex a `min-width: auto` — et poussaient donc la PAGE ENTIÈRE à
            ~847 px. Le conteneur de défilement posé autour de l'aperçu A4 ne
            pouvait rien y faire : le coupable n'était pas la feuille, il était
            ici. Elle passe maintenant à la ligne, et le sélecteur peut rétrécir. */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/dashboard/documents" className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 mr-1" title="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Automation Dropdown */}
            <select 
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="min-h-9 min-w-0 max-w-[10rem] truncate bg-transparent border-none text-sm font-semibold text-gray-800 focus:ring-0 cursor-pointer py-1.5 pl-2 pr-6 hover:bg-gray-100 rounded-md sm:max-w-none"
            >
              <option value="">Sélectionner un élève...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {/* Masqué sur téléphone : le même bouton, en grand, est juste dessous. */}
            <button onClick={() => setShowEditorModal(true)} className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-100 rounded-md text-sm text-gray-700">
              <ListTodo className="w-4 h-4 text-blue-600" />
              Éditeur de Certificat
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={openDrafts}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Brouillons
            </button>
            <button 
              onClick={saveDraft}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Enregistrer {hasChanges && <span className="w-2 h-2 rounded-full bg-blue-500 ml-1"></span>}
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-700 rounded px-3 py-2 shadow-sm hover:bg-green-800">
              <Download className="w-3.5 h-3.5" /> Exporter PDF
            </button>
          </div>
        </div>

        {/* Text Formatting Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-b-xl overflow-x-auto">
          {/* Style */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Gras">
              <Bold className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Italique">
              <Italic className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Souligné">
              <Underline className="w-4 h-4" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyLeft'); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Aligner à gauche">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyCenter'); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Centrer">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyRight'); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Aligner à droite">
              <AlignRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page Setup */}
          <div className="flex items-center gap-3 text-sm pl-2">
            <div className="flex min-h-9 items-center gap-1.5 hover:bg-gray-100 rounded px-2 py-1 transition-colors">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value as any)} className="min-h-8 bg-transparent border-none text-xs focus:ring-0 cursor-pointer p-0 pr-4 text-gray-700 font-medium">
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </select>
            </div>
            <div className="flex min-h-9 items-center gap-1.5 hover:bg-gray-100 rounded px-2 py-1 transition-colors">
              <LayoutTemplate className="w-3.5 h-3.5 text-gray-500" />
              <select value={orientation} onChange={(e) => setOrientation(e.target.value as any)} className="min-h-8 bg-transparent border-none text-xs focus:ring-0 cursor-pointer p-0 pr-4 text-gray-700 font-medium">
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
      {/* ⚠️ Un conteneur `overflow-x-auto` avait été posé ici sur l'hypothèse que
          la feuille A4 poussait la page à 847 px de large. C'ÉTAIT FAUX : la
          feuille est en `w-full` et se réduit à son conteneur. Le débordement
          venait de la rangée haute de la barre d'outils, un `flex` sans
          `flex-wrap` (voir plus haut). L'échafaudage est retiré — il ajoutait
          trois surcharges d'impression pour ne rien corriger, et
          `verify-documents` a signalé l'écart avec le gabarit du lot 09.

          ⚠️ Au passage : ce vérificateur compte les classes d'impression dans le
          SOURCE, commentaires compris. Écrire le préfixe dans une note suffit à
          le faire échouer — d'où la périphrase ci-dessus. */}
      <div className="flex flex-col items-center print:block print:static">
          
        {/* The Document */}
        <div 
          style={{ maxWidth, aspectRatio: aspect }} 
          className="bg-white w-full p-12 shadow-sm border border-gray-200 rounded-xl flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:max-w-none overflow-hidden z-10 transition-all duration-300"
        >
          {/* WATERMARK LOGO */}
          {school?.logo && (
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none -z-10 opacity-[0.05]">
              <img src={school.logo} alt="" className="w-2/3 object-contain grayscale" />
            </div>
          )}

          {/* En-tête de l'école */}
          <div className="flex flex-col items-center border-b-2 border-gray-900 pb-6 text-center z-10">
            <div className="flex items-center gap-4 mb-2">
              {school?.logo ? (
                <img src={school.logo} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-900 text-white font-semibold text-2xl">
                  {school?.name?.charAt(0) || "E"}
                </div>
              )}
              <span className="text-3xl font-semibold text-gray-900 tracking-tight uppercase">{school?.name || "—"}</span>
            </div>
            <p className="text-sm text-gray-600">Ministère de l'Éducation Nationale</p>
            <p className="text-sm text-gray-600">
              {school?.address ? `${school.address}` : ""}
              {school?.phone ? ` - Tél: ${school.phone}` : ""}
              {school?.email ? ` - Email: ${school.email}` : ""}
            </p>
          </div>

          <div className="flex-grow flex flex-col items-center pt-16">
            <h1 className="text-3xl font-semibold text-gray-900 uppercase tracking-widest underline decoration-2 underline-offset-8 mb-16">
              Certificat de Scolarité
            </h1>

            {student ? (
              <div className="w-full text-lg leading-loose text-justify text-gray-800">
                <p className="indent-8 mb-4">
                  Le Directeur de l'établissement <strong contentEditable suppressContentEditableWarning className="outline-none focus:bg-gray-100 px-1 rounded">{school?.name || "—"}</strong>, soussigné, certifie par la présente que :
                </p>
                <div className="my-8 text-center bg-gray-50/50 p-6 rounded-xl border border-gray-100 print:border-none print:bg-transparent">
                  <p contentEditable suppressContentEditableWarning className="text-2xl font-semibold text-gray-900 uppercase outline-none focus:bg-white rounded px-1">{student.firstName} {student.lastName}</p>
                  {student.dateOfBirth && (
                    <p contentEditable suppressContentEditableWarning className="text-base text-gray-600 mt-2 outline-none focus:bg-white rounded px-1">
                      Né(e) le {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <p className="indent-8">
                  est régulièrement inscrit(e) dans notre établissement pour l'année scolaire <strong contentEditable suppressContentEditableWarning className="outline-none focus:bg-gray-100 px-1 rounded">{academicYear}</strong> et suit les cours dans la classe de <strong contentEditable suppressContentEditableWarning className="outline-none focus:bg-gray-100 px-1 rounded">{currentClass}</strong>.
                </p>
                <p className="mt-8 indent-8" contentEditable suppressContentEditableWarning>
                  En foi de quoi, ce certificat lui est délivré pour servir et valoir ce que de droit.
                </p>
              </div>
            ) : (
              <div className="w-full h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 print:hidden">
                Sélectionnez un élève dans la barre d'outils.
              </div>
            )}
          </div>

          {/* Pied de page et Signature */}
          <div className="mt-auto pt-16 flex justify-between items-end">
            <div className="text-xs text-gray-400">
              <p>Document généré informatiquement.</p>
              <p>Réf: CERT-{new Date().getFullYear()}-{student?.id?.substring(0, 5) || "XXXXX"}</p>
            </div>
            <div className="text-center w-64">
              <p className="text-sm text-gray-600 mb-6">
                Fait à <span contentEditable suppressContentEditableWarning className="outline-none focus:bg-gray-100 px-1 rounded">Dakar</span>, le {new Date(issueDate).toLocaleDateString("fr-FR")}
              </p>
              <p className="font-semibold text-gray-900 uppercase text-sm">Le Directeur</p>
              <div className="mt-4 h-24 flex items-center justify-center border border-dashed border-gray-200 rounded-lg print:border-none">
                {signatureData ? (
                  <img src={signatureData} alt="Signature" className="max-h-24 max-w-full object-contain mix-blend-multiply" />
                ) : (
                  <span className="text-gray-300 italic text-xs print:hidden">Signature ici</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                Éditeur de Certificat
              </h3>
              {/* ⚠️ 28 px de haut, et AUCUN nom accessible : la sonde ne pouvait
                  le désigner que par « BUTTON ». C'est le bouton qui referme
                  l'éditeur — le seul moyen de sortir de la fenêtre. Un lecteur
                  d'écran annonçait « bouton », sans dire lequel. */}
              <button
                type="button"
                aria-label="Fermer l'éditeur"
                onClick={() => setShowEditorModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
              >
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date d'émission</label>
                <input 
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Signature du Directeur</label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <SignaturePad onSignatureChange={setSignatureData} />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowEditorModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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
                Brouillons de Certificats
              </h3>
              <button onClick={() => setShowDraftsModal(false)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {savedDraftsList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucun brouillon de certificat sauvegardé.
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
