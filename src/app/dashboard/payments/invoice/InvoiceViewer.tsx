"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Receipt, CheckCircle2, Clock, AlertTriangle, User } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatXOF, amountInWordsXOF } from "@/lib/finance/numbering";
import GenerateDocumentDropdown from "@/components/documents/GenerateDocumentDropdown";

export default function InvoiceViewer({
  invoice,
  school,
}: {
  invoice: any;
  school: any;
}) {
  const [paperFormat, setPaperFormat] = useState<"A4" | "A5" | "A4-half">("A4");

  const student = invoice.student;
  const items = invoice.items || [];
  const totalAmount = invoice.totalAmount || 0;
  const payments = invoice.payments || [];
  const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - totalPaid);

  const accentColor = school?.bulletinAccentColor || school?.primaryColor || "#0284C7";

  const cleanAddress = (() => {
    if (!school?.address) return null;
    const t = school.address.trim();
    if (/^\d{1,3}$/.test(t) || t.length < 3) return null;
    return t;
  })();

  const cleanPhone = (() => {
    if (!school?.phone) return null;
    const t = school.phone.trim();
    if (/^\d{1,3}$/.test(t) || t.length < 6) return null;
    return t;
  })();

  useEffect(() => {
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Élève";
    const num = invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase();
    document.title = `Facture ${num} - ${studentName}`;
  }, [invoice, student]);

  const isPaid = invoice.status === "PAID" || remainingAmount === 0;
  const isOverdue = !isPaid && new Date(invoice.dueDate) < new Date();

  return (
    <div className="flex flex-col gap-6">
      {/* Action Bar - Hidden on print */}
      <div className="flex flex-wrap gap-4 items-center justify-between print:hidden bg-surface p-4 rounded-2xl border border-rule">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center justify-center rounded-xl border border-rule bg-white px-3.5 py-2 text-sm font-medium text-text-soft hover:bg-sunk hover:text-text transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Retour aux paiements
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-faint">Format :</span>
            <select
              className="text-xs border border-rule rounded-lg bg-white px-2.5 py-1.5 font-medium text-text focus:ring-primary focus:border-primary"
              value={paperFormat}
              onChange={(e: any) => setPaperFormat(e.target.value)}
            >
              <option value="A4">A4 (Standard)</option>
              <option value="A4-half">Demi-A4 (Économique)</option>
              <option value="A5">A5 (Carnet)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <GenerateDocumentDropdown
            context="invoice"
            invoiceId={invoice.id}
            paymentId={payments[0]?.id}
            variant="default"
          />

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus:outline-none transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
          </button>
        </div>
      </div>

      {/* The Printable Sheet */}
      <div className="w-full overflow-x-auto pb-6">
        <div
          style={{
            width: paperFormat === "A5" ? "148mm" : "210mm",
            minHeight: paperFormat === "A4" ? "297mm" : paperFormat === "A5" ? "210mm" : "148mm",
          }}
          className={`bg-white ${
            paperFormat === "A4-half" ? "p-8" : "p-12"
          } shadow-xl border border-gray-200 flex flex-col relative print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none z-10 print:min-h-0 mx-auto origin-top`}
        >
          {/* Filigrane du logo centré (identique au bulletin) */}
          {school?.logo && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none print:flex"
            >
              <img
                src={school.logo}
                alt=""
                className="w-[65%] max-w-[65%] max-h-[65%] object-contain"
                style={{
                  opacity: school?.bulletinWatermarkOpacity ?? 0.06,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              />
            </div>
          )}

          {/* Document Header */}
          <div
            className={`flex flex-col sm:flex-row justify-between sm:items-start gap-4 sm:gap-2 print:flex-row print:items-start border-b border-gray-200 relative z-10 ${
              paperFormat === "A4-half" ? "pb-4 mb-4" : "pb-8 mb-8"
            }`}
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-3">
                {school?.logo ? (
                  <img
                    src={school.logo}
                    alt={school.name}
                    className={`${paperFormat === "A4-half" ? "h-8 w-8" : "h-12 w-12"} object-contain rounded-lg shadow-2xs flex-shrink-0`}
                  />
                ) : (
                  <div
                    className={`flex ${
                      paperFormat === "A4-half" ? "h-8 w-8 text-xs" : "h-12 w-12 text-lg"
                    } flex-shrink-0 items-center justify-center rounded-xl text-white font-bold`}
                    style={{ backgroundColor: accentColor }}
                  >
                    {school?.name ? school.name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
                <div>
                  <h1
                    className={`${
                      paperFormat === "A4-half" ? "text-sm sm:text-base" : "text-base sm:text-xl"
                    } font-bold text-gray-900 tracking-tight leading-snug`}
                  >
                    {school?.name || "Établissement Scolaire"}
                  </h1>
                  {cleanAddress && (
                    <p className={`${paperFormat === "A4-half" ? "text-[10px]" : "text-xs"} text-gray-500`}>
                      {cleanAddress}
                    </p>
                  )}
                </div>
              </div>
              <div
                className={`mt-2.5 ${
                  paperFormat === "A4-half" ? "text-[9px]" : "text-[11px]"
                } text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5`}
              >
                {cleanPhone && <span>Tél : {cleanPhone}</span>}
                {school?.email && <span>Email : {school.email}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right print:text-right flex-shrink-0">
              <span
                className={`inline-block ${
                  paperFormat === "A4-half" ? "text-xs sm:text-sm" : "text-base sm:text-2xl"
                } font-black tracking-wider uppercase`}
                style={{ color: accentColor }}
              >
                FACTURE SCOLARITÉ
              </span>
              <p
                className={`${
                  paperFormat === "A4-half" ? "text-[10px]" : "text-sm"
                } font-mono font-bold mt-0.5`}
                style={{ color: accentColor }}
              >
                N° {invoice.invoiceNumber || `#${invoice.id.slice(0, 8).toUpperCase()}`}
              </p>
              <div className="mt-1.5">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3" /> FACTURE PAYÉE
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 uppercase tracking-wide">
                    <AlertTriangle className="w-3 h-3" /> EN RETARD
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                    <Clock className="w-3 h-3" /> EN ATTENTE DE RÈGLEMENT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Parties prenantes & Dates */}
          <div
            className={`grid grid-cols-2 ${
              paperFormat === "A4-half" ? "gap-4 py-2" : "gap-8 py-4"
            } border-b border-gray-100`}
          >
            <div>
              <h3
                className={`font-semibold text-gray-400 uppercase tracking-wider mb-1 ${
                  paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"
                }`}
              >
                FACTURÉ À
              </h3>
              {student ? (
                <div className="text-gray-900">
                  <p className={`font-bold ${paperFormat === "A4-half" ? "text-xs" : "text-base"}`}>
                    {student.firstName} {student.lastName}
                  </p>
                  <p className={`text-gray-500 mt-0.5 ${paperFormat === "A4-half" ? "text-[9px]" : "text-xs"}`}>
                    Classe :{" "}
                    <strong className="text-gray-800">
                      {student.enrollments?.[0]?.class?.name || "Non affectée"}
                    </strong>
                    {student.matricule && <span> · Mat. {student.matricule}</span>}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 italic text-xs">Élève non rattaché</p>
              )}
            </div>

            <div className={`text-right space-y-1 ${paperFormat === "A4-half" ? "text-[9px]" : "text-xs"}`}>
              <div className="flex justify-end gap-3">
                <span className="text-gray-500 font-medium">Date d'émission :</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {formatDate(invoice.createdAt)}
                </span>
              </div>
              <div className="flex justify-end gap-3">
                <span className="text-gray-500 font-medium">Date d'échéance :</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "Non précisée"}
                </span>
              </div>
              <div className="flex justify-end gap-3">
                <span className="text-gray-500 font-medium">Intitulé :</span>
                <span className="font-medium text-gray-700">{invoice.title || "Frais de scolarité"}</span>
              </div>
            </div>
          </div>

          {/* Lignes de facturation */}
          <div className={`${paperFormat === "A4-half" ? "mt-3" : "mt-6"} flex-1`}>
            <table className={`w-full text-left ${paperFormat === "A4-half" ? "text-xs" : "text-sm"}`}>
              <thead className="border-b-2" style={{ borderColor: accentColor }}>
                <tr>
                  <th
                    className={`${
                      paperFormat === "A4-half" ? "py-1 text-[8px]" : "py-2 text-xs"
                    } font-bold text-gray-900 uppercase tracking-wider`}
                  >
                    Désignation
                  </th>
                  <th
                    className={`${
                      paperFormat === "A4-half" ? "py-1 text-[8px]" : "py-2 text-xs"
                    } font-bold text-gray-900 uppercase tracking-wider text-center w-16`}
                  >
                    Qté
                  </th>
                  <th
                    className={`${
                      paperFormat === "A4-half" ? "py-1 text-[8px]" : "py-2 text-xs"
                    } font-bold text-gray-900 uppercase tracking-wider text-right w-28`}
                  >
                    Prix unitaire
                  </th>
                  <th
                    className={`${
                      paperFormat === "A4-half" ? "py-1 text-[8px]" : "py-2 text-xs"
                    } font-bold text-gray-900 uppercase tracking-wider text-right w-32`}
                  >
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length > 0 ? (
                  items.map((item: any) => {
                    const lineTotal = item.amount * item.quantity;
                    return (
                      <tr key={item.id}>
                        <td className={`${paperFormat === "A4-half" ? "py-1.5" : "py-2.5"} text-gray-900`}>
                          <span className="font-medium">{item.title}</span>
                        </td>
                        <td className={`${paperFormat === "A4-half" ? "py-1.5" : "py-2.5"} text-gray-900 text-center font-mono`}>
                          {item.quantity}
                        </td>
                        <td className={`${paperFormat === "A4-half" ? "py-1.5" : "py-2.5"} text-gray-900 text-right tabular-nums`}>
                          {formatXOF(item.amount)}
                        </td>
                        <td className={`${paperFormat === "A4-half" ? "py-1.5" : "py-2.5"} text-gray-900 text-right font-semibold tabular-nums`}>
                          {formatXOF(lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400 italic">
                      Aucune ligne détaillée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Arrêtée de facture en toutes lettres */}
          <div className={`${paperFormat === "A4-half" ? "mt-3 text-[9px]" : "mt-5 text-xs"} text-gray-700 italic border-t border-gray-100 pt-3`}>
            Arrêtée la présente facture à la somme de :{" "}
            <span className="font-bold text-gray-900 uppercase">
              {amountInWordsXOF(totalAmount)}
            </span>.
          </div>

          {/* Bas de page : Totaux et Visas */}
          <div className={`${paperFormat === "A4-half" ? "mt-4" : "mt-8"} flex justify-between items-end gap-6`}>
            {/* Signature & Cachet officiel */}
            <div className="w-1/2">
              <p
                className={`${
                  paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"
                } font-bold text-gray-500 uppercase tracking-wider mb-2`}
              >
                Pour l'administration de l'établissement
              </p>
              <div className="flex items-center gap-4 min-h-[60px]">
                {school?.stamp && (
                  <img
                    src={school.stamp}
                    alt="Cachet de l'établissement"
                    className={`${paperFormat === "A4-half" ? "h-14" : "h-20"} object-contain mix-blend-multiply`}
                  />
                )}
                {school?.signature && (
                  <img
                    src={school.signature}
                    alt="Signature de la direction"
                    className={`${paperFormat === "A4-half" ? "h-10" : "h-14"} object-contain mix-blend-multiply`}
                  />
                )}
                {!school?.stamp && !school?.signature && (
                  <div className="border border-dashed border-gray-300 rounded-lg p-3 text-gray-400 text-center text-[10px] italic w-44">
                    Cachet et signature
                  </div>
                )}
              </div>
            </div>

            {/* Cadre des montants */}
            <div className="w-[45%] flex justify-end">
              <div
                className={`w-full max-w-[280px] bg-gray-50 ${
                  paperFormat === "A4-half" ? "p-3 rounded-lg" : "p-4 rounded-xl"
                } border border-gray-200 print:border-none print:bg-transparent print:p-0`}
              >
                <div
                  className={`flex justify-between items-center text-gray-600 ${
                    paperFormat === "A4-half" ? "text-xs mb-1.5" : "text-sm mb-2"
                  }`}
                >
                  <span>Montant total :</span>
                  <span className="font-bold text-gray-900 tabular-nums">{formatXOF(totalAmount)}</span>
                </div>
                <div
                  className={`flex justify-between items-center text-gray-600 ${
                    paperFormat === "A4-half" ? "text-xs mb-2 pb-2" : "text-sm mb-2.5 pb-2.5"
                  } border-b border-gray-200`}
                >
                  <span>Total encaissé :</span>
                  <span className="font-bold text-emerald-700 tabular-nums">{formatXOF(totalPaid)}</span>
                </div>
                <div
                  className={`flex justify-between items-center font-black text-gray-900 ${
                    paperFormat === "A4-half" ? "text-sm" : "text-base sm:text-lg"
                  }`}
                >
                  <span>Reste dû :</span>
                  <span className={remainingAmount > 0 ? "text-red-700 tabular-nums" : "text-emerald-700 tabular-nums"}>
                    {formatXOF(remainingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
