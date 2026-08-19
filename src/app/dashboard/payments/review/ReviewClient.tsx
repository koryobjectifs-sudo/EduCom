"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2, TriangleAlert, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DataTable, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
} from "@/components/ui/DataTable";
import { approveExpense, returnExpense } from "../expenses/actions";
import { approveStatement, returnStatement } from "../statement/actions";

/**
 * Bureau de la direction — approuver ou renvoyer.
 *
 * ═══ LE MOTIF DE RENVOI EST OBLIGATOIRE, ET LE FORMULAIRE LE REFLÈTE ═══
 *
 * La contrainte est portée par la machine (`commentRequired` sur la transition
 * vers `RETURNED`) et vérifiée côté serveur par `runTransition()`. La modale
 * désactive simplement le bouton tant que le champ est vide : elle rend la règle
 * visible, elle ne la remplace pas. Un client qui contourne l'écran reçoit le
 * même refus.
 */

type PendingExpense = {
  id: string;
  label: string;
  amount: number;
  spentAt: string;
  categoryLabel: string;
  payee: string | null;
  receiptRef: string | null;
  note: string | null;
  submittedAt: string | null;
  submittedByName: string;
};

type PendingStatement = {
  id: string;
  periodLabel: string;
  collected: number;
  expense: number;
  receivable: number;
  balance: number;
  comment: string | null;
  submittedAt: string | null;
  submittedByName: string;
};

type Target = { kind: "expense" | "statement"; id: string; name: string };

export function ReviewClient({
  expenses,
  statements,
}: {
  expenses: PendingExpense[];
  statements: PendingStatement[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [returning, setReturning] = useState<Target | null>(null);
  const [reason, setReason] = useState("");

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  async function run(id: string, fn: () => Promise<{ error: string } | { success: true }>) {
    setBusyId(id);
    setError(null);
    const res = await fn();
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    start(() => router.refresh());
  }

  async function confirmReturn() {
    if (!returning) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    setBusyId(returning.id);
    setError(null);
    const res =
      returning.kind === "expense"
        ? await returnExpense(returning.id, trimmed)
        : await returnStatement(returning.id, trimmed);
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setReturning(null);
    setReason("");
    start(() => router.refresh());
  }

  const nothing = expenses.length === 0 && statements.length === 0;

  return (
    <>
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-surface border border-danger/30 bg-danger/5 px-4 py-3 text-role-body text-danger">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {nothing && (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Rien à examiner"
            description="Aucune dépense ni aucun état financier n'attend de décision. Le gestionnaire vous prévient en transmettant."
          />
        </Card>
      )}

      {/* ── États financiers d'abord : ils portent la décision d'ensemble ── */}
      {statements.length > 0 && (
        <Card
          title="États financiers à examiner"
          description={`${statements.length} état${statements.length > 1 ? "s" : ""} transmis${statements.length > 1 ? "" : ""} par le gestionnaire.`}
        >
          <div className="space-y-4">
            {statements.map((s) => (
              <div key={s.id} className="rounded-surface border border-rule p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-role-card font-semibold text-text">{s.periodLabel}</p>
                    <p className="text-role-meta text-text-faint">
                      Transmis par {s.submittedByName} le {fmtDate(s.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge domain="financialStatement" status="SUBMITTED" />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 rounded-control bg-sunk px-4 py-3 sm:grid-cols-4">
                  {[
                    ["Encaissé", s.collected],
                    ["Dépenses", s.expense],
                    ["À encaisser", s.receivable],
                    ["Solde", s.balance],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">{label}</dt>
                      <dd className="mt-0.5 text-role-card font-semibold tabular-nums text-text">
                        {fmt(Number(value))}
                      </dd>
                    </div>
                  ))}
                </dl>

                {s.comment && (
                  <p className="mt-3 text-role-body italic text-text-soft">« {s.comment} »</p>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="secondary"
                    icon={<Undo2 aria-hidden="true" className="h-4 w-4" />}
                    disabled={busyId === s.id}
                    onClick={() => {
                      setReason("");
                      setReturning({ kind: "statement", id: s.id, name: `l'état « ${s.periodLabel} »` });
                    }}
                  >
                    Renvoyer
                  </Button>
                  <Button
                    icon={<Check aria-hidden="true" className="h-4 w-4" />}
                    loading={busyId === s.id || pending}
                    onClick={() => run(s.id, () => approveStatement(s.id))}
                  >
                    Approuver l'état
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Dépenses ── */}
      {expenses.length > 0 && (
        <Card
          title="Dépenses à examiner"
          description={`${expenses.length} dépense${expenses.length > 1 ? "s" : ""} en attente de votre décision.`}
          flush
        >
          <DataTable caption="Dépenses transmises en attente de décision">
            <TableHead>
              <TableRow>
                <TableHeadCell>Date</TableHeadCell>
                <TableHeadCell>Libellé</TableHeadCell>
                <TableHeadCell>Poste</TableHeadCell>
                <TableHeadCell>Transmise par</TableHeadCell>
                <TableHeadCell numeric>Montant</TableHeadCell>
                <TableHeadCell>
                  <span className="sr-only">Décision</span>
                </TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap tabular-nums text-text-soft">
                    {fmtDate(e.spentAt)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-text">{e.label}</p>
                    {e.payee && <p className="text-role-meta text-text-faint">Bénéficiaire : {e.payee}</p>}
                    {e.receiptRef ? (
                      <p className="text-role-meta text-text-faint">Pièce : {e.receiptRef}</p>
                    ) : (
                      <p className="text-role-meta text-warning">Aucune référence de justificatif</p>
                    )}
                    {e.note && <p className="mt-0.5 text-role-meta italic text-text-soft">{e.note}</p>}
                  </TableCell>
                  <TableCell className="text-text-soft">{e.categoryLabel}</TableCell>
                  <TableCell className="text-text-soft">
                    {e.submittedByName}
                    <span className="block text-role-meta text-text-faint">{fmtDate(e.submittedAt)}</span>
                  </TableCell>
                  <TableCell numeric className="font-semibold tabular-nums text-text">
                    {fmt(e.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Undo2 aria-hidden="true" className="h-4 w-4" />}
                        disabled={busyId === e.id}
                        onClick={() => {
                          setReason("");
                          setReturning({ kind: "expense", id: e.id, name: `« ${e.label} »` });
                        }}
                      >
                        Renvoyer
                      </Button>
                      <Button
                        size="sm"
                        icon={<Check aria-hidden="true" className="h-4 w-4" />}
                        loading={busyId === e.id || pending}
                        onClick={() => run(e.id, () => approveExpense(e.id))}
                      >
                        Approuver
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      )}

      <Modal
        open={returning !== null}
        onClose={() => setReturning(null)}
        title="Renvoyer pour correction"
        description={returning ? `Le gestionnaire recevra votre motif avec ${returning.name}.` : undefined}
      >
        <div className="space-y-4">
          <Textarea
            label="Motif du renvoi"
            required
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            hint="Obligatoire : un refus sans explication force un aller-retour de plus."
            error={reason.length > 0 && reason.trim().length === 0 ? "Le motif ne peut pas être vide." : undefined}
          />
          {error && (
            <p role="alert" className="text-role-body text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-rule pt-4">
            <Button variant="secondary" onClick={() => setReturning(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length === 0}
              loading={busyId !== null && busyId === returning?.id}
              onClick={confirmReturn}
            >
              Renvoyer
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
