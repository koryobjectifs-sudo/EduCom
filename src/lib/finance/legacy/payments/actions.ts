"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { getNextInvoiceNumber, getNextReceiptNumber } from "@/lib/finance/numbering";

/**
 * Actions de facturation.
 *
 * ═══ CE QUE LE LOT 11.1 CORRIGE ═══
 *
 * Ces deux actions authentifiaient leur appelant et résolvaient bien le
 * `schoolId` depuis la session — mais **ne vérifiaient aucun rôle**. Or une
 * server action est un point d'entrée HTTP appelable directement, et `PARENT` a
 * accès à `/dashboard/payments`. Conséquence : un parent pouvait émettre des
 * factures, et surtout **marquer n'importe quelle facture de son école comme
 * payée** — une élévation de privilège, pas seulement une fuite.
 *
 * Le droit exigé est `/dashboard/payments/new`, le chemin d'émission des
 * factures, désormais refusé à `PARENT` dans `ROLE_DENIALS`. Une seule règle
 * centrale couvre les deux actions et l'écran.
 */

/** Chemin dont l'accès vaut « peut gérer la facturation ». */
const BILLING_PATH = "/dashboard/payments/new";

export async function createInvoice(formData: FormData) {
  const title = formData.get("title") as string;
  const studentId = formData.get("studentId") as string;
  const dueDateStr = formData.get("dueDate") as string;

  // Extract items
  const itemsJson = formData.get("items") as string;
  let items: { title: string; amount: number; quantity: number }[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch (e) {
    return { error: "Lignes de facturation invalides." };
  }

  if (!title || !dueDateStr || items.length === 0) {
    return { error: "Veuillez remplir tous les champs obligatoires et ajouter au moins une ligne." };
  }

  // Authentification ET contrôle de rôle. Sans le second, un PARENT pouvait
  // émettre des factures au nom de l'établissement.
  const auth = await requireActionContext(BILLING_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  // ⚠️ L'élève facturé doit appartenir à l'établissement de la session. Sans ce
  // contrôle, un `studentId` fourni par le client rattacherait la facture à
  // l'élève d'une autre école.
  let targetStudentId: string | undefined;
  if (studentId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: ctx.schoolId },
      select: { id: true },
    });
    if (!student) return { error: "Élève introuvable dans cet établissement." };
    targetStudentId = student.id;
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await getNextInvoiceNumber(tx, ctx.schoolId, new Date(dueDateStr));
      return tx.invoice.create({
        data: {
          invoiceNumber,
          title,
          totalAmount,
          dueDate: new Date(dueDateStr),
          status: "PENDING",
          studentId: targetStudentId,
          schoolId: ctx.schoolId,
          items: {
            create: items.map(item => ({
              title: item.title,
              amount: item.amount,
              quantity: item.quantity
            }))
          }
        },
        select: { id: true, invoiceNumber: true },
      });
    });
    await recordAudit(ctx, {
      action: "invoice.create",
      entity: "invoice",
      entityId: created.id,
      details: { title, totalAmount, studentId: targetStudentId ?? null, invoiceNumber: created.invoiceNumber },
    });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return { error: "Erreur lors de la création de la facture" };
  }

  revalidatePath("/payments");
  redirect("/dashboard/payments");
}

