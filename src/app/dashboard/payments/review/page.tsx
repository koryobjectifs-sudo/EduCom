import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { recentAudit } from "@/lib/audit";
import { recentTransitions } from "@/lib/workflowHistory";
import { pendingReview, expenseCategoryLabel } from "@/lib/finance";
import { HistoryTimeline } from "../_finance/HistoryTimeline";
import { ReviewClient } from "./ReviewClient";

const PATH = "/dashboard/payments/review";

/**
 * Bureau de la direction — examen des pièces financières transmises.
 *
 * ═══ QUI ARRIVE ICI, ET QUI N'Y ARRIVE PAS ═══
 *
 * `ROLE_DENIALS` refuse ce chemin à `ACCOUNTANT` **et** à `PARENT`, bien que tous
 * deux possèdent `/dashboard/payments`. Le comptable prépare et transmet ; il
 * n'approuve pas son propre travail. C'est le même principe qui empêche un
 * enseignant d'approuver ses propres bulletins, et il n'a coûté aucune règle
 * nouvelle : seulement deux lignes dans la matrice centrale.
 *
 * `OWNER` et `ADMIN` passent par `"*"`. Dans une petite école le directeur prépare
 * parfois lui-même l'état puis l'approuve : ce n'est pas bloqué, et c'est
 * volontaire — mais l'historique nomme alors la même personne aux deux étapes,
 * donc le fait reste visible.
 */
export default async function FinanceReviewPage() {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const ctx = { userId: user.id, schoolId, role: user.role };

  const [{ expenses, statements }, staff, expenseMoves, statementMoves] = await Promise.all([
    pendingReview(ctx),
    prisma.user.findMany({ where: { schoolId }, select: { id: true, firstName: true, lastName: true } }),
    recentTransitions(ctx, "expense", 15),
    recentTransitions(ctx, "financialStatement", 15),
  ]);

  const actors = new Map(staff.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const name = (id: string | null) => (id ? actors.get(id) ?? "Compte supprimé" : "—");

  // Activité récente, tous objets financiers confondus. `recentAudit` applique
  // toujours le `schoolId` de la session.
  const audit = (await recentAudit(ctx, 40)).filter(
    (r) => r.entity === "expense" || r.entity === "financialStatement",
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Paiements", href: "/dashboard/payments" },
          { label: "Examen" },
        ]}
        title="Examen financier"
        description="Approuvez ou renvoyez les dépenses et les états transmis par le gestionnaire."
      />

      <ReviewClient
        expenses={expenses.map((e) => ({
          id: e.id,
          label: e.label,
          amount: e.amount,
          spentAt: e.spentAt.toISOString(),
          categoryLabel: expenseCategoryLabel(e.category),
          payee: e.payee,
          receiptRef: e.receiptRef,
          note: e.note,
          submittedAt: e.submittedAt?.toISOString() ?? null,
          submittedByName: name(e.submittedById),
        }))}
        statements={statements.map((s) => ({
          id: s.id,
          periodLabel: s.periodLabel,
          collected: s.collectedTotal ?? 0,
          expense: s.expenseTotal ?? 0,
          receivable: s.receivableTotal ?? 0,
          balance: s.balance ?? 0,
          comment: s.comment,
          submittedAt: s.submittedAt?.toISOString() ?? null,
          submittedByName: name(s.submittedById),
        }))}
      />

      {/* ── Traçabilité : la question posée par la direction ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Derniers mouvements — états" description="Qui a fait quoi, quand.">
          <HistoryTimeline
            rows={statementMoves}
            actors={actors}
            domain="financialStatement"
            emptyHint="Aucun état n'a encore changé d'état."
          />
        </Card>
        <Card title="Derniers mouvements — dépenses" description="Qui a fait quoi, quand.">
          <HistoryTimeline
            rows={expenseMoves}
            actors={actors}
            domain="expense"
            emptyHint="Aucune dépense n'a encore changé d'état."
          />
        </Card>
      </div>

      {audit.length > 0 && (
        <Card
          title="Journal d'activité financière"
          description="Créations, modifications et décisions — y compris les tentatives refusées."
        >
          <ol className="space-y-0">
            {audit.map((r, i) => (
              <li
                key={r.id}
                className={`flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-4 ${i > 0 ? "border-t border-rule" : ""}`}
              >
                <time
                  dateTime={r.createdAt.toISOString()}
                  className="shrink-0 text-role-meta tabular-nums text-text-faint sm:w-40"
                >
                  {r.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  {" à "}
                  {r.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </time>
                <p className="min-w-0 flex-1 text-role-body text-text">
                  <span className="font-semibold">{name(r.userId)}</span>
                  <span className="text-text-faint"> — </span>
                  <span className="font-mono text-role-meta">{r.action}</span>
                  {/* L'issue n'est colorée que si elle n'est pas un succès : sinon
                      tout serait accentué et rien ne ressortirait. */}
                  {r.outcome && r.outcome !== "success" && (
                    <span className={r.outcome === "denied" ? " text-warning" : " text-danger"}>
                      {" "}
                      · {r.outcome === "denied" ? "refusé" : "échec"}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
