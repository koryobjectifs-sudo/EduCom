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
  receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
  issueDate: new Date().toISOString().split('T')[0],
  motif: "Frais de Cantine",
  amount: 15000,
  paymentMethod: "Espèces",
  signatureData: null as string | null
});

export default function ReceiptGenerator({ students, school, initialStudentId }: { students: any[], school: any, initialStudentId?: string | null }) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  // State for document data
  const [receiptNumber, setReceiptNumber] = useState(getEmptyState().receiptNumber);
  const [issueDate, setIssueDate] = useState(getEmptyState().issueDate);
  const [motif, setMotif] = useState(getEmptyState().motif);
  const [amount, setAmount] = useState(getEmptyState().amount);
  const [paymentMethod, setPaymentMethod] = useState(getEmptyState().paymentMethod);
  const [signatureData, setSignatureData] = useState<string | null>(getEmptyState().signatureData);

  // Modals state
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [savedDraftsList, setSavedDraftsList] = useState<any[]>([]);

  const openDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("draft_receipt_")) {
        const studentId = key.replace("draft_receipt_", "");
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
    localStorage.removeItem(`draft_receipt_${studentId}`);
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
          
          const draftKey = `draft_receipt_${studentIdFromUrl}`;
          const savedData = localStorage.getItem(draftKey);
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setReceiptNumber(parsed.receiptNumber || getEmptyState().receiptNumber);
              setIssueDate(parsed.issueDate || getEmptyState().issueDate);
              setMotif(parsed.motif || getEmptyState().motif);
              setAmount(parsed.amount || getEmptyState().amount);
              setPaymentMethod(parsed.paymentMethod || getEmptyState().paymentMethod);
              setSignatureData(parsed.signatureData || getEmptyState().signatureData);
              setSavedSnapshot(savedData);
            } catch (e) {
              setSavedSnapshot(JSON.stringify(getEmptyState()));
            }
          }
          setShowEditorModal(true);
          window.history.replaceState({}, '', '/dashboard/documents/receipt');
        }, 50);
      }
    }
  }, []);

  const currentStateStr = JSON.stringify({ receiptNumber, issueDate, motif, amount, paymentMethod, signatureData });
  const hasChanges = isClient && currentStateStr !== savedSnapshot;

  const applyState = (state: any) => {
    setReceiptNumber(state.receiptNumber || getEmptyState().receiptNumber);
    setIssueDate(state.issueDate || getEmptyState().issueDate);
    setMotif(state.motif || getEmptyState().motif);
    setAmount(state.amount || getEmptyState().amount);
    setPaymentMethod(state.paymentMethod || getEmptyState().paymentMethod);
    setSignatureData(state.signatureData || getEmptyState().signatureData);
    
    setSavedSnapshot(JSON.stringify({
      receiptNumber: state.receiptNumber || getEmptyState().receiptNumber,
      issueDate: state.issueDate || getEmptyState().issueDate,
      motif: state.motif || getEmptyState().motif,
      amount: state.amount || getEmptyState().amount,
      paymentMethod: state.paymentMethod || getEmptyState().paymentMethod,
      signatureData: state.signatureData || getEmptyState().signatureData
    }));
  };

  const loadDraftOrEmpty = (studentId: string) => {
    if (!studentId) {
      applyState(getEmptyState());
      return;
    }
    const draftStr = localStorage.getItem(`draft_receipt_${studentId}`);
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
      const stateToSave = { receiptNumber, issueDate, motif, amount, paymentMethod, signatureData };
      localStorage.setItem(`draft_receipt_${selectedStudentId}`, JSON.stringify(stateToSave));
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
              Éditeur de Reçu
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
          className="bg-white w-full p-12 shadow-sm border border-gray-200 rounded-xl flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:max-w-none overflow-hidden z-10 transition-all duration-300"
        >
          {/* Subtle watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0">
            <div className="w-[400px] h-[400px] rounded-full bg-amber-600 blur-3xl"></div>
          </div>

          <div className="relative z-10 h-full flex flex-col">
            {/* En-tête */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gray-900 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{school?.name?.charAt(0) || "E"}</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-gray-900">{school?.name || "—"}</h1>
                  <p className="text-sm text-gray-500 mt-1">{school?.address || "Dakar, Sénégal"}</p>
                  {/* ⚠️ Replis fictifs retirés : ils imprimaient un téléphone et un email
                      qui n'appartiennent pas à l'école. Même défaut que le nom
                      d'établissement corrigé au lot 00. On n'affiche que le réel. */}
                  {(school?.phone || school?.email) && (
                    <p className="text-sm text-gray-500">
                      {[school?.phone, school?.email].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest border-2 border-gray-900 px-4 py-2 inline-block">Reçu</h2>
                <p className="text-sm font-semibold text-gray-500 mt-3 tracking-wider">N° {receiptNumber}</p>
                <p className="text-sm text-gray-500 font-medium">Date: {new Date(issueDate).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>

            {student ? (
              <div className="space-y-8 flex-grow">
                
                {/* Infos Paiement */}
                <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reçu de</p>
                      <p className="text-lg font-bold text-gray-900" contentEditable suppressContentEditableWarning>M./Mme {student.parent?.firstName} {student.parent?.lastName}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        Pour l'élève : <span className="font-semibold text-gray-900">{student.firstName} {student.lastName}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Classe : <span className="font-semibold text-gray-900">{currentClass}</span>
                      </p>
                    </div>
                    <div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Montant Payé</p>
                        <p className="text-3xl font-black text-amber-600">{amount.toLocaleString("fr-FR")} <span className="text-lg text-amber-600/70">FCFA</span></p>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-xs text-gray-500">Moyen de paiement</span>
                          <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded" contentEditable suppressContentEditableWarning>{paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Motif */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Motif du paiement</h3>
                  <p className="text-lg text-gray-800" contentEditable suppressContentEditableWarning>{motif}</p>
                </div>

                <div className="flex-grow"></div>

                {/* Signature */}
                <div className="flex justify-between items-end pt-12">
                  <div className="text-xs text-gray-500 italic max-w-sm">
                    Ce reçu atteste du paiement du montant indiqué. Conservez ce document précieusement.
                  </div>
                  <div className="text-center w-64">
                    <p className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Cachet et Signature</p>
                    {signatureData ? (
                      <div className="h-24 flex items-center justify-center">
                        <img src={signatureData} alt="Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-24 w-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                        <span className="text-xs text-gray-400 italic">Signature</span>
                      </div>
                    )}
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
      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                Configuration du Reçu
              </h3>
              <button onClick={() => setShowEditorModal(false)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Motif du paiement</label>
                <input 
                  type="text"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex: Frais de scolarité, Cantine..."
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Montant (FCFA)</label>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Paiement via</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Wave">Wave</option>
                  </select>
                </div>
              </div>

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
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between items-center">
                  <span>Signature ou Cachet</span>
                  {signatureData && (
                    <button 
                      onClick={() => setSignatureData(null)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Effacer
                    </button>
                  )}
                </label>
                {signatureData ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center h-48">
                    <img src={signatureData} alt="Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner h-48">
                    <SignaturePad onSignatureChange={setSignatureData} />
                  </div>
                )}
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
                Brouillons de Reçus
              </h3>
              <button onClick={() => setShowDraftsModal(false)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {savedDraftsList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucun brouillon de reçu sauvegardé.
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
