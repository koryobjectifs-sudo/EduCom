import { redirect } from "next/navigation";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { transitionHistory } from "@/lib/workflowHistory";
import {
  financeSnapshot, resolvePeriod, overlappingStatement, formatAmount, toDateInput,
} from "@/lib/finance";
import { PeriodPicker } from "../_finance/PeriodPicker";
import { HistoryTimeline } from "../_finance/HistoryTimeline";
import { StatementClient } from "./StatementClient";

const PATH = "/dashboard/payments/statement";

/**
 * Atelier financier du gestionnaire.
 *
 * ═══ HIÉRARCHIE DE LECTURE ═══
 *
 * Période → quatre chiffres → répartitions → état de la période → historique.
 * Un gestionnaire doit répondre à « que s'est-il passé financièrement ? » en
 * quelques secondes, avant tout détail.
 *
 * ═══ CHAQUE CHIFFRE DIT D'OÙ IL VIENT ═══
 *
 * « Encaissé » est la somme des `Payment` de la période — pas le montant des
 * factures marquées payées, qui divergeait de 110 000 FCFA au moment du lot.
 * « Dépenses » ne compte que l'approuvé. Le solde n'est que la différence des
 * deux : aucune projection, aucune estimation présentée comme un chiffre acquis.
 *
 * ⚠️ Garde serveur : `PARENT` a `/dashboard/payments` et atteindrait cet écran par
 * l'URL sans ce contrôle.
 */