export async function recordInvoicePayment({
  invoiceId,
  amount,
  method = "CASH",
  reference,
}: {
  invoiceId: string;
  amount: number;
  method?: "CASH" | "CHECK" | "MOBILE_MONEY" | "BANK_TRANSFER";
  reference?: string;
}) {
  const auth = await requireActionContext(BILLING_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const parsedAmount = Math.round(Number(amount));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { error: "Le montant du versement doit être supérieur à zéro." };
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: ctx.schoolId },
      include: { payments: { select: { amount: true } } },
    });

    if (!invoice) return { error: "Facture introuvable" };
    if (invoice.status === "CANCELLED") return { error: "Cette facture est annulée" };

    const currentPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, invoice.totalAmount - currentPaid);

    if (remaining <= 0 || invoice.status === "PAID") {
      return { error: "Cette facture est déjà intégralement soldée." };
    }

    if (parsedAmount > remaining) {
      return {
        error: `Le montant saisi (${parsedAmount.toLocaleString("fr-FR")} FCFA) dépasse le reliquat restant (${remaining.toLocaleString("fr-FR")} FCFA).`,
      };
    }

    const newTotalPaid = currentPaid + parsedAmount;
    const newStatus = newTotalPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";

    const payment = await prisma.$transaction(async (tx) => {
      const receiptNumber = await getNextReceiptNumber(tx, ctx.schoolId);
      const p = await tx.payment.create({
        data: {
          receiptNumber,
          amount: parsedAmount,
          method,
          reference: reference?.trim() || null,
          invoiceId: invoice.id,
          schoolId: ctx.schoolId,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id, schoolId: ctx.schoolId },
        data: { status: newStatus },
      });

      return p;
    });

    const finalRemaining = Math.max(0, invoice.totalAmount - newTotalPaid);

    await recordAudit(ctx, {
      action: "invoice.collect",
      entity: "invoice",
      entityId: invoice.id,
      details: {
        from: invoice.status,
        to: newStatus,
        collected: parsedAmount,
        totalPaid: newTotalPaid,
        remaining: finalRemaining,
        receiptNumber: payment.receiptNumber,
      },
    });

    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/payments/receipt");
    revalidatePath("/famille/paiements");

    return {
      success: true,
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      paidAmount: parsedAmount,
      remainingAmount: finalRemaining,
      status: newStatus,
    };
  } catch (error) {
    console.error("Failed to record invoice payment:", error);
    return { error: "Erreur lors de l'enregistrement de l'encaissement" };
  }
}

export async function markInvoiceAsPaid(invoiceId: string) {
  const auth = await requireActionContext(BILLING_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId: ctx.schoolId },
    include: { payments: { select: { amount: true } } },
  });

  if (!invoice) return { error: "Facture introuvable" };
  const currentPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, invoice.totalAmount - currentPaid);

  if (remaining <= 0) return { error: "Facture déjà payée" };

  return recordInvoicePayment({
    invoiceId,
    amount: remaining,
    method: "CASH",
  });
}

/**
 * Action d'encaissement rapide depuis la vue "Reste à encaisser".
 * Génère automatiquement la facture du mois courant et l'encaissement associé.
 */
export async function quickCollect(studentId: string, amount: number) {
  const auth = await requireActionContext(BILLING_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: ctx.schoolId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!student) return { error: "Élève introuvable." };

  const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const title = `Scolarité - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create Invoice with sequential number
      const invoiceNumber = await getNextInvoiceNumber(tx, ctx.schoolId);
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          title,
          totalAmount: amount,
          dueDate: new Date(),
          status: "PAID",
          studentId: student.id,
          schoolId: ctx.schoolId,
          items: {
            create: [{
              title: "Frais mensuels attendus",
              amount: amount,
              quantity: 1
            }]
          }
        },
      });

      // 2. Create Payment with sequential receipt number
      const receiptNumber = await getNextReceiptNumber(tx, ctx.schoolId);
      await tx.payment.create({
        data: {
          receiptNumber,
          amount: amount,
          method: "CASH", // Defaulting to cash for quick collect
          invoiceId: invoice.id,
          schoolId: ctx.schoolId,
        },
      });

      await recordAudit(ctx, {
        action: "invoice.collect",
        entity: "invoice",
        entityId: invoice.id,
        details: { mode: "quick", amount: amount, studentId: student.id, invoiceNumber, receiptNumber },
      });
    });

    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (error) {
    console.error("Failed to quick collect:", error);
    return { error: "Erreur lors de l'encaissement rapide" };
  }
}
