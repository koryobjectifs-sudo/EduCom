"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Receipt, ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatXOF } from "@/lib/finance/numbering";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/constants";

export default function ReceiptSelector({
  payments,
}: {
  payments: any[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const recNum = (p.receiptNumber || "").toLowerCase();
      const invNum = (p.invoice?.invoiceNumber || "").toLowerCase();
      const title = (p.invoice?.title || "").toLowerCase();
      const student = p.invoice?.student
        ? `${p.invoice.student.firstName} ${p.invoice.student.lastName}`.toLowerCase()
        : "";
      return recNum.includes(q) || invNum.includes(q) || title.includes(q) || student.includes(q);
    });
  }, [payments, query]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/payments"
            className="rounded-full p-2 text-text-faint hover:bg-sunk hover:text-text transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              Reçus de Paiement Officiels
            </h1>
            <p className="text-xs text-text-soft mt-0.5">
              Un reçu atteste d'un encaissement validé en base. Sélectionnez un versement pour imprimer son reçu certifié.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-2 rounded-xl border border-rule bg-white px-3.5 py-2 text-xs font-semibold text-text hover:bg-sunk transition-colors shadow-2xs"
        >
          <Wallet className="w-3.5 h-3.5 text-text-faint" />
          Gérer les encaissements
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-surface p-3 rounded-2xl border border-rule">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-faint" />
          <input
            type="text"
            placeholder="Rechercher par n° de reçu, facture ou élève..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-rule rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
          />
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white border border-rule rounded-2xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="mx-auto h-10 w-10 text-text-faint mb-3" />
            <h3 className="text-base font-semibold text-text">Aucun reçu disponible</h3>
            <p className="text-xs text-text-soft mt-1 max-w-sm mx-auto">
              {payments.length === 0
                ? "Aucun paiement n'a encore été encaissé dans cet établissement. Les reçus sont générés automatiquement lors de chaque règlement de facture."
                : "Aucun paiement ne correspond à votre recherche."}
            </p>
            {payments.length === 0 && (
              <div className="mt-4">
                <Link
                  href="/dashboard/payments"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover"
                >
                  Aller aux factures à encaisser
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const student = p.invoice?.student;
              const className = student?.enrollments?.[0]?.class?.name || "Sans classe";
              const method = PAYMENT_METHOD_LABELS[p.method] || p.method;

              return (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-sunk/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {p.receiptNumber || `#${p.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className="text-xs text-text-soft font-mono">
                        Facture : {p.invoice?.invoiceNumber || `#${p.invoice?.id?.slice(0, 8).toUpperCase() || "—"}`}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        {method}
                      </span>
                    </div>

                    <p className="text-xs text-text-soft">
                      Élève : <strong className="text-text">{student ? `${student.firstName} ${student.lastName}` : "Non rattaché"}</strong>
                      {" · "}
                      Classe : {className}
                      {" · "}
                      Encaissé le {formatDate(p.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">{formatXOF(p.amount)}</p>
                      <p className="text-[10.5px] text-text-faint">{p.invoice?.title || "Scolarité"}</p>
                    </div>

                    <Link
                      href={`/dashboard/payments/receipt?paymentId=${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rule bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-2xs"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Imprimer le reçu
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
