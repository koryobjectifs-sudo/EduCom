"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  ChevronRight, 
  Building2,
  ShieldCheck
} from "lucide-react";
import { formatAmount } from "@/lib/moneyFormat";
import { formatDate } from "@/lib/dateUtils";
import { useTranslation } from "@/lib/i18n";

export interface ParentChildData {
  id: string;
  firstName: string;
  lastName: string;
  className: string | null;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  nextDueDate: Date | null;
  nextDueAmount: number;
  invoices: {
    id: string;
    title: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: Date;
    status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
    items: { title: string; amount: number; quantity: number }[];
  }[];
}

export interface ParentPaymentHistoryItem {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  createdAt: Date;
  invoiceId: string;
  invoiceTitle: string;
  studentName: string;
  receiptNumber?: string;
}

export interface ParentPaymentsViewProps {
  schoolName: string;
  schoolLogo?: string | null;
  childrenData: ParentChildData[];
  paymentHistory: ParentPaymentHistoryItem[];
  totalRemainingBalance: number;
  earliestNextDueDate: Date | null;
  earliestNextDueAmount: number;
  totalPaidAllTime: number;
}

export default function ParentPaymentsView({
  schoolName,
  childrenData,
  paymentHistory,
  totalRemainingBalance,
  earliestNextDueDate,
  earliestNextDueAmount,
  totalPaidAllTime,
}: ParentPaymentsViewProps) {
  const { t, locale } = useTranslation();
  const [selectedChildId, setSelectedChildId] = useState<string>(
    childrenData.length > 0 ? childrenData[0].id : "all"
  );
  const [activeTab, setActiveTab] = useState<"invoices" | "history">("invoices");

  const jour = (d: Date) => formatDate(d, locale);

  const methodLabels: Record<string, string> = {
    CASH: t("finance", "cash"),
    MOBILE_MONEY: t("finance", "mobileMoney"),
    CHECK: t("finance", "check"),
    BANK_TRANSFER: t("finance", "bankTransfer"),
  };

  const filteredChildren = selectedChildId === "all" 
    ? childrenData 
    : childrenData.filter((c) => c.id === selectedChildId);

  const isUpToDate = totalRemainingBalance <= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête Espace Paiement Parent */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {t("parent", "title")}
          </h1>
          <p className="mt-1 text-sm text-text-soft">
            {t("parent", "subtitle")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{schoolName}</span>
        </div>
      </div>

      {/* Cartes KPI Parent (Centrées sur la famille) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Solde restant */}
        <div className={`rounded-xl border p-4 sm:p-5 shadow-xs transition-colors ${
          isUpToDate 
            ? "border-emerald-200 bg-emerald-50/40" 
            : "border-amber-200 bg-amber-50/30"
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">
              {t("parent", "remainingBalance")}
            </p>
            {isUpToDate ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> {t("parent", "upToDateBadge")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                <Clock className="h-3 w-3" /> {t("parent", "inProgressBadge")}
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-text">
            {formatAmount(totalRemainingBalance)}
          </p>
          <p className="mt-1 text-xs text-text-soft">
            {isUpToDate 
              ? t("parent", "allSettledNotice") 
              : t("parent", "forAllChildrenCount", { count: childrenData.length })}
          </p>
        </div>

        {/* Prochaine échéance */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">
              Prochaine échéance
            </p>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          {earliestNextDueDate ? (
            <>
              <p className="mt-2 text-xl sm:text-2xl font-bold text-text">
                {jour(earliestNextDueDate)}
              </p>
              <p className="mt-1 text-xs font-medium text-text-soft">
                Montant : <span className="font-semibold text-text">{formatAmount(earliestNextDueAmount)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-bold text-text-soft">
                {t("parent", "noUpcomingDue")}
              </p>
              <p className="mt-1 text-xs text-text-faint">
                {t("parent", "noUpcomingDueNotice")}
              </p>
            </>
          )}
        </div>

        {/* Historique des versements */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">
              {t("parent", "totalPaid")}
            </p>
            <Receipt className="h-4 w-4 text-text-faint" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-text">
            {formatAmount(totalPaidAllTime)}
          </p>
          <p className="mt-1 text-xs text-text-soft">
            {t("parent", "receiptsCountInfo", { count: paymentHistory.length })}
          </p>
        </div>
      </div>

      {/* Sélecteur d'enfant (si multiple) et onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {/* Filtre enfant */}
        {childrenData.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-text-faint uppercase mr-1">{t("parent", "filterStudent")}</span>
            <button
              onClick={() => setSelectedChildId("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedChildId === "all"
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-surface border border-rule text-text-soft hover:bg-sunk hover:text-text"
              }`}
            >
              {t("parent", "allStudentsBtn", { count: childrenData.length })}
            </button>
            {childrenData.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedChildId === c.id
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-surface border border-rule text-text-soft hover:bg-sunk hover:text-text"
                }`}
              >
                <span>{c.firstName}</span>
                {c.remainingBalance > 0 && (
                  <span className={`h-2 w-2 rounded-full ${selectedChildId === c.id ? "bg-amber-300" : "bg-amber-500"}`} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Onglets Factures / Historique */}
        <div className="inline-flex rounded-lg border border-rule bg-sunk/60 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "invoices"
                ? "bg-surface text-text shadow-2xs"
                : "text-text-soft hover:text-text"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t("parent", "invoicesTab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "history"
                ? "bg-surface text-text shadow-2xs"
                : "text-text-soft hover:text-text"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>{t("parent", "receiptsTab", { count: paymentHistory.length })}</span>
          </button>
        </div>
      </div>

      {/* VUE 1 : Factures et soldes par enfant */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          {filteredChildren.map((child) => (
            <div key={child.id} className="rounded-xl border border-rule bg-surface shadow-xs overflow-hidden">
              {/* En-tête de l'enfant */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-rule bg-sunk/40 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {child.firstName[0]}{child.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text">
                      {child.firstName} {child.lastName}
                    </h2>
                    <p className="text-xs text-text-soft">
                      {t("parent", "classLabel", { className: child.className || "Non assignée" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-text-faint">Reste à régler :</span>{" "}
                    <span className={`font-bold tabular-nums ${child.remainingBalance > 0 ? "text-amber-700 font-semibold" : "text-emerald-700"}`}>
                      {formatAmount(child.remainingBalance)}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/students/${child.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {t("parent", "viewProfile")} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Liste des factures de cet enfant */}
              {child.invoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-soft">
                  {t("parent", "noInvoices", { name: child.firstName })}
                </div>
              ) : (
                <div className="divide-y divide-rule">
                  {child.invoices.map((invoice) => {
                    const isPaid = invoice.status === "PAID" || invoice.remainingAmount <= 0;
                    const isPartial = invoice.status === "PARTIAL" || (invoice.paidAmount > 0 && !isPaid);

                    return (
                      <div key={invoice.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-sunk/20 transition-colors">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-text">
                              {invoice.title || "Frais de scolarité"}
                            </h3>
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> {t("parent", "invoiceStatusPaid")}
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
                                <Clock className="h-3 w-3" /> {t("parent", "invoiceStatusPartial", { amount: formatAmount(invoice.paidAmount) })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-slate-700">
                                {t("parent", "invoiceStatusPending")}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-text-soft flex items-center gap-2">
                            <span>{t("parent", "dueDateLabel", { date: jour(invoice.dueDate) })}</span>
                            {invoice.items.length > 0 && (
                              <>
                                <span>·</span>
                                <span>{t("parent", "itemsDetailCount", { count: invoice.items.length })}</span>
                              </>
                            )}
                          </p>

                          {/* Barre de progression du paiement */}
                          <div className="w-full max-w-xs bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${Math.min(100, Math.round((invoice.paidAmount / (invoice.totalAmount || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Montants */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-rule text-right">
                          <div>
                            <p className="text-sm sm:text-base font-bold tabular-nums text-text">
                              {formatAmount(invoice.totalAmount)}
                            </p>
                            {!isPaid && (
                              <p className="text-xs font-semibold text-amber-700">
                                {t("parent", "remainingAmountLabel", { amount: formatAmount(invoice.remainingAmount) })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VUE 2 : Historique des versements & Reçus */}
      {activeTab === "history" && (
        <div className="rounded-xl border border-rule bg-surface shadow-xs overflow-hidden">
          <div className="border-b border-rule bg-sunk/40 px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">
              {t("parent", "historyTitle")}
            </h2>
            <span className="text-xs text-text-soft">
              {paymentHistory.length} reçu(s) disponible(s)
            </span>
          </div>

          {paymentHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="mx-auto h-8 w-8 text-text-faint mb-2" />
              <p className="text-sm font-semibold text-text">{t("parent", "noPaymentsYet")}</p>
              <p className="mt-1 text-xs text-text-soft">
                {t("parent", "noPaymentsNotice")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-sunk/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text">
                        {formatAmount(payment.amount)}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                        {methodLabels[payment.method] || payment.method}
                      </span>
                    </div>

                    <p className="text-xs text-text-soft">
                      Élève : <strong className="text-text">{payment.studentName}</strong> · Motif : {payment.invoiceTitle}
                    </p>
                    <p className="text-[11px] text-text-faint">
                      Enregistré le {jour(payment.createdAt)}
                      {payment.reference ? ` · Réf : ${payment.reference}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-white px-3 py-1.5 text-xs font-semibold text-text shadow-2xs">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      {t("parent", "certifiedReceiptBadge")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note d'information de l'école */}
      <div className="rounded-xl border border-rule bg-sunk/30 p-4 text-xs text-text-soft flex items-start gap-3">
        <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-text">{t("parent", "schoolNoticeTitle")}</p>
          <p className="mt-0.5">
            {t("parent", "schoolNoticeBody")}
          </p>
        </div>
      </div>
    </div>
  );
}
