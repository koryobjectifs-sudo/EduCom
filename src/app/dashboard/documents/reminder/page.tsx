import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import ReminderGenerator from "./Generator";

const PATH = "/dashboard/documents/reminder";

/**
 * Relances des factures échues.
 *
 * ⚠️ **Garde ajoutée au lot 11.1.** `PARENT` possède `/dashboard/documents` et
 * atteignait donc cet écran, qui charge **toutes** les factures échues de
 * l'établissement — avec, pour chacune, le nom, le téléphone et l'e-mail du
 * parent de la famille concernée (`include: { student: { parent: true } }`).
 * C'était la fuite la plus grave du domaine facturation.
 *
 * Le générateur lui-même n'est pas modifié : le lot 09 interdit d'y toucher, et
 * ce n'était pas nécessaire — la correction est une question de droit d'accès.
 */
export default async function ReminderPage({
  searchParams,
}: {
  searchParams?: Promise<{ invoiceId?: string }>;
}) {
  const { user, schoolId, school } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const sp = searchParams ? await searchParams : null;
  const invoiceId = sp?.invoiceId;

  const now = new Date();
  const rawOverdueInvoices = await prisma.invoice.findMany({
    where: {
      schoolId,
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { lt: now },
    },
    include: {
      student: {
        include: {
          parent: true,
          enrollments: { include: { class: true } },
        },
      },
      payments: {
        select: { amount: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Ne retenir que les factures avec un vrai reliquat restant (> 0)
  const overdueInvoices = rawOverdueInvoices.filter((inv) => {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    return inv.totalAmount - paid > 0;
  });

  if (invoiceId && !overdueInvoices.some((i) => i.id === invoiceId)) {
    const specificInvoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: {
        student: {
          include: {
            parent: true,
            enrollments: { include: { class: true } },
          },
        },
        payments: {
          select: { amount: true },
        },
      },
    });
    if (specificInvoice) {
      overdueInvoices.unshift(specificInvoice);
    }
  }

  return <ReminderGenerator overdueInvoices={overdueInvoices} school={school} initialInvoiceId={invoiceId ?? null} />;
}
