import { requireFamilyContext } from "@/lib/familyContext";
import { prisma } from "@/lib/prisma";
import ParentPaymentsView, {
  type ParentChildData,
  type ParentPaymentHistoryItem,
} from "@/app/dashboard/payments/ParentPaymentsView";

export const metadata = {
  title: "Paiements & Échéances | Espace Famille EduCom",
  description: "Consultez les frais de scolarité, factures et historiques de paiement de vos enfants",
};

export default async function FamilyPaymentsPage() {
  const { user, schoolId, school } = await requireFamilyContext();

  const children = await prisma.student.findMany({
    where: {
      schoolId,
      parentId: user.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: {
        select: {
          class: { select: { name: true } },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        where: { schoolId },
        select: {
          id: true,
          title: true,
          totalAmount: true,
          dueDate: true,
          status: true,
          items: {
            select: { title: true, amount: true, quantity: true },
          },
          payments: {
            select: { id: true, amount: true, method: true, reference: true, createdAt: true },
          },
        },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  let totalRemainingBalance = 0;
  let earliestNextDueDate: Date | null = null;
  let earliestNextDueAmount = 0;
  let totalPaidAllTime = 0;
  const paymentHistory: ParentPaymentHistoryItem[] = [];

  const childrenData: ParentChildData[] = children.map((child) => {
    let childTotalDue = 0;
    let childTotalPaid = 0;
    let childNextDueDate: Date | null = null;
    let childNextDueAmount = 0;

    const invoices = child.invoices.map((inv) => {
      const paidAmount = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = Math.max(0, inv.totalAmount - paidAmount);
      childTotalDue += inv.totalAmount;
      childTotalPaid += paidAmount;
      totalPaidAllTime += paidAmount;

      for (const p of inv.payments) {
        paymentHistory.push({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          createdAt: p.createdAt,
          invoiceId: inv.id,
          invoiceTitle: inv.title || "Frais de scolarité",
          studentName: `${child.firstName} ${child.lastName}`,
        });
      }

      if (remainingAmount > 0) {
        if (!childNextDueDate || inv.dueDate < childNextDueDate) {
          childNextDueDate = inv.dueDate;
          childNextDueAmount = remainingAmount;
        }
        if (!earliestNextDueDate || inv.dueDate < earliestNextDueDate) {
          earliestNextDueDate = inv.dueDate;
          earliestNextDueAmount = remainingAmount;
        }
      }

      return {
        id: inv.id,
        title: inv.title || "Frais de scolarité",
        totalAmount: inv.totalAmount,
        paidAmount,
        remainingAmount,
        dueDate: inv.dueDate,
        status: inv.status as never,
        items: inv.items,
      };
    });

    const childRemainingBalance = Math.max(0, childTotalDue - childTotalPaid);
    totalRemainingBalance += childRemainingBalance;

    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      className: child.enrollments[0]?.class?.name || "Non assigné",
      totalDue: childTotalDue,
      totalPaid: childTotalPaid,
      remainingBalance: childRemainingBalance,
      nextDueDate: childNextDueDate,
      nextDueAmount: childNextDueAmount,
      invoices,
    };
  });

  // Tri de l'historique par date la plus récente
  paymentHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <ParentPaymentsView
      childrenData={childrenData}
      totalRemainingBalance={totalRemainingBalance}
      earliestNextDueDate={earliestNextDueDate}
      earliestNextDueAmount={earliestNextDueAmount}
      totalPaidAllTime={totalPaidAllTime}
      paymentHistory={paymentHistory}
      schoolName={school.name}
    />
  );
}
