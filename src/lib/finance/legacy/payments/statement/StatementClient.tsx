"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Ban, FilePlus2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { availableTransitions, financialStatementWorkflow, type FinanceState } from "@/lib/workflow";
import { createStatement, saveStatementComment, submitStatement, cancelStatement } from "./actions";

/**
 * Bloc « état de la période » — création, mot d'accompagnement, soumission.
 *
 * Comme pour les dépenses, les actions proposées viennent de
 * `availableTransitions()` : l'écran ne réécrit aucune règle. Le serveur
 * revérifie tout depuis la session.
 */

export type StatementView = {
  id: string;
  status: string;
  periodLabel: string;
  comment: string | null;
  returnedReason: string | null;
  /** Instantané figé à la soumission. `null` tant que l'état est en préparation. */
  frozen: { collected: number; expense: number; receivable: number; balance: number } | null;
  submittedAt: string | null;
  approvedAt: string | null;
};

export function StatementClient({
  statement,
  role,
  periodLabel,
  periodParams,
  openExpenseCount,
}: {
  statement: StatementView | null;
  role: string;
  periodLabel: string;
  periodParams: Record<string, string>;
  openExpenseCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState(statement?.comment ?? "");
  const [savedNote, setSavedNote] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error: string } | { success: true; id?: string }>) {
    setBusy(true);
    setError(null);
    setSavedNote(null);
    const res = await fn();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    start(() => router.refresh());
  }

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  /* ── Aucun état ouvert pour cette période ── */
  if (!statement) {
    return (
      <Card title="État de la période">
        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-surface border border-danger/30 bg-danger/5 px-4 py-3 text-role-body text-danger">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <EmptyState
          icon={FilePlus2}
          title="Aucun état ouvert pour cette période"
          description={`Ouvrez l'état de « ${periodLabel} » pour arrêter ses chiffres et les transmettre à la direction.`}
          action={{ label: "Ouvrir l'état", onClick: () => run(() => createStatement(periodParams)) }}
        />
      </Card>
    );
  }

  const transitions = availableTransitions(financialStatementWorkflow, statement.status as FinanceState, role);
  const editable = statement.status === "DRAFT" || statement.status === "RETURNED";
  const canSubmit = transitions.some((t) => t.to === "SUBMITTED");
  const canCancel = transitions.some((t) => t.to === "CANCELLED");

  return (
    <Card
      title={`État de « ${statement.periodLabel} »`}
      actions={<StatusBadge domain="financialStatement" status={statement.status} />}
      description={
        statement.frozen
          ? `Chiffres arrêtés${statement.submittedAt ? ` le ${fmtDate(statement.submittedAt)}` : ""} — ils ne bougeront plus.`
          : "Chiffres calculés en direct. Ils seront figés au moment de la soumission."
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-surface border border-danger/30 bg-danger/5 px-4 py-3 text-role-body text-danger">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {statement.status === "RETURNED" && statement.returnedReason && (
          <div className="rounded-surface border border-warning/30 bg-warning/5 px-4 py-3">
            <p className="text-role-label font-semibold text-warning">La direction demande une correction</p>
            <p className="mt-1 text-role-body text-text">{statement.returnedReason}</p>
          </div>
        )}

        {/* Les chiffres figés sont affichés tels qu'approuvés, pas recalculés. */}
        {statement.frozen && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-surface border border-rule bg-sunk px-4 py-3 sm:grid-cols-4">
            {[
              ["Encaissé", statement.frozen.collected],
              ["Dépenses", statement.frozen.expense],
              ["À encaisser", statement.frozen.receivable],
              ["Solde", statement.frozen.balance],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">{label}</dt>
                <dd className="mt-0.5 text-role-card font-semibold tabular-nums text-text">
                  {fmt(Number(value))} <span className="text-role-meta font-medium text-text-faint">FCFA</span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {editable ? (
          <div className="space-y-3">
            <Textarea
              label="Mot pour la direction"
              rows={3}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              hint="Facultatif. Ce que les chiffres ne disent pas."
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || pending}
                onClick={async () => {
                  setBusy(true);
                  const res = await saveStatementComment(statement.id, comment);
                  setBusy(false);
                  if ("error" in res) setError(res.error);
                  else setSavedNote("Note enregistrée.");
                }}
              >
                Enregistrer la note
              </Button>
              {savedNote && (
                <span role="status" className="text-role-meta text-success">
                  {savedNote}
                </span>
              )}
            </div>
          </div>
        ) : (
          statement.comment && (
            <div className="rounded-surface border border-rule bg-sunk px-4 py-3">
              <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">
                Mot du gestionnaire
              </p>
              <p className="mt-1 text-role-body text-text">{statement.comment}</p>
            </div>
          )
        )}

        {/* La condition bloquante est annoncée avant le clic, pas après. */}
        {canSubmit && openExpenseCount > 0 && (
          <p className="rounded-control border border-warning/30 bg-warning/5 px-3 py-2 text-role-body text-warning">
            {openExpenseCount} dépense{openExpenseCount > 1 ? "s" : ""} encore en brouillon ou à
            corriger. Transmettez-les ou annulez-les avant de soumettre l'état.
          </p>
        )}

        {(canSubmit || canCancel) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-rule pt-4">
            {canCancel && (
              <Button
                variant="ghost"
                icon={<Ban aria-hidden="true" className="h-4 w-4" />}
                disabled={busy || pending}
                onClick={() => run(() => cancelStatement(statement.id))}
              >
                Abandonner l'état
              </Button>
            )}
            {canSubmit && (
              <Button
                icon={<Send aria-hidden="true" className="h-4 w-4" />}
                loading={busy || pending}
                onClick={() => run(() => submitStatement(statement.id))}
              >
                {statement.status === "RETURNED" ? "Soumettre de nouveau" : "Soumettre à la direction"}
              </Button>
            )}
          </div>
        )}

        {statement.status === "APPROVED" && statement.approvedAt && (
          <p className="text-role-body text-success">
            Approuvé par la direction le {fmtDate(statement.approvedAt)}.
          </p>
        )}
      </div>
    </Card>
  );
}
