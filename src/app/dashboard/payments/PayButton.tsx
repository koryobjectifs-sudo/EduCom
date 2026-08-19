"use client";

import { useTransition } from "react";
import { markInvoiceAsPaid } from "./actions";
import { CheckCircle } from "lucide-react";

export function PayButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  const handlePay = () => {
    startTransition(async () => {
      const result = await markInvoiceAsPaid(invoiceId);
      if (result?.error) {
        alert(result.error);
      }
    });
  };

  return (
    <button
      onClick={handlePay}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-blue-900 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
    >
      <CheckCircle className="h-4 w-4" />
      {isPending ? "En cours..." : "Encaisser"}
    </button>
  );
}
