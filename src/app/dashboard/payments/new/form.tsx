"use client";

import { useActionState, useState } from "react";
import { createInvoice } from "../actions";
import Link from "next/link";
import { ArrowLeft, Building2, User, Receipt, Plus, Trash2, Download, Send, Save, CreditCard } from "lucide-react";
import { SignaturePad } from "./SignaturePad";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
};

type InvoiceItem = {
  id: string;
  title: string;
  amount: string;
  quantity: number;
};

export function NewInvoiceForm({ students }: { students: Student[] }) {
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
  const [title, setTitle] = useState("Facture Scolarité");
  
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

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const student = students.find(s => s.id === e.target.value);
    setSelectedStudent(student || null);
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
    window.print();
  };

  // WhatsApp Share
  const handleWhatsApp = () => {
    const text = `Bonjour, voici le lien pour la facture EduCom: ${title}. Montant net: ${totalAmount.toLocaleString("fr-FR")} FCFA.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Nouvelle Facture
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:gap-0">
        
        {/* LEFT COLUMN: FORM - Hides on Print */}
        <div className="lg:col-span-5 h-fit print:hidden">
          <form id="invoice-form" action={formAction} className="space-y-6">
            <input type="hidden" name="items" value={JSON.stringify(items.map(i => ({ title: i.title, amount: parseFloat(i.amount) || 0, quantity: i.quantity })))} />
            
            {/* DETAILS SECTION */}
            <div className="rounded-3xl border border-border bg-white shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Receipt className="w-5 h-5"/>
                </div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Détails de facturation
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-text-secondary ml-1 mb-1.5">Destinataire *</label>
                  <select name="studentId" id="studentId" onChange={handleStudentChange} required
                    className="block w-full rounded-2xl border-none bg-secondary/50 py-3 pl-4 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all appearance-none">
                    <option value="">Sélectionner un élève...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-text-secondary ml-1 mb-1.5">Titre *</label>
                  <input type="text" name="title" id="title" required
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    className="block w-full rounded-2xl border-none bg-secondary/50 py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="issueDate" className="block text-sm font-medium text-text-secondary ml-1 mb-1.5">Émission *</label>
                    <input type="date" name="issueDate" id="issueDate" required
                      value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                      className="block w-full rounded-2xl border-none bg-secondary/50 py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-text-secondary ml-1 mb-1.5">Échéance *</label>
                    <input type="date" name="dueDate" id="dueDate" required
                      value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="block w-full rounded-2xl border-none bg-secondary/50 py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* LIGNES SECTION */}
            <div className="rounded-3xl border border-border bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center text-[#0369a1]">
                    <CreditCard className="w-5 h-5"/>
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Lignes
                  </h2>
                </div>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4"/> Ajouter
                </button>
              </div>
              
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input type="text" placeholder="Description" required
                      value={item.title} onChange={(e) => updateItem(item.id, "title", e.target.value)}
                      className="block w-[50%] rounded-2xl border-none bg-secondary/50 py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                    
                    <input type="number" min="0" step="1" placeholder="Prix" required
                      value={item.amount} onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                      className="block w-[25%] rounded-2xl border-none bg-secondary/50 py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                    
                    <input type="number" min="1" step="1" placeholder="Qté" required
                      value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="block w-[15%] rounded-2xl border-none bg-secondary/50 py-3 px-2 text-center text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all" />
                    
                    <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                      className="w-[10%] flex justify-center text-text-muted hover:text-error disabled:opacity-30 transition-colors p-2 rounded-xl hover:bg-error/10">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTES & SIGNATURE SECTION */}
            <div className="rounded-3xl border border-border bg-white shadow-sm p-6">
              <h2 className="text-sm font-medium text-text-secondary ml-1 mb-3">Notes & Signature</h2>
              
              <div className="space-y-4">
                <div>
                  <textarea id="notes" rows={2} placeholder="Notes ou conditions de paiement"
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="block w-full rounded-2xl border-none bg-secondary/50 py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-none transition-all resize-none" />
                </div>
                
                <div className="bg-secondary/30 rounded-2xl p-4">
                  <SignaturePad onSignatureChange={setSignatureData} />
                </div>
              </div>
            </div>

            {state?.error && (
              <p className="text-sm text-error font-medium bg-error/10 p-4 rounded-2xl">{state.error}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                form="invoice-form"
                disabled={isPending || items.length === 0}
                className="w-full inline-flex justify-center items-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-70 transition-colors"
              >
                <Save className="w-5 h-5" />
                {isPending ? "Création..." : "Émettre la facture"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW - Expands on Print */}
        <div className="hidden lg:block lg:col-span-7 print:block print:col-span-12 print:w-full">
          <div className="sticky top-6 border border-border bg-secondary p-4 rounded-3xl flex flex-col items-center print:border-none print:bg-white print:p-0 print:shadow-none print:block">
            
            {/* The "A4" Document Preview */}
            <div className="bg-white w-full max-w-[210mm] p-10 shadow-sm border border-border rounded-xl aspect-[1/1.414] flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:max-w-none">
              
              <div className="flex justify-between items-start border-b border-gray-100 pb-8">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-semibold text-lg">E</div>
                    <span className="text-2xl font-semibold text-gray-900 tracking-tight">EduCom</span>
                  </div>
                  <div className="mt-4 text-xs text-gray-500 flex flex-col gap-1">
                    <span className="flex items-center gap-1 font-medium"><Building2 className="w-3 h-3"/> École Excellence</span>
                    <span>123 Avenue Président, Dakar</span>
                    <span>contact@ecole-excellence.sn</span>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-light text-gray-900 uppercase tracking-widest">{title || "Facture"}</h2>
                  <p className="text-sm text-gray-500 mt-2 font-medium">#INV-{new Date().getFullYear()}-001</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 py-8">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">FACTURÉ À</h4>
                  {selectedStudent ? (
                    <div className="text-gray-900">
                      <p className="font-semibold text-lg">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                      <p className="text-gray-500 mt-1 text-xs flex items-center gap-1"><User className="w-3 h-3"/> Responsable légal</p>
                    </div>
                  ) : (
                    <p className="text-gray-300 italic text-sm">Sélectionnez un destinataire...</p>
                  )}
                </div>
                <div className="text-right text-xs space-y-2">
                  <div className="flex justify-end gap-3">
                    <span className="text-gray-500 w-24 text-right uppercase tracking-wider text-[10px] font-semibold">ÉMISE LE :</span>
                    <span className="font-medium text-gray-900 w-24 text-right">
                      {issueDate ? new Date(issueDate).toLocaleDateString("fr-FR") : <span className="text-gray-300 italic">Non définie</span>}
                    </span>
                  </div>
                  <div className="flex justify-end gap-3">
                    <span className="text-gray-500 w-24 text-right uppercase tracking-wider text-[10px] font-semibold">ÉCHÉANCE :</span>
                    <span className="font-medium text-gray-900 w-24 text-right">
                      {dueDate ? new Date(dueDate).toLocaleDateString("fr-FR") : <span className="text-gray-300 italic">Non définie</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex-grow">
                <table className="w-full text-left text-sm">
                  <thead className="border-b-2 border-gray-900">
                    <tr>
                      <th className="py-3 font-semibold text-gray-900 uppercase text-xs tracking-wider">DESCRIPTION</th>
                      <th className="py-3 font-semibold text-gray-900 uppercase text-xs tracking-wider text-center w-20">QTÉ</th>
                      <th className="py-3 font-semibold text-gray-900 uppercase text-xs tracking-wider text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const itemAmt = parseFloat(item.amount) || 0;
                      const lineTotal = itemAmt * item.quantity;
                      return (
                        <tr key={item.id}>
                          <td className="py-4 text-gray-900">
                            {item.title || <span className="text-gray-300 italic">Ligne sans titre...</span>}
                          </td>
                          <td className="py-4 text-gray-900 text-center">
                            {item.quantity}
                          </td>
                          <td className="py-4 text-gray-900 text-right font-medium">
                            {lineTotal.toLocaleString("fr-FR")} FCFA
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex justify-between items-end">
                <div className="w-1/2">
                  <div className="text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed max-w-xs">
                    <span className="font-semibold text-gray-900 uppercase block mb-1">NOTES & CONDITIONS</span>
                    {notes}
                  </div>
                  
                  <div className="mt-10">
                    <div className="h-20 flex items-end">
                      {signatureData ? (
                        <img src={signatureData} alt="Signature/Cachet" className="max-h-20 max-w-[200px] object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-gray-300 italic text-xs">Signature non définie</span>
                      )}
                    </div>
                    <div className="w-48 border-t border-gray-300 mt-2 pt-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      Cachet et Signature
                    </div>
                  </div>
                </div>

                <div className="w-[45%] flex justify-end">
                  <div className="w-full max-w-[280px] bg-gray-50/50 p-5 rounded-xl border border-gray-100 print:border-none print:bg-transparent print:p-0">
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>Sous-total</span>
                      <span>{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4 pb-4 border-b border-gray-200">
                      <span>Taxes (0%)</span>
                      <span>0 FCFA</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-semibold text-gray-900">
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
