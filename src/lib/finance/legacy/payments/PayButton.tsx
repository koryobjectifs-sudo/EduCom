"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CollectPaymentModal, type InvoicePaymentTarget } from "./CollectPaymentModal";

export function PayButton({
  invoiceId,
  invoice,
}: {
  invoiceId?: string;
  invoice?: InvoicePaymentTarget;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const targetInvoice: InvoicePaymentTarget = invoice ?? {
    id: invoiceId || "",
    title: "Facture",
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200/80 shadow-2xs"
        title="Encaisser un versement"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Encaisser
      </button>

      <CollectPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        invoice={targetInvoice}
      />
    </>
  );
}
