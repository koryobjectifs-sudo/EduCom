"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Printer, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatXOF } from "@/lib/finance/numbering";

export default function InvoiceSelector({
  invoices,
}: {
  invoices: any[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (!q) return true;
      const num = (inv.invoiceNumber || "").toLowerCase();
      const title = (inv.title || "").toLowerCase();
      const student = inv.student ? `${inv.student.firstName} ${inv.student.lastName}`.toLowerCase() : "";
      return num.includes(q) || title.includes(q) || student.includes(q);
    });
  }, [invoices, query, statusFilter]);

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
              Imprimer une Facture Scolaire
            </h1>
            <p className="text-xs text-text-soft mt-0.5">
              Sélectionnez une facture officielle enregistrée pour l'imprimer, ou créez-en une nouvelle.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/payments/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface p-3 rounded-2xl border border-rule">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-faint" />
          <input
            type="text"
            placeholder="Rechercher par n° de facture ou élève..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-rule rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-faint font-medium">Statut :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-rule rounded-xl bg-white px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">Toutes les factures</option>
            <option value="PAID">Payées</option>
            <option value="PENDING">En attente</option>
            <option value="OVERDUE">En retard</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-rule rounded-2xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-text-faint mb-3" />
            <h3 className="text-base font-semibold text-text">Aucune facture correspondante</h3>
            <p className="text-xs text-text-soft mt-1 max-w-sm mx-auto">
              {invoices.length === 0
                ? "Aucune facture n'a encore été créée dans cet établissement."
                : "Aucune facture ne correspond à vos critères de recherche."}
            </p>
            {invoices.length === 0 && (
              <div className="mt-4">
                <Link
                  href="/dashboard/payments/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer la première facture
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((inv) => {
              const student = inv.student;
              const className = student?.enrollments?.[0]?.class?.name || "Sans classe";
              const isPaid = inv.status === "PAID";
              const isOverdue = !isPaid && new Date(inv.dueDate) < new Date();

              return (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-sunk/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {inv.invoiceNumber || `#${inv.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <h2 className="text-sm font-semibold text-text">{inv.title || "Facture Scolarité"}</h2>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isOverdue
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isPaid ? "Payée" : isOverdue ? "En retard" : "En attente"}
                      </span>
                    </div>

                    <p className="text-xs text-text-soft">
                      Élève : <strong className="text-text">{student ? `${student.firstName} ${student.lastName}` : "Non rattaché"}</strong>
                      {" · "}
                      Classe : {className}
                      {" · "}
                      Émise le {formatDate(inv.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-text tabular-nums">{formatXOF(inv.totalAmount)}</p>
                      <p className="text-[10.5px] text-text-faint">Échéance : {formatDate(inv.dueDate)}</p>
                    </div>

                    <Link
                      href={`/dashboard/payments/invoice?invoiceId=${inv.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rule bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer
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
