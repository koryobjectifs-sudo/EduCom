import Link from "next/link";
import { Plus, Wallet, ClipboardCheck } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { invoiceOverview, formatAmount } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import PaymentsListClient from "./PaymentsListClient";
import ParentPaymentsView, { type ParentChildData, type ParentPaymentHistoryItem } from "./ParentPaymentsView";
import { redirect } from "next/navigation";

export default async function PaymentsPage() {
  const { user, schoolId, school } = await requireSchoolContext();

  // ⚠️ GARDE SERVEUR : Empêche toute requête de base de données financière si le rôle n'a pas accès
  if (!hasAccess(user.role, "/dashboard/payments")) {
    redirect(firstAllowedPath(user.role));
  }

  // ═══ ESPACE PARENT DÉDIÉ (Pas de vue d'administration filtrée) ═══
  if (user.role === "PARENT") {
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
        className: child.enrollments[0]?.class?.name || null,
        totalDue: childTotalDue,
        totalPaid: childTotalPaid,
        remainingBalance: childRemainingBalance,
        nextDueDate: childNextDueDate,
        nextDueAmount: childNextDueAmount,
        invoices,
      };
    });

    paymentHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return (
      <ParentPaymentsView
        schoolName={school?.name || "EduCom"}
        schoolLogo={school?.logo}
        childrenData={childrenData}
        paymentHistory={paymentHistory}
        totalRemainingBalance={totalRemainingBalance}
        earliestNextDueDate={earliestNextDueDate}
        earliestNextDueAmount={earliestNextDueAmount}
        totalPaidAllTime={totalPaidAllTime}
      />
    );
  }

  const ctx = { userId: user.id, schoolId, role: user.role };

  // `hasAccess()` fait foi partout.
  const canPrepare = hasAccess(user.role, "/dashboard/payments/statement");
  const canReview = hasAccess(user.role, "/dashboard/payments/review");
  const canIssue = hasAccess(user.role, "/dashboard/payments/new");

  const overview = await invoiceOverview(ctx);
  const { invoices, collected, collectedCount, outstanding, forecast, overdue, overdueCount, pendingCount } = overview;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Paiements" }]}
        title="Facturation & Paiements"
        description="Suivez les encaissements et gérez les frais de scolarité."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {canReview && (
              <Link
                href="/dashboard/payments/review"
                className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-text shadow-2xs transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Examiner
              </Link>
            )}
            {canPrepare && (
              <Link
                href="/dashboard/payments/statement"
                className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-text shadow-2xs transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
                État financier
              </Link>
            )}
            {canIssue && (
              <Link
                href="/dashboard/payments/new"
                className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                Nouvelle facture
              </Link>
            )}
          </div>
        }
      />

      {overview.restrictedToParent && (
        <p role="status" className="rounded-surface border border-rule bg-sunk px-3 py-2 text-role-meta text-text-soft">
          Vous consultez uniquement les factures de votre famille.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
            Prévisionnel
          </p>
          <p className="mt-1 text-role-page font-semibold tabular-nums text-text">
            {formatAmount(forecast)}
            <span className="ml-1 text-role-meta font-medium text-text-faint">FCFA</span>
          </p>
          <p className="mt-0.5 text-role-meta text-text-soft">
            Total des scolarités
          </p>
        </Card>

        <Card>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
            Total encaissé
          </p>
          <p className="mt-1 text-role-page font-semibold tabular-nums text-text">
            {formatAmount(collected)}
            <span className="ml-1 text-role-meta font-medium text-text-faint">FCFA</span>
          </p>
          <p className="mt-0.5 text-role-meta text-success">
            {collectedCount} versement{collectedCount > 1 ? "s" : ""}
          </p>
        </Card>

        <Card>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
            Reste à encaisser
          </p>
          <p className="mt-1 text-role-page font-semibold tabular-nums text-text">
            {formatAmount(outstanding)}
            <span className="ml-1 text-role-meta font-medium text-text-faint">FCFA</span>
          </p>
          <div className="mt-1 space-y-0.5 text-[10.5px]">
            <p className="text-text-soft">
              Impayé total : <strong className="text-text">{formatAmount(overview.unpaidTotal)} FCFA</strong>
            </p>
            {overview.partialRemaining > 0 && (
              <p className="text-amber-700 font-medium">
                Reliquat partiel : <strong>{formatAmount(overview.partialRemaining)} FCFA</strong> ({overview.partialCount} facture{overview.partialCount > 1 ? "s" : ""})
              </p>
            )}
          </div>
        </Card>

        {/* Seule carte à porter un liseré, et seulement s'il y a matière à agir. */}
        <Card className={overdueCount > 0 ? "border-t-2 border-t-danger" : undefined}>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
            À relancer
          </p>
          <p className="mt-1 text-role-page font-semibold tabular-nums text-text">
            {overdueCount}
            <span className="ml-1 text-role-meta font-medium text-text-faint">
              facture{overdueCount > 1 ? "s" : ""}
            </span>
          </p>
          <p className={`mt-0.5 text-role-meta ${overdueCount > 0 ? "text-danger" : "text-text-faint"}`}>
            {overdueCount > 0 ? `${formatAmount(overdue)} FCFA de reliquats échus` : "Aucun retard"}
          </p>
        </Card>
      </div>

      <PaymentsListClient invoices={invoices} canCollect={canIssue} expectedDetails={overview.expectedDetails} />
    </div>
  );
}
