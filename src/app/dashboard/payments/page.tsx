import Link from "next/link";
import { Plus, Wallet, ClipboardCheck } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { invoiceOverview, formatAmount } from "@/lib/finance";
import PaymentsListClient from "./PaymentsListClient";

/**
 * Facturation et paiements.
 *
 * ═══ CE QUE LE LOT 11.1 CORRIGE ICI ═══
 *
 * 1. **Fuite de confidentialité.** La page listait `where: { schoolId }` sans
 *    plus, et `PARENT` a accès à cette route : chaque parent voyait les factures
 *    de toutes les familles. `invoiceOverview()` applique désormais
 *    `invoiceScope()`, qui restreint un parent à ses propres factures — par les
 *    DEUX relations du schéma (`Invoice.parentId` et `Invoice.studentId →
 *    Student.parentId`), car 0 facture sur 6 utilise la première.
 *
 * 2. **Les agrégats fuyaient aussi.** Même avec une liste filtrée, les cartes
 *    auraient continué d'afficher la trésorerie de l'établissement à chaque
 *    parent. Elles portent maintenant sur les seules factures visibles.
 *
 * 3. **« Total encaissé » était faux.** Il additionnait `Invoice.totalAmount` des
 *    factures PAID — soit 196 866 FCFA, quand 306 866 avaient réellement été
 *    encaissés. Cause exacte : deux factures portent `totalAmount = 0` alors
 *    qu'elles ont reçu 70 000 et 40 000 FCFA, soit précisément l'écart. Le
 *    chiffre vient désormais de `collectedByMethod()`, **la même et unique
 *    définition** que celle utilisée par l'état financier.
 */
export default async function PaymentsPage() {
  const { user, schoolId } = await requireSchoolContext();
  const ctx = { userId: user.id, schoolId, role: user.role };

  // `hasAccess()` fait foi partout. `PARENT` possède `/dashboard/payments` mais
  // `ROLE_DENIALS` lui refuse l'atelier financier ET l'émission de factures.
  const canPrepare = hasAccess(user.role, "/dashboard/payments/statement");
  const canReview = hasAccess(user.role, "/dashboard/payments/review");
  const canIssue = hasAccess(user.role, "/dashboard/payments/new");

  const overview = await invoiceOverview(ctx);
  const { invoices, collected, collectedCount, outstanding, overdue, overdueCount, pendingCount } = overview;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Paiements" }]}
        title="Facturation & Paiements"
        description="Suivez les encaissements et gérez les frais de scolarité."
        actions={
          <div className="flex flex-wrap gap-2">
            {canReview && (
              <Link
                href="/dashboard/payments/review"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
                Examiner
              </Link>
            )}
            {canPrepare && (
              <Link
                href="/dashboard/payments/statement"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <Wallet aria-hidden="true" className="h-4 w-4" />
                État financier
              </Link>
            )}
            <Link
              href="/dashboard/payments/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nouvelle facture
            </Link>
          </div>
        }
      />

      {/* Indicateurs.
          Les teintes arbitraires d'origine (#dcfce3, #fef3c7, cercles agrandis
          au survol) laissent place aux tokens d'état : le vert dit « encaissé »,
          l'ambre « en attente », le rouge « demande une relance ». Même
          sémantique que les pastilles du lot 03, donc un seul vocabulaire de
          couleur dans tout le produit. */}
      {/* Un parent doit savoir que la vue est la sienne, pas celle de l'école :
          sans cette mention, « Total encaissé » se lirait comme le total de
          l'établissement. */}
      {overview.restrictedToParent && (
        <p role="status" className="rounded-surface border border-rule bg-sunk px-4 py-3 text-role-body text-text-soft">
          Vous consultez uniquement les factures de votre famille.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">
            Total encaissé
          </p>
          <p className="mt-2 text-role-page font-semibold tabular-nums text-text">
            {formatAmount(collected)}
            <span className="ml-1.5 text-role-body font-medium text-text-faint">FCFA</span>
          </p>
          {/* Le compte porte sur les VERSEMENTS, pas sur les factures : c'est ce
              que mesure le montant au-dessus. Compter des factures réglées à
              côté d'une somme de paiements laissait croire à un lien qui
              n'existe pas — deux factures à 0 FCFA ont reçu 110 000. */}
          <p className="mt-1 text-role-meta text-success">
            {collectedCount} versement{collectedCount > 1 ? "s" : ""} enregistré{collectedCount > 1 ? "s" : ""}
          </p>
        </Card>

        <Card>
          <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">
            Reste à encaisser
          </p>
          <p className="mt-2 text-role-page font-semibold tabular-nums text-text">
            {formatAmount(outstanding)}
            <span className="ml-1.5 text-role-body font-medium text-text-faint">FCFA</span>
          </p>
          <p className="mt-1 text-role-meta text-warning">
            {pendingCount} en attente · {overdueCount} en retard
          </p>
        </Card>

        {/* Seule carte à porter un liseré, et seulement s'il y a matière à agir. */}
        <Card className={overdueCount > 0 ? "border-t-2 border-t-danger" : undefined}>
          <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">
            À relancer
          </p>
          <p className="mt-2 text-role-page font-semibold tabular-nums text-text">
            {overdueCount}
            <span className="ml-1.5 text-role-body font-medium text-text-faint">
              facture{overdueCount > 1 ? "s" : ""}
            </span>
          </p>
          <p className={`mt-1 text-role-meta ${overdueCount > 0 ? "text-danger" : "text-text-faint"}`}>
            {overdueCount > 0 ? `${formatAmount(overdue)} FCFA échus` : "Aucun retard"}
          </p>
        </Card>
      </div>

      <PaymentsListClient invoices={invoices} canCollect={canIssue} />
    </div>
  );
}
