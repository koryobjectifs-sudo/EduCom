"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { formatXOF } from "@/lib/finance/numbering";
import { recordInvoicePayment } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Receipt, Check, ArrowRight } from "lucide-react";

export type InvoicePaymentTarget = {
  id: string;
  invoiceNumber?: string | null;
  title: string;
  totalAmount: number;
  studentName?: string | null;
  paidAmount: number;
  remainingAmount: number;
};

export function CollectPaymentModal({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoicePaymentTarget | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"CASH" | "CHECK" | "MOBILE_MONEY" | "BANK_TRANSFER">("CASH");
  const [reference, setReference] = useState("");
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string | null>(null);

  // Sync default amount with invoice remaining balance when modal opens
  const remaining = invoice ? Math.max(0, invoice.remainingAmount) : 0;
  const effectiveAmount = amount === "" ? (remaining > 0 ? String(remaining) : "") : amount;

  const handleClose = () => {
    setAmount("");
    setReference("");
    setMethod("CASH");
    setLastPaymentId(null);
    setLastReceiptNumber(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const parsed = parseInt(effectiveAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Veuillez saisir un montant supérieur à zéro.");
      return;
    }
    if (parsed > remaining) {
      toast.error(`Le montant ne peut pas dépasser le reliquat restant (${formatXOF(remaining)}).`);
      return;
    }

    startTransition(async () => {
      const res = await recordInvoicePayment({
        invoiceId: invoice.id,
        amount: parsed,
        method,
        reference: reference.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      if (res?.success && res.paymentId) {
        setLastPaymentId(res.paymentId);
        setLastReceiptNumber(res.receiptNumber ?? null);
        toast.success(
          `Encaissement de ${formatXOF(parsed)} enregistré. Reçu ${res.receiptNumber || ""}`
        );
        router.refresh();
      }
    });
  };

  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        lastPaymentId ? (
          <span className="flex items-center gap-2 text-emerald-700">
            <Check className="h-5 w-5" /> Encaissement validé
          </span>
        ) : (
          "Encaisser un règlement"
        )
      }
      description={
        lastPaymentId
          ? `Le reçu officiel ${lastReceiptNumber || ""} est prêt à être imprimé ou transmis.`
          : `Facture ${invoice.invoiceNumber || invoice.title} · ${invoice.studentName || "Famille"}`
      }
      size="md"
    >
      {lastPaymentId ? (
        <div className="space-y-5 py-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              N° de Reçu officiel
            </p>
            <p className="mt-1 font-mono text-xl font-black text-emerald-900">
              {lastReceiptNumber || "Généré"}
            </p>
            <p className="mt-2 text-xs text-emerald-700">
              Le paiement a été imputé et le reliquat de la facture a été mis à jour.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              Fermer
            </Button>
            <Button
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
              icon={<Receipt className="h-4 w-4" />}
              onClick={() => {
                router.push(`/dashboard/payments/receipt?paymentId=${lastPaymentId}`);
                handleClose();
              }}
            >
              Imprimer le reçu
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Situation comptable de la facture */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-sunk/60 p-3 text-center border border-rule">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-text-faint">
                Total facture
              </span>
              <span className="text-xs font-bold text-text tabular-nums">
                {formatXOF(invoice.totalAmount)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-text-faint">
                Déjà versé
              </span>
              <span className="text-xs font-bold text-emerald-700 tabular-nums">
                {formatXOF(invoice.paidAmount)}
              </span>
            </div>
            <div className="rounded-lg bg-surface border border-rule p-1 shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-primary">
                Reste dû
              </span>
              <span className="text-sm font-black text-primary tabular-nums">
                {formatXOF(remaining)}
              </span>
            </div>
          </div>

          {/* Saisie du versement */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label htmlFor="amount" className="text-xs font-medium text-text">
                Montant encaissé (FCFA) *
              </label>
              {remaining > 0 && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAmount(String(remaining))}
                    className="text-[10px] font-semibold text-primary hover:underline px-1 py-0.5 rounded bg-primary/5"
                  >
                    Tout solder
                  </button>
                  {remaining >= 10000 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.round(remaining / 2)))}
                      className="text-[10px] font-medium text-text-soft hover:underline px-1 py-0.5 rounded bg-sunk"
                    >
                      50%
                    </button>
                  )}
                </div>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              min={1}
              max={remaining}
              step={1}
              required
              value={effectiveAmount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Ex: ${remaining}`}
              className="text-base font-bold tabular-nums"
              autoFocus
            />
            {Number(effectiveAmount) > 0 && Number(effectiveAmount) < remaining && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200/60">
                Paiement partiel : il restera un reliquat de{" "}
                <strong>{formatXOF(remaining - Number(effectiveAmount))}</strong> sur cette facture.
              </p>
            )}
          </div>

          {/* Mode de règlement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="method" className="block text-xs font-medium text-text mb-1">
                Mode d&apos;encaissement *
              </label>
              <Select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
              >
                <option value="CASH">Espèces</option>
                <option value="MOBILE_MONEY">Wave / Orange Money</option>
                <option value="CHECK">Chèque bancaire</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
              </Select>
            </div>

            <div>
              <label htmlFor="reference" className="block text-xs font-medium text-text mb-1">
                Référence (optionnelle)
              </label>
              <Input
                id="reference"
                type="text"
                placeholder={
                  method === "CHECK"
                    ? "N° chèque / Banque"
                    : method === "MOBILE_MONEY"
                    ? "Réf. transaction Wave/OM"
                    : "Observation ou reçu papier"
                }
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-rule">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              type="submit"
              loading={isPending}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Enregistrer l&apos;encaissement
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
