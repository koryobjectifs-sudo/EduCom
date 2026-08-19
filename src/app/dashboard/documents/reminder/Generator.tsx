"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, AlertCircle } from "lucide-react";
import { SignaturePad } from "@/app/dashboard/payments/new/SignaturePad";

export default function ReminderGenerator({
  overdueInvoices,
  school,
}: {
  overdueInvoices: any[];
  school?: { name: string; address: string | null; phone: string | null; email: string | null } | null;
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const invoice = overdueInvoices.find(inv => inv.id === selectedInvoiceId);
  const student = invoice?.student;
  const parent = student?.parent;
  const currentClass = student?.enrollments[0]?.class?.name || "Non assigné";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl pb-12 print:p-0 print:m-0 print:pb-0">
      
      {/* Header - Hides on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/documents"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            Générer une Lettre de Relance <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{overdueInvoices.length} impayés</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={handlePrint}
            disabled={!invoice}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Imprimer la lettre
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:gap-0">
        
        {/* Configuration Panel - Hides on Print */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Paramètres du document</h2>
            
            {overdueInvoices.length === 0 ? (
              <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                Excellente nouvelle ! Il n'y a aucune facture en retard de paiement.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dossier en retard</label>
                  <select 
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 pl-3 pr-8 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-red-600 sm:text-sm"
                  >
                    <option value="">Sélectionner un impayé...</option>
                    {overdueInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.student?.firstName} {inv.student?.lastName} - {inv.totalAmount.toLocaleString()} FCFA
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date de la lettre</label>
                  <input 
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-red-600 sm:text-sm"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100 mt-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Signature de la Direction</label>
                  <SignaturePad onSignatureChange={setSignatureData} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview (A4) - Expands on Print */}
        <div className="lg:col-span-8 print:col-span-12 print:block">
          <div className="sticky top-6 flex justify-center print:block print:static">
            
            {/* The Document (A4 format ratio) */}
            <div className="bg-white w-full max-w-[210mm] p-12 shadow-sm border border-gray-200 rounded-sm aspect-[1/1.414] flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:max-w-none">
              
              {/* En-tête de l'école */}
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-900 text-white font-semibold text-3xl">
                    {school?.name?.charAt(0).toUpperCase() || "E"}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{school?.name || "—"}</h2>
                    <p className="text-xs text-gray-600 mt-1">
                      {school?.address && <>{school.address}<br/></>}
                      {school?.phone && <>Tél: {school.phone}<br/></>}
                      {school?.email && <>Email: {school.email}</>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm mb-4">Dakar, le {new Date(issueDate).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>

              {invoice && student ? (
                <div className="flex-grow flex flex-col text-gray-800">
                  
                  {/* Destinataire */}
                  <div className="self-end w-1/2 bg-gray-50/50 p-4 border border-gray-100 rounded mb-12 print:border-none print:bg-transparent">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">À l'attention de :</p>
                    {parent ? (
                      <p className="font-semibold text-lg text-gray-900">{parent.lastName.toUpperCase()} {parent.firstName}</p>
                    ) : (
                      <p className="font-semibold text-lg text-gray-900">Parent/Tuteur de {student.firstName} {student.lastName}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-600">
                      Concernant l'élève : {student.firstName} {student.lastName}<br/>
                      Classe : {currentClass}
                    </p>
                  </div>

                  <h1 className="text-2xl font-black text-gray-900 uppercase tracking-widest underline decoration-2 underline-offset-8 mb-8 text-center">
                    Première Relance - Impayé
                  </h1>

                  <div className="text-base leading-relaxed space-y-6">
                    <p>Madame, Monsieur,</p>
                    <p>
                      Sauf erreur ou omission de notre part, nous constatons à ce jour que le règlement de la scolarité concernant votre enfant <strong>{student.firstName} {student.lastName}</strong> n'a toujours pas été effectué pour la période en cours.
                    </p>
                    <div className="bg-red-50 p-6 rounded-lg border border-red-100 text-center print:bg-transparent print:border-2 print:border-gray-900">
                      <p className="text-sm text-gray-600 uppercase font-semibold tracking-wider mb-2">Montant restant dû à ce jour :</p>
                      <p className="text-3xl font-black text-red-700 print:text-gray-900">{invoice.totalAmount.toLocaleString("fr-FR")} FCFA</p>
                      <p className="text-sm text-gray-600 mt-2">
                        <em>(Date d'échéance dépassée : {new Date(invoice.dueDate).toLocaleDateString("fr-FR")})</em>
                      </p>
                    </div>
                    <p>
                      Nous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais afin de ne pas perturber la scolarité de votre enfant.
                    </p>
                    <p>
                      Si votre règlement a été effectué entre-temps, veuillez ne pas tenir compte de la présente lettre. Nous nous tenons à votre disposition pour toute information complémentaire.
                    </p>
                    <p>
                      En vous remerciant par avance pour votre compréhension, nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.
                    </p>
                  </div>

                  {/* Signature */}
                  <div className="mt-16 self-end w-64 text-center">
                    <p className="font-semibold text-gray-900 uppercase text-sm mb-4">La Direction</p>
                    <div className="h-24 flex items-center justify-center border border-dashed border-gray-200 rounded-lg print:border-none">
                      {signatureData ? (
                        <img src={signatureData} alt="Signature" className="max-h-24 max-w-full object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-gray-300 italic text-xs print:hidden">Signature de la direction ici</span>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-grow w-full h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 print:hidden mt-12">
                  Sélectionnez un dossier en retard pour générer la lettre.
                </div>
              )}

              {/* Pied de page */}
              <div className="mt-8 border-t-2 border-gray-900 pt-4 flex justify-between items-center text-xs text-gray-500">
                <span>Réf: REL-{new Date().getFullYear()}-{invoice?.id?.substring(0, 5) || "XXXXX"}</span>
                <span>Document généré automatiquement par EduCom SaaS</span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