export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; from?: string; to?: string; termId?: string }>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const ctx = { userId: user.id, schoolId, role: user.role };
  const params = await searchParams;

  const { period, notice, terms } = await resolvePeriod(ctx, params);
  const [snapshot, statement] = await Promise.all([
    financeSnapshot(ctx, period),
    overlappingStatement(ctx, period),
  ]);

  // Historique et noms d'acteurs, tous deux bornés à l'établissement.
  const history = statement
    ? await transitionHistory(ctx, "financialStatement", statement.id)
    : [];
  const staff = await prisma.user.findMany({
    where: { schoolId },
    select: { id: true, firstName: true, lastName: true },
  });
  const actors = new Map(staff.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Paiements", href: "/dashboard/payments" },
          { label: "État financier" },
        ]}
        title="État financier"
        description="Préparez l'état de la période, puis transmettez-le à la direction."
        actions={
          <Link
            href={`/dashboard/payments/expenses${query ? `?${query}` : ""}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <Receipt aria-hidden="true" className="h-4 w-4" />
            Saisir une dépense
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

      {/* ── Les quatre chiffres de la période ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Encaissé"
          amount={snapshot.collected}
          detail={
            snapshot.collectedCount > 0
              ? `${snapshot.collectedCount} versement${snapshot.collectedCount > 1 ? "s" : ""} enregistré${snapshot.collectedCount > 1 ? "s" : ""}`
              : "Aucun versement sur la période"
          }
          tone="success"
        />
        <Figure
          label="Dépenses approuvées"
          amount={snapshot.expenseApproved}
          detail={
            snapshot.expenseSubmitted > 0
              ? `${formatAmount(snapshot.expenseSubmitted)} FCFA en attente de validation`
              : `${snapshot.expenseApprovedCount} dépense${snapshot.expenseApprovedCount > 1 ? "s" : ""} validée${snapshot.expenseApprovedCount > 1 ? "s" : ""}`
          }
        />
        <Figure
          label="Reste à encaisser"
          amount={snapshot.receivable}
          detail={
            snapshot.overdue > 0
              ? `${formatAmount(snapshot.overdue)} FCFA échus, toutes périodes`
              : "Échéances de la période"
          }
          tone={snapshot.overdue > 0 ? "warning" : undefined}
        />
        <Figure
          label="Solde de période"
          amount={snapshot.balance}
          detail="Encaissé moins dépenses approuvées"
          tone={snapshot.balance < 0 ? "danger" : undefined}
          emphasis
        />
      </div>

      {/* ── Répartitions : uniquement si elles existent réellement ── */}
      {(snapshot.byMethod.length > 0 || snapshot.byCategory.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {snapshot.byMethod.length > 0 && (
            <Card title="Recettes par mode de paiement" description="Versements réellement enregistrés.">
              <Breakdown
                rows={snapshot.byMethod.map((m) => ({ key: m.method, label: m.label, amount: m.amount, count: m.count }))}
                total={snapshot.collected}
              />
            </Card>
          )}
          {snapshot.byCategory.length > 0 && (
            <Card title="Dépenses par poste" description="Dépenses approuvées uniquement.">
              <Breakdown
                rows={snapshot.byCategory.map((c) => ({ key: c.category, label: c.label, amount: c.amount, count: c.count }))}
                total={snapshot.expenseApproved}
              />
            </Card>
          )}
        </div>
      )}

      {/* ── L'état lui-même ── */}
      <StatementClient
        statement={
          statement
            ? {
                id: statement.id,
                status: String(statement.status),
                periodLabel: statement.periodLabel,
                comment: statement.comment,
                returnedReason: statement.returnedReason,
                frozen:
                  statement.collectedTotal !== null
                    ? {
                        collected: statement.collectedTotal,
                        expense: statement.expenseTotal ?? 0,
                        receivable: statement.receivableTotal ?? 0,
                        balance: statement.balance ?? 0,
                      }
                    : null,
                submittedAt: statement.submittedAt?.toISOString() ?? null,
                approvedAt: statement.approvedAt?.toISOString() ?? null,
              }
            : null
        }
        role={user.role}
        periodLabel={period.label}
        periodParams={params as Record<string, string>}
        openExpenseCount={snapshot.expenseOpenCount}
      />

      {/* ── Historique ── */}
      {statement && (
        <Card title="Historique" description="Qui a fait quoi, quand, et avec quel motif.">
          <HistoryTimeline
            rows={history}
            actors={actors}
            domain="financialStatement"
            emptyHint="L'état vient d'être ouvert : sa première transition sera la soumission."
          />
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────── éléments de présentation ─────────────────────── */

/**
 * Un chiffre de la période.
 *
 * `tone` ne porte jamais l'information seule : le libellé et le détail la
 * donnent en texte. La couleur ne fait que la renforcer — règle du lot 03.
 */
function Figure({
  label,
  amount,
  detail,
  tone,
  emphasis = false,
}: {
  label: string;
  amount: number;
  detail: string;
  tone?: "success" | "warning" | "danger";
  emphasis?: boolean;
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-text-faint";

  return (
    <Card className={emphasis ? "border-t-2 border-t-primary" : undefined}>
      <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">{label}</p>
      <p className="mt-2 text-role-page font-semibold tabular-nums text-text">
        {formatAmount(amount)}
        <span className="ml-1.5 text-role-body font-medium text-text-faint">FCFA</span>
      </p>
      <p className={`mt-1 text-role-meta ${toneClass}`}>{detail}</p>
    </Card>
  );
}

/** Répartition en parts. La barre est décorative : le montant est écrit. */
function Breakdown({
  rows,
  total,
}: {
  rows: { key: string; label: string; amount: number; count: number }[];
  total: number;
}) {
  return (
    <dl className="space-y-3">
      {rows.map((r) => {
        const share = total > 0 ? Math.round((r.amount / total) * 100) : 0;
        return (
          <div key={r.key}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-role-body text-text">
                {r.label}
                <span className="ml-1.5 text-role-meta text-text-faint">
                  ({r.count} ligne{r.count > 1 ? "s" : ""})
                </span>
              </dt>
              <dd className="shrink-0 text-role-body font-semibold tabular-nums text-text">
                {formatAmount(r.amount)}
                <span className="ml-1 text-role-meta font-medium text-text-faint">FCFA · {share} %</span>
              </dd>
            </div>
            <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-sunk">
              <div className="h-full rounded-pill bg-accent" style={{ width: `${share}%` }} />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
