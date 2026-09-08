import Link from "next/link";
import { Plus, Wallet, ClipboardCheck } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { invoiceOverview, formatAmount } from "@/lib/finance";
import PaymentsListClient from "./PaymentsListClient";
import { redirect } from "next/navigation";

export default async function PaymentsPage() {
  const { user, schoolId } = await requireSchoolContext();

  // ⚠️ GARDE SERVEUR : Empêche toute requête de base de données financière si le rôle n'a pas accès
  if (!hasAccess(user.role, "/dashboard/payments")) {
    redirect(firstAllowedPath(user.role));
  }

  const ctx = { userId: user.id, schoolId, role: user.role };

  // `hasAccess()` fait foi partout. `PARENT` possède `/dashboard/payments` mais
  // `ROLE_DENIALS` lui refuse l'atelier financier ET l'émission de factures.
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
            <Link
              href="/dashboard/payments/new"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Nouvelle facture
            </Link>
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
          <p className="mt-0.5 text-role-meta text-warning">
            {pendingCount} en attente
          </p>
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
            {overdueCount > 0 ? `${formatAmount(overdue)} FCFA échus` : "Aucun retard"}
          </p>
        </Card>
      </div>

      <PaymentsListClient invoices={invoices} canCollect={canIssue} expectedDetails={overview.expectedDetails} />
    </div>
  );
}
