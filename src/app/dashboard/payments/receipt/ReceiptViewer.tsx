"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatXOF, amountInWordsXOF } from "@/lib/finance/numbering";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance";
import GenerateDocumentDropdown from "@/components/documents/GenerateDocumentDropdown";

export default function ReceiptViewer({
  payment,
  school,
}: {
  payment: any;
  school: any;
}) {
  const [paperFormat, setPaperFormat] = useState<"A4" | "A5" | "A4-half">("A5");

  const invoice = payment.invoice;
  const student = invoice?.student;
  const invoiceTotal = invoice?.totalAmount || 0;
  const allPayments = invoice?.payments || [];
  const totalPaid = allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const remainingAmount = Math.max(0, invoiceTotal - totalPaid);

  const methodLabel = PAYMENT_METHOD_LABELS[payment.method] || payment.method;

  useEffect(() => {
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Élève";
    const num = payment.receiptNumber || payment.id.slice(0, 8).toUpperCase();
    document.title = `Reçu ${num} - ${studentName}`;
  }, [payment, student]);

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
              <option value="A5">A5 (Standard Reçu)</option>
              <option value="A4-half">Demi-A4 (Format Chéquier)</option>
              <option value="A4">A4 (Page Pleine)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <GenerateDocumentDropdown
            context="payment"
            paymentId={payment.id}
            invoiceId={invoice?.id}
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

      {/* The Printable Receipt */}
      <div className="w-full overflow-x-auto pb-6">
        <div
          style={{
            width: paperFormat === "A5" ? "148mm" : "210mm",
            minHeight: paperFormat === "A4" ? "297mm" : paperFormat === "A5" ? "210mm" : "148mm",
          }}
          className={`bg-white ${
            paperFormat === "A4-half" ? "p-6" : paperFormat === "A5" ? "p-8" : "p-12"
          } shadow-xl border border-gray-200 flex flex-col relative print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none z-10 print:min-h-0 mx-auto origin-top`}
        >
          {/* Subtle watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
            {school?.logo ? (
              <img src={school.logo} alt="" className="w-[60%] h-[60%] object-contain" />
            ) : (
              <div className="w-[300px] h-[300px] rounded-full bg-blue-600 blur-3xl opacity-20" />
            )}
          </div>

          {/* Header */}
          <div
            className={`flex flex-col sm:flex-row justify-between sm:items-start gap-4 sm:gap-2 print:flex-row print:items-start border-b border-gray-200 relative z-10 ${
              paperFormat === "A4-half" ? "pb-3 mb-3" : "pb-6 mb-6"
            }`}
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-3">
                {school?.logo ? (
                  <img
                    src={school.logo}
                    alt={school.name}
                    className={`${paperFormat === "A4-half" ? "h-8 w-8" : "h-11 w-11"} object-contain rounded-lg shadow-2xs flex-shrink-0`}
                  />
                ) : (
                  <div
                    className={`flex ${
                      paperFormat === "A4-half" ? "h-8 w-8 text-xs" : "h-11 w-11 text-base"
                    } flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white font-bold`}
                  >
                    {school?.name ? school.name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
                <div>
                  <h1
                    className={`${
                      paperFormat === "A4-half" ? "text-sm" : "text-base sm:text-lg"
                    } font-bold text-gray-900 tracking-tight leading-snug`}
                  >
                    {school?.name || "Établissement Scolaire"}
                  </h1>
                  <p className={`${paperFormat === "A4-half" ? "text-[9px]" : "text-xs"} text-gray-500`}>
                    {school?.address || "Sénégal"}
                  </p>
                </div>
              </div>
              <div
                className={`mt-2 ${
                  paperFormat === "A4-half" ? "text-[8.5px]" : "text-[10.5px]"
                } text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5`}
              >
                {school?.phone && <span>Tél : {school.phone}</span>}
                {school?.email && <span>Email : {school.email}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right print:text-right flex-shrink-0">
              <span
                className={`inline-block ${
                  paperFormat === "A4-half" ? "text-xs sm:text-sm" : "text-base sm:text-xl"
                } font-black text-gray-900 tracking-wider uppercase`}
              >
                REÇU DE PAIEMENT
              </span>
              <p
                className={`${
                  paperFormat === "A4-half" ? "text-[10px]" : "text-sm"
                } font-mono font-bold text-emerald-700 mt-0.5`}
              >
                N° {payment.receiptNumber || `#${payment.id.slice(0, 8).toUpperCase()}`}
              </p>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  <CheckCircle2 className="w-3 h-3" /> ENCAISSEMENT CERTIFIÉ
                </span>
              </div>
            </div>
          </div>

          {/* Grid Information */}
          <div
            className={`grid grid-cols-2 ${
              paperFormat === "A4-half" ? "gap-3 py-2 text-[9px]" : "gap-6 py-4 text-xs"
            } border-b border-gray-100`}
          >
            <div className="space-y-1.5">
              <div>
                <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8.5px] block">
                  ÉLÈVE CONCERNÉ
                </span>
                {student ? (
                  <div className="mt-0.5">
                    <p className={`font-bold ${paperFormat === "A4-half" ? "text-xs" : "text-sm"} text-gray-900`}>
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-gray-500 text-[10.5px]">
                      Classe : <strong className="text-gray-800">{student.enrollments?.[0]?.class?.name || "Non affectée"}</strong>
                      {student.matricule && <span> · Mat. {student.matricule}</span>}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Élève non rattaché</p>
                )}
              </div>

              <div>
                <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8.5px] block">
                  MOTIF / FACTURE
                </span>
                <p className="font-medium text-gray-800">
                  {invoice?.title || "Frais de scolarité"}{" "}
                  <span className="font-mono text-gray-500 font-normal">
                    ({invoice?.invoiceNumber || `#${invoice?.id?.slice(0, 8).toUpperCase()}`})
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <div>
                <span className="text-gray-500">Date d'encaissement :</span>{" "}
                <strong className="text-gray-900 tabular-nums">{formatDate(payment.createdAt)}</strong>
              </div>
              <div>
                <span className="text-gray-500">Mode de règlement :</span>{" "}
                <strong className="text-gray-900">{methodLabel}</strong>
              </div>
              {payment.reference && (
                <div>
                  <span className="text-gray-500">Réf. transaction / chèque :</span>{" "}
                  <strong className="font-mono text-gray-900">{payment.reference}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Amount Box */}
          <div className={`${paperFormat === "A4-half" ? "my-3 p-3" : "my-5 p-5"} bg-emerald-50/60 rounded-xl border border-emerald-200/80`}>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                Montant Reçu :
              </span>
              <span className={`${paperFormat === "A4-half" ? "text-lg" : "text-2xl"} font-black text-emerald-800 tabular-nums`}>
                {formatXOF(payment.amount)}
              </span>
            </div>
            <p className={`${paperFormat === "A4-half" ? "text-[9px] mt-1" : "text-xs mt-2"} text-emerald-800 italic`}>
              Soit en toutes lettres :{" "}
              <strong className="uppercase font-semibold">{amountInWordsXOF(payment.amount)}</strong>.
            </p>
          </div>

          {/* Situation comptable de la facture */}
          {invoice && (
            <div
              className={`${
                paperFormat === "A4-half" ? "py-2 text-[8.5px]" : "py-3 text-[11px]"
              } border-t border-b border-gray-100 flex justify-between items-center text-gray-600`}
            >
              <div>
                Total facture : <strong className="text-gray-900 tabular-nums">{formatXOF(invoiceTotal)}</strong>
              </div>
              <div>
                Cumul réglé : <strong className="text-emerald-700 tabular-nums">{formatXOF(totalPaid)}</strong>
              </div>
              <div>
                Reste à devoir :{" "}
                <strong className={remainingAmount > 0 ? "text-red-700 tabular-nums" : "text-emerald-700 tabular-nums"}>
                  {formatXOF(remainingAmount)}
                </strong>
              </div>
            </div>
          )}

          {/* Footer Signatures */}
          <div className={`${paperFormat === "A4-half" ? "mt-4" : "mt-8"} flex justify-between items-end gap-6`}>
            <div className="w-1/2">
              <p className={`${paperFormat === "A4-half" ? "text-[8px]" : "text-[10px]"} font-bold text-gray-500 uppercase tracking-wider mb-2`}>
                Cachet et signature de l'établissement
              </p>
              <div className="flex items-center gap-4 min-h-[50px]">
                {school?.stamp && (
                  <img
                    src={school.stamp}
                    alt="Cachet"
                    className={`${paperFormat === "A4-half" ? "h-12" : "h-16"} object-contain`}
                  />
                )}
                {school?.signature && (
                  <img
                    src={school.signature}
                    alt="Signature"
                    className={`${paperFormat === "A4-half" ? "h-9" : "h-12"} object-contain`}
                  />
                )}
                {!school?.stamp && !school?.signature && (
                  <div className="border border-dashed border-gray-300 rounded-lg p-2 text-gray-400 text-center text-[9px] italic w-40">
                    Visa comptable
                  </div>
                )}
              </div>
            </div>

            <div className="text-right text-gray-400 text-[9px] italic">
              Ce reçu fait foi de paiement libératoire pour le montant mentionné ci-dessus.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
