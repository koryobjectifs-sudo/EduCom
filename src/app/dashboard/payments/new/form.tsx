"use client";

import { useActionState, useState } from "react";
import { createInvoice } from "../actions";
import Link from "next/link";
import { ArrowLeft, Building2, User, Receipt, Plus, Trash2, Download, Send, Save, CreditCard } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import writtenNumber from "written-number";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  enrollments?: any[];
  invoices?: any[];
};

type InvoiceItem = {
  id: string;
  title: string;
  amount: string;
  quantity: number;
};

export function NewInvoiceForm({ students, school }: { students: Student[], school?: any }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await createInvoice(formData);
      if (res?.error) {
        return { error: res.error };
      }
      return prevState;
    },
    { error: null }
  );

  // State for live preview
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [title, setTitle] = useState("Facture Scolarité");
  
  // Extract unique classes
  const classes = Array.from(
    new Map(
      students
        .flatMap((s) => s.enrollments?.map((e: any) => e.class) || [])
        .filter(Boolean)
        .map((c: any) => [c.id, c])
    ).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  // Filter students by selected class
  const filteredStudents = selectedClassId 
    ? students.filter(s => s.enrollments?.some((e: any) => e.classId === selectedClassId))
    : students;
  
  // Format today's date for default input value
  const today = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", title: "", amount: "", quantity: 1 }
  ]);
  const [notes, setNotes] = useState("Merci pour votre confiance.");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSendMenuOpen, setIsSendMenuOpen] = useState(false);
  const [paperFormat, setPaperFormat] = useState<"A4" | "A5" | "A4-half">("A4");
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const student = students.find(s => s.id === e.target.value);
    setSelectedStudent(student || null);
    if (student) {
      setTitle(`Facture Scolarité - ${student.firstName} ${student.lastName}`);
    } else {
      setTitle("Facture Scolarité");
    }
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), title: "", amount: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalAmount = items.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0;
    return sum + (amt * item.quantity);
  }, 0);

  // Print function
  const handlePrint = () => {
    const studentName = selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : "Élève";
    const invoiceTitle = title || "Facture";
    const originalTitle = document.title;
    document.title = `${invoiceTitle} - ${studentName}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  };

  // WhatsApp Share
  const handleWhatsApp = () => {
    alert("Pour envoyer par WhatsApp, veuillez d'abord cliquer sur 'Télécharger' pour enregistrer la facture, puis partagez le fichier PDF généré avec le parent sur WhatsApp.");
    setIsSendMenuOpen(false);
  };

  // Email Share
  const handleEmail = () => {
    const subject = `Facture EduCom: ${title}`;
    const body = `Bonjour,\n\nVeuillez trouver les détails de la facture ci-dessous:\n\nSujet: ${title}\nMontant Net: ${totalAmount.toLocaleString("fr-FR")} FCFA\n\nMerci,\nLa Direction`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setIsSendMenuOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl pb-12 print:p-0 print:m-0 print:pb-0">
      
      {/* HEADER SECTION - Hides on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/payments"
            className="rounded-full p-2 text-text-muted hover:bg-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-base sm:text-2xl font-semibold tracking-tight text-text-primary">
              Nouvelle Facture
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={paperFormat} 
            onChange={(e) => setPaperFormat(e.target.value as any)}
            className="px-3 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border rounded-xl shadow-sm hover:bg-secondary focus:outline-none transition-colors"
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="A4-half">Demi A4</option>
          </select>

          <button 
            type="button" 
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border rounded-xl shadow-sm hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" /> Télécharger
          </button>

          <div className="relative">
            <button 
              type="button" 
              onClick={() => setIsSendMenuOpen(!isSendMenuOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border rounded-xl shadow-sm hover:bg-secondary focus:outline-none transition-colors"
            >
              <Send className="w-4 h-4" /> Envoyer
            </button>
            {isSendMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-border rounded-2xl shadow-lg z-10 py-1 overflow-hidden">
                <button type="button" onClick={handleEmail} className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-secondary transition-colors">
                  Par Email
                </button>
                <button type="button" onClick={handleWhatsApp} className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-secondary transition-colors">
                  Par WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:gap-0">
        
        {/* MOBILE TABS (Hidden on lg+ and print) */}
        <div className="flex lg:hidden bg-secondary/30 p-1 rounded-xl print:hidden col-span-1">
          <button
            type="button"
            onClick={() => setMobileTab("form")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              mobileTab === "form" 
                ? "bg-white text-primary shadow-sm" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Formulaire
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              mobileTab === "preview" 
                ? "bg-white text-primary shadow-sm" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Aperçu A4
          </button>
        </div>

        {/* LEFT COLUMN: FORM - Hides on Print */}
        <div className={`${mobileTab === "form" ? "block" : "hidden"} lg:block lg:col-span-4 h-fit print:hidden`}>
          <form id="invoice-form" action={formAction} className="space-y-6">
            <input type="hidden" name="items" value={JSON.stringify(items.map(i => ({ title: i.title, amount: parseFloat(i.amount) || 0, quantity: i.quantity })))} />
            
            {/* DETAILS SECTION */}
            <div className="rounded-2xl border border-border bg-white shadow-sm p-3">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Receipt className="w-3.5 h-3.5"/>
                </div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Détails de facturation
                </h2>
              </div>
              
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label htmlFor="classId" className="block text-xs font-medium text-text-secondary ml-1 mb-1">Classe *</label>
                    <select id="classId" 
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        const selectElement = document.getElementById("studentId") as HTMLSelectElement;
                        if (selectElement) selectElement.value = "";
                        setSelectedStudent(null);
                      }}
                      className="block w-full rounded-xl border-none bg-secondary/50 py-2 pl-3 pr-8 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all appearance-none">
                      <option value="">Toutes les classes</option>
                      {classes.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="studentId" className="block text-xs font-medium text-text-secondary ml-1 mb-1">Destinataire *</label>
                    <select name="studentId" id="studentId" onChange={handleStudentChange} required
                      className="block w-full rounded-xl border-none bg-secondary/50 py-2 pl-3 pr-8 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all appearance-none">
                      <option value="">Sélectionner...</option>
                      {filteredStudents.map(s => {
                        const hasPaidInvoice = s.invoices?.some((inv: any) => inv.status === 'PAID');
                        return (
                          <option key={s.id} value={s.id} disabled={hasPaidInvoice} className={hasPaidInvoice ? "text-gray-400" : ""}>
                            {s.firstName} {s.lastName} {hasPaidInvoice ? "(Déjà payé)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="title" className="block text-xs font-medium text-text-secondary ml-1 mb-1">Titre *</label>
                  <input type="text" name="title" id="title" required
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    className="block w-full rounded-xl border-none bg-secondary/50 py-2 px-3 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="issueDate" className="block text-xs font-medium text-text-secondary ml-1 mb-1">Émission *</label>
                    <input type="date" name="issueDate" id="issueDate" required
                      value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                      className="block w-full rounded-xl border-none bg-secondary/50 py-2 px-3 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-xs font-medium text-text-secondary ml-1 mb-1">Échéance *</label>
                    <input type="date" name="dueDate" id="dueDate" required
                      value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="block w-full rounded-xl border-none bg-secondary/50 py-2 px-3 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* LIGNES SECTION */}
            {/* LIGNES SECTION */}
            <div className="rounded-2xl border border-border bg-white shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#e0f2fe] flex items-center justify-center text-[#0369a1]">
                    <CreditCard className="w-3.5 h-3.5"/>
                  </div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    Lignes
                  </h2>
                </div>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-colors">
                  <Plus className="w-3.5 h-3.5"/> Ajouter
                </button>
              </div>
              
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 p-2 bg-secondary/20 rounded-xl border border-gray-100">
                    <input type="text" placeholder="Description" required
                      value={item.title} onChange={(e) => updateItem(item.id, "title", e.target.value)}
                      className="block w-full rounded-xl border-none bg-white py-2 px-3 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary/20 shadow-none" />
                    
                    <div className="flex gap-2">
                      <input type="number" min="0" step="1" placeholder="Prix" required
                        value={item.amount} onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                        className="block w-full rounded-xl border-none bg-white py-2 px-3 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary/20 shadow-none" />
                      
                      <input type="number" min="1" step="1" placeholder="Qté" required
                        value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                        className="block w-16 rounded-xl border-none bg-white py-2 px-1 text-center text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary/20 shadow-none" />
                      
                      <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                        className="w-10 flex justify-center text-text-muted hover:text-error disabled:opacity-30 transition-colors p-1.5 rounded-xl hover:bg-error/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTES & SIGNATURE SECTION */}
            {/* NOTES & SIGNATURE SECTION */}
            <div className="rounded-2xl border border-border bg-white shadow-sm p-3">
              <h2 className="text-xs font-semibold text-text-primary ml-1 mb-2">Notes & Signature</h2>
              
              <div className="space-y-2">
                <div>
                  <textarea id="notes" rows={2} placeholder="Notes ou conditions de paiement"
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="block w-full rounded-xl border-none bg-secondary/50 py-2 px-3 text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all resize-none" />
                </div>
                
                <div className="bg-secondary/30 rounded-xl p-3">
                  <SignaturePad onSignatureChange={setSignatureData} />
                </div>
              </div>
            </div>

            {state?.error && (
              <p className="text-sm text-error font-medium bg-error/10 p-4 rounded-2xl">{state.error}</p>
            )}

            <div className="pt-1">
              <button
                type="submit"
                form="invoice-form"
                disabled={isPending || items.length === 0}
                className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-70 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isPending ? "Création..." : "Émettre la facture"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW - Expands on Print */}
        <div className={`${mobileTab === "preview" ? "block" : "hidden"} lg:block lg:col-span-8 print:block print:col-span-12 print:w-full`}>
          <div className="sticky top-6 border border-border bg-gray-100/50 p-4 sm:p-6 rounded-3xl flex flex-col items-center print:border-none print:bg-white print:p-0 print:shadow-none print:block overflow-y-auto max-h-[calc(100vh-4rem)]">
            
            {/* The Document Preview */}
            <div 
              style={{
                width: "100%",
                maxWidth: paperFormat === "A5" ? "148mm" : "210mm",
                minHeight: paperFormat === "A4" ? "297mm" : paperFormat === "A5" ? "210mm" : "148mm",
              }}
              className={`bg-white ${paperFormat === "A4-half" ? "p-8" : "p-12"} shadow-xl border border-gray-200 flex flex-col relative print:border-none print:shadow-none print:p-0 print:max-w-none z-10 print:min-h-0`}
            >
              
              {/* Subtle background watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                {school?.logo ? (
                  <img src={school.logo} alt="Watermark" className="w-[80%] h-[80%] object-contain" />
                ) : (
                  <div className="w-[500px] h-[500px] rounded-full bg-blue-600 blur-3xl opacity-20"></div>
                )}
              </div>

              <div className={`flex justify-between items-start border-b border-gray-100 relative z-10 ${paperFormat === "A4-half" ? "pb-4 mb-4" : "pb-8 mb-8"}`}>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3">
                    {school?.logo ? (
                      <img src={school.logo} alt="Logo" className={`${paperFormat === "A4-half" ? "h-6 w-6" : "h-10 w-10"} object-contain rounded-lg shadow-sm flex-shrink-0`} />
                    ) : (
                      <div className={`flex ${paperFormat === "A4-half" ? "h-6 w-6 text-xs" : "h-10 w-10 text-lg"} flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white font-semibold`}>
                        {school?.name ? school.name.charAt(0).toUpperCase() : "E"}
                      </div>
                    )}
                    <span className={`${paperFormat === "A4-half" ? "text-xs sm:text-base" : "text-xs sm:text-xl"} font-semibold text-gray-900 tracking-tight whitespace-nowrap truncate`}>{school?.name || "Établissement Sans Nom"}</span>
                  </div>
                  <div className={`mt-3 ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"} text-gray-500 flex flex-col gap-0.5`}>
                    <span className="whitespace-nowrap truncate">{school?.address || "Adresse non renseignée"}</span>
                    <span className="whitespace-nowrap truncate">{[school?.email, school?.phone].filter(Boolean).join(" • ")}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 max-w-[50%]">
                  <h2 className={`${paperFormat === "A4-half" ? "text-sm sm:text-base" : "text-sm sm:text-2xl"} font-light text-gray-900 uppercase tracking-widest whitespace-nowrap`}>{title || "Facture"}</h2>
                  <p className={`${paperFormat === "A4-half" ? "text-[10px]" : "text-sm"} text-gray-500 mt-1 font-medium`}>#INV-{new Date().getFullYear()}-001</p>
                </div>
              </div>

              <div className={`grid grid-cols-2 ${paperFormat === "A4-half" ? "gap-4 py-2" : "gap-8 py-4"}`}>
                <div>
                  <h4 className={`font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ${paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"}`}>FACTURÉ À</h4>
                  {selectedStudent && (
                    <div className="text-gray-900">
                      <p className={`font-semibold ${paperFormat === "A4-half" ? "text-sm" : "text-lg"}`}>{selectedStudent.firstName} {selectedStudent.lastName}</p>
                      <p className={`text-gray-500 mt-0.5 flex items-center gap-1 ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"}`}><User className="w-3 h-3"/> Responsable légal</p>
                    </div>
                  )}
                </div>
                <div className={`text-right space-y-1.5 ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"}`}>
                  <div className="flex justify-end gap-3">
                    <span className={`text-gray-500 text-right uppercase tracking-wider font-semibold ${paperFormat === "A4-half" ? "w-16 text-[8px]" : "w-24 text-[10px]"}`}>ÉMISE LE :</span>
                    <span className={`font-medium text-gray-900 text-right ${paperFormat === "A4-half" ? "w-16" : "w-24"}`}>
                      {issueDate ? new Date(issueDate).toLocaleDateString("fr-FR") : <span className="text-gray-300 italic">Non définie</span>}
                    </span>
                  </div>
                  <div className="flex justify-end gap-3">
                    <span className={`text-gray-500 text-right uppercase tracking-wider font-semibold ${paperFormat === "A4-half" ? "w-16 text-[8px]" : "w-24 text-[10px]"}`}>ÉCHÉANCE :</span>
                    <span className={`font-medium text-gray-900 text-right ${paperFormat === "A4-half" ? "w-16" : "w-24"}`}>
                      {dueDate ? new Date(dueDate).toLocaleDateString("fr-FR") : <span className="text-gray-300 italic">Non définie</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`${paperFormat === "A4-half" ? "mt-2" : "mt-6"}`}>
                <table className={`w-full text-left ${paperFormat === "A4-half" ? "text-xs" : "text-sm"}`}>
                  <thead className="border-b-2 border-gray-900">
                    <tr>
                      <th className={`${paperFormat === "A4-half" ? "py-1.5 text-[9px]" : "py-2 text-xs"} font-semibold text-gray-900 uppercase tracking-wider`}>DESCRIPTION</th>
                      <th className={`${paperFormat === "A4-half" ? "py-1.5 text-[9px]" : "py-2 text-xs"} font-semibold text-gray-900 uppercase tracking-wider text-center w-16`}>QTÉ</th>
                      <th className={`${paperFormat === "A4-half" ? "py-1.5 text-[9px]" : "py-2 text-xs"} font-semibold text-gray-900 uppercase tracking-wider text-right`}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const itemAmt = parseFloat(item.amount) || 0;
                      const lineTotal = itemAmt * item.quantity;
                      return (
                        <tr key={item.id}>
                          <td className={`${paperFormat === "A4-half" ? "py-2" : "py-3"} text-gray-900`}>
                            {item.title || <span className="text-gray-300 italic">Ligne sans titre...</span>}
                          </td>
                          <td className={`${paperFormat === "A4-half" ? "py-2" : "py-3"} text-gray-900 text-center`}>
                            {item.quantity}
                          </td>
                          <td className={`${paperFormat === "A4-half" ? "py-2" : "py-3"} text-gray-900 text-right font-medium`}>
                            {lineTotal.toLocaleString("fr-FR")} FCFA
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={`${paperFormat === "A4-half" ? "mt-3 text-[10px]" : "mt-4 text-xs"} text-gray-700 italic`}>
                Arrêtée la présente facture à la somme de : <span className="font-semibold uppercase">{totalAmount > 0 ? writtenNumber(totalAmount, { lang: 'fr' }) : "zéro"} Francs CFA</span>.
              </div>

              <div className={`${paperFormat === "A4-half" ? "mt-4" : "mt-8"} flex justify-between items-end`}>
                <div className="w-1/2">
                  <div className={`${paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"} text-gray-500 whitespace-pre-wrap leading-relaxed max-w-xs`}>
                    <span className="font-semibold text-gray-900 uppercase block mb-1">NOTES & CONDITIONS</span>
                    {notes}
                  </div>
                  
                  <div className={`${paperFormat === "A4-half" ? "mt-4" : "mt-8"}`}>
                    <div className={`${paperFormat === "A4-half" ? "h-10" : "h-16"} flex items-end`}>
                      {signatureData ? (
                        <img src={signatureData} alt="Signature/Cachet" className={`max-w-[200px] object-contain mix-blend-multiply ${paperFormat === "A4-half" ? "max-h-10" : "max-h-16"}`} />
                      ) : (
                        <span className={`text-gray-300 italic ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"}`}>Signature non définie</span>
                      )}
                    </div>
                    <div className={`w-40 border-t border-gray-300 mt-2 pt-1 font-semibold uppercase tracking-wider text-gray-400 ${paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"}`}>
                      Cachet et Signature
                    </div>
                  </div>
                </div>

                <div className="w-[45%] flex justify-end">
                  <div className={`w-full max-w-[280px] bg-gray-50/50 ${paperFormat === "A4-half" ? "p-3 rounded-lg" : "p-5 rounded-xl"} border border-gray-100 print:border-none print:bg-transparent print:p-0`}>
                    <div className={`flex justify-between items-center text-gray-500 ${paperFormat === "A4-half" ? "text-xs mb-2" : "text-sm mb-3"}`}>
                      <span>Sous-total</span>
                      <span>{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className={`flex justify-between items-center text-gray-500 border-b border-gray-200 ${paperFormat === "A4-half" ? "text-xs mb-3 pb-3" : "text-sm mb-4 pb-4"}`}>
                      <span>Taxes (0%)</span>
                      <span>0 FCFA</span>
                    </div>
                    <div className={`flex justify-between items-center font-semibold text-gray-900 ${paperFormat === "A4-half" ? "text-base" : "text-sm sm:text-xl"}`}>
                      <span>Total Net</span>
                      <span>{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
