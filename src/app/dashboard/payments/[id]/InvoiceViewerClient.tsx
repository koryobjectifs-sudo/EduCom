"use client";

import { useState, useEffect } from "react";
import { Printer, Download, User } from "lucide-react";
import writtenNumber from "written-number";

type InvoiceItem = {
  id: string;
  title: string;
  amount: number;
  quantity: number;
};

export default function InvoiceViewerClient({ invoice, school }: { invoice: any, school: any }) {
  const [paperFormat, setPaperFormat] = useState<"A4" | "A5" | "A4-half">("A4");
  
  // Set document title for printing/PDF export
  useEffect(() => {
    if (invoice.student) {
      document.title = `Facture Scolarité - ${invoice.student.firstName} ${invoice.student.lastName}`;
    } else {
      document.title = "Facture Scolarité";
    }
  }, [invoice]);

  const items = invoice.items || [];
  const totalAmount = invoice.totalAmount || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 items-center justify-between print:hidden bg-surface p-4 rounded-2xl border border-rule">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-soft">Format d'impression :</span>
          <select 
            className="text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary"
            value={paperFormat}
            onChange={(e: any) => setPaperFormat(e.target.value)}
          >
            <option value="A4">A4 (Standard)</option>
            <option value="A4-half">Demi-A4 (Économique)</option>
            <option value="A5">A5 (Carnet)</option>
          </select>
        </div>
        
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus:outline-none transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimer / PDF
        </button>
      </div>

      <div className="w-full overflow-x-auto pb-4">
        {/* The Document Preview */}
        <div 
          style={{
            width: paperFormat === "A5" ? "148mm" : "210mm",
            minHeight: paperFormat === "A4" ? "297mm" : paperFormat === "A5" ? "210mm" : "148mm",
          }}
          className={`bg-white ${paperFormat === "A4-half" ? "p-8" : "p-12"} shadow-xl border border-gray-200 flex flex-col relative print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none z-10 print:min-h-0 mx-auto origin-top`}
        >
          {/* Subtle background watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
            {school?.logo ? (
              <img src={school.logo} alt="Watermark" className="w-[80%] h-[80%] object-contain" />
            ) : (
              <div className="w-[500px] h-[500px] rounded-full bg-blue-600 blur-3xl opacity-20"></div>
            )}
          </div>

          <div className={`flex flex-col sm:flex-row justify-between sm:items-start gap-4 sm:gap-2 print:flex-row print:items-start border-b border-gray-100 relative z-10 ${paperFormat === "A4-half" ? "pb-4 mb-4" : "pb-8 mb-8"}`}>
            <div className="flex-1 min-w-0 pr-0 sm:pr-4 print:pr-4">
              <div className="flex items-center gap-3">
                {school?.logo ? (
                  <img src={school.logo} alt="Logo" className={`${paperFormat === "A4-half" ? "h-6 w-6" : "h-10 w-10"} object-contain rounded-lg shadow-sm flex-shrink-0`} />
                ) : (
                  <div className={`flex ${paperFormat === "A4-half" ? "h-6 w-6 text-xs" : "h-10 w-10 text-lg"} flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white font-semibold`}>
                    {school?.name ? school.name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
                <span className={`${paperFormat === "A4-half" ? "text-xs sm:text-base" : "text-xs sm:text-xl"} font-semibold text-gray-900 tracking-tight whitespace-normal break-words max-w-full leading-snug`}>{school?.name || "Établissement Sans Nom"}</span>
              </div>
              <div className={`mt-3 ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"} text-gray-500 flex flex-col gap-0.5`}>
                <span className="whitespace-normal break-words leading-relaxed">{school?.address || "Adresse non renseignée"}</span>
                <span className="whitespace-nowrap truncate">{[school?.email, school?.phone].filter(Boolean).join(" • ")}</span>
              </div>
            </div>
            <div className="text-left sm:text-right print:text-right flex-shrink-0 max-w-full sm:max-w-[50%] print:max-w-[50%]">
              <h2 className={`${paperFormat === "A4-half" ? "text-sm sm:text-base" : "text-sm sm:text-2xl"} font-light text-gray-900 uppercase tracking-widest whitespace-normal sm:whitespace-nowrap print:whitespace-nowrap`}>FACTURE SCOLARITÉ</h2>
              <p className={`${paperFormat === "A4-half" ? "text-[10px]" : "text-sm"} text-gray-500 mt-1 font-medium`}>#{invoice.id.split("-")[0].toUpperCase()}</p>
            </div>
          </div>

          <div className={`grid grid-cols-2 ${paperFormat === "A4-half" ? "gap-4 py-2" : "gap-8 py-4"}`}>
            <div>
              <h4 className={`font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ${paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"}`}>FACTURÉ À</h4>
              {invoice.student ? (
                <div className="text-gray-900">
                  <p className={`font-semibold ${paperFormat === "A4-half" ? "text-sm" : "text-lg"}`}>{invoice.student.firstName} {invoice.student.lastName}</p>
                  <p className={`text-gray-500 mt-0.5 flex items-center gap-1 ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"}`}><User className="w-3 h-3"/> Élève</p>
                </div>
              ) : (
                <span className="text-gray-400 italic text-sm">Destinataire inconnu</span>
              )}
            </div>
            <div className={`text-right space-y-1.5 ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"}`}>
              <div className="flex justify-end gap-3">
                <span className={`text-gray-500 text-right uppercase tracking-wider font-semibold ${paperFormat === "A4-half" ? "w-16 text-[8px]" : "w-24 text-[10px]"}`}>ÉMISE LE :</span>
                <span className={`font-medium text-gray-900 text-right ${paperFormat === "A4-half" ? "w-16" : "w-24"}`}>
                  {new Date(invoice.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div className="flex justify-end gap-3">
                <span className={`text-gray-500 text-right uppercase tracking-wider font-semibold ${paperFormat === "A4-half" ? "w-16 text-[8px]" : "w-24 text-[10px]"}`}>ÉCHÉANCE :</span>
                <span className={`font-medium text-gray-900 text-right ${paperFormat === "A4-half" ? "w-16" : "w-24"}`}>
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : <span className="text-gray-300 italic">Non définie</span>}
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
                {items.map((item: any) => {
                  const lineTotal = item.amount * item.quantity;
                  return (
                    <tr key={item.id}>
                      <td className={`${paperFormat === "A4-half" ? "py-2" : "py-3"} text-gray-900`}>
                        {item.title}
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
                <span className="font-semibold text-gray-900 uppercase block mb-1">NOTES</span>
                Facture émise et validée.
              </div>
              
              <div className={`${paperFormat === "A4-half" ? "mt-4" : "mt-8"}`}>
                <div className={`${paperFormat === "A4-half" ? "h-10" : "h-16"} flex items-end`}>
                  <span className={`text-gray-300 italic ${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"}`}>Cachet virtuel</span>
                </div>
                <div className={`w-40 border-t border-gray-300 mt-2 pt-1 font-semibold uppercase tracking-wider text-gray-400 ${paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"}`}>
                  Administration
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
  );
}
