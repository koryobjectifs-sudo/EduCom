"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";

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
    const created = await prisma.invoice.create({
      data: {
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
      select: { id: true },
    });
    await recordAudit(ctx, {
      action: "invoice.create",
      entity: "invoice",
      entityId: created.id,
      details: { title, totalAmount, studentId: targetStudentId ?? null },
    });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return { error: "Erreur lors de la création de la facture" };
  }

  revalidatePath("/payments");
  redirect("/dashboard/payments");
}

export async function markInvoiceAsPaid(invoiceId: string) {
  // ⚠️ Le contrôle de rôle manquait entièrement : un PARENT pouvait solder
  // n'importe quelle facture de son école, la sienne ou celle d'une autre
  // famille. C'est le correctif le plus important de ce fichier.
  const auth = await requireActionContext(BILLING_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: ctx.schoolId },
    });

    if (!invoice) return { error: "Facture introuvable" };
    if (invoice.status === "PAID") return { error: "Facture déjà payée" };
    if (invoice.status === "CANCELLED") return { error: "Facture annulée" };

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          amount: invoice.totalAmount,
          method: "CASH",
          invoiceId: invoice.id,
          schoolId: ctx.schoolId,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id, schoolId: ctx.schoolId },
        data: { status: "PAID" },
      }),
    ]);

    await recordAudit(ctx, {
      action: "invoice.collect",
      entity: "invoice",
      entityId: invoice.id,
      details: { from: invoice.status, to: "PAID", amount: invoice.totalAmount },
    });

    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark invoice as paid:", error);
    return { error: "Erreur lors de l'encaissement" };
  }
}
