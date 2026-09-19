import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  financeSnapshot, expensesForPeriod, lockingStatement, resolvePeriod,
  EXPENSE_CATEGORY_ORDER, EXPENSE_CATEGORIES, toDateInput,
} from "@/lib/finance";
import { PeriodPicker } from "../_finance/PeriodPicker";
import { ExpensesClient } from "./ExpensesClient";

const PATH = "/dashboard/payments/expenses";

/**
 * Saisie des dépenses de l'établissement.
 *
 * ⚠️ **Garde côté serveur, pas seulement masquage de lien.** `PARENT` possède
 * `/dashboard/payments` pour consulter les factures de ses enfants ; sans ce
 * contrôle il atteindrait cet écran par l'URL et verrait les sorties d'argent de
 * l'établissement. Le refus est déclaré dans `ROLE_DENIALS` et appliqué ici.
 *
 * Toutes les lectures passent par `src/lib/finance.ts`, dont aucune signature
 * n'accepte de `schoolId` : il vient de la session, jamais de l'URL.
 */
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; from?: string; to?: string; termId?: string }>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const ctx = { userId: user.id, schoolId, role: user.role };
  const params = await searchParams;

  const { period, notice, terms } = await resolvePeriod(ctx, params);
  const [snapshot, expenses, locked] = await Promise.all([
    financeSnapshot(ctx, period),
    expensesForPeriod(ctx, period),
    // Le verrou est évalué sur le début de la période : c'est l'état qui la
    // recouvre qui décide si la saisie est encore ouverte.
    lockingStatement(ctx, period.from),
  ]);

  const categories = EXPENSE_CATEGORY_ORDER.map((value) => ({
    value,
    label: EXPENSE_CATEGORIES[value].label,
    hint: EXPENSE_CATEGORIES[value].hint,
  }));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Paiements", href: "/dashboard/payments" },
          { label: "Dépenses" },
        ]}
        title="Dépenses"
        description="Enregistrez les sorties d'argent, puis transmettez-les à la direction pour validation."
        actions={
          <Link
            href={`/dashboard/payments/statement?${new URLSearchParams(
              Object.entries(params).filter(([, v]) => v) as [string, string][],
            ).toString()}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            État financier
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        }
      />

      <PeriodPicker
        activeKind={period.kind}
        activeLabel={period.label}
        terms={terms}
        termId={params.termId}
        from={toDateInput(period.from)}
        to={toDateInput(new Date(period.to.getTime() - 864e5))}
        notice={notice}
      />

      <ExpensesClient
        // Les dates traversent la frontière serveur → client en ISO : un `Date`
        // n'est pas sérialisable tel quel dans les props d'un composant client.
        expenses={expenses.map((e) => ({
          id: e.id,
          label: e.label,
          amount: e.amount,
          spentAt: e.spentAt.toISOString(),
          category: String(e.category),
          payee: e.payee,
          receiptRef: e.receiptRef,
          note: e.note,
          status: String(e.status),
          returnedReason: e.returnedReason,
        }))}
        categories={categories}
        role={user.role}
        periodLabel={period.label}
        locked={locked ? { periodLabel: locked.periodLabel } : null}
        totals={{
          approved: snapshot.expenseApproved,
          submitted: snapshot.expenseSubmitted,
          open: snapshot.expenseOpen,
        }}
      />
    </div>
  );
}
