"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Send, Ban, Receipt, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DataTable, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableFooter,
} from "@/components/ui/DataTable";
import { availableTransitions, expenseWorkflow, type FinanceState } from "@/lib/workflow";
import { createExpense, updateExpense, submitExpense, cancelExpense } from "./actions";

/**
 * Saisie et suivi des dépenses de la période.
 *
 * ═══ LES BOUTONS VIENNENT DE LA MACHINE, PAS D'UNE CASCADE DE `if` ═══
 *
 * `availableTransitions()` décide de ce qui est proposé, à partir de l'état réel
 * de la ligne et du rôle. Aucune règle de permission n'est réécrite ici : c'est
 * la même fonction que le serveur consulte, donc l'écran ne peut pas proposer une
 * action que l'action refusera — ni cacher une action permise.
 *
 * ⚠️ Ce filtrage est un confort d'affichage, **pas une sécurité**. Le rôle arrive
 * en prop et un client peut mentir : chaque server action revérifie tout depuis la
 * session. C'est la règle du lot 01.
 */

type Expense = {
  id: string;
  label: string;
  amount: number;
  spentAt: string;
  category: string;
  payee: string | null;
  receiptRef: string | null;
  note: string | null;
  status: string;
  returnedReason: string | null;
};

type Category = { value: string; label: string; hint: string };

export function ExpensesClient({
  expenses,
  categories,
  role,
  periodLabel,
  locked,
  totals,
}: {
  expenses: Expense[];
  categories: Category[];
  role: string;
  periodLabel: string;
  locked: { periodLabel: string } | null;
  totals: { approved: number; submitted: number; open: number };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setError(null);
    setFormOpen(true);
  }

  async function onSubmitForm(formData: FormData) {
    setError(null);
    const res = editing ? await updateExpense(editing.id, formData) : await createExpense(formData);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setFormOpen(false);
    setEditing(null);
    start(() => router.refresh());
  }

  async function run(id: string, fn: (id: string) => Promise<{ error: string } | { success: true }>) {
    setBusyId(id);
    setError(null);
    const res = await fn(id);
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    start(() => router.refresh());
  }

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-surface border border-danger/30 bg-danger/5 px-4 py-3 text-role-body text-danger"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* La période verrouillée est annoncée avant toute tentative de saisie. */}
      {locked && (
        <div
          role="status"
          className="rounded-surface border border-rule bg-sunk px-4 py-3 text-role-body text-text-soft"
        >
          La période <span className="font-semibold text-text">{locked.periodLabel}</span> a été
          transmise à la direction : ses dépenses ne sont plus modifiables.
        </div>
      )}

      <Card
        title={`Dépenses — ${periodLabel}`}
        description={
          expenses.length > 0
            ? `${expenses.length} dépense${expenses.length > 1 ? "s" : ""} sur la période`
            : undefined
        }
        actions={
          !locked && (
            <Button icon={<Plus aria-hidden="true" className="h-4 w-4" />} onClick={openCreate}>
              Nouvelle dépense
            </Button>
          )
        }
        flush={expenses.length > 0}
      >
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune dépense sur cette période"
            description={
              locked
                ? "Cette période est clôturée. Choisissez-en une autre pour saisir des dépenses."
                : "Enregistrez une sortie d'argent pour la faire entrer dans l'état financier."
            }
            action={locked ? undefined : { label: "Nouvelle dépense", onClick: openCreate }}
          />
        ) : (
          <DataTable caption={`Dépenses de la période ${periodLabel}`}>
            <TableHead>
              <TableRow>
                <TableHeadCell>Date</TableHeadCell>
                <TableHeadCell>Libellé</TableHeadCell>
                <TableHeadCell>Poste</TableHeadCell>
                <TableHeadCell>Bénéficiaire</TableHeadCell>
                <TableHeadCell numeric>Montant</TableHeadCell>
                <TableHeadCell>État</TableHeadCell>
                <TableHeadCell>
                  <span className="sr-only">Actions</span>
                </TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => {
                const transitions = availableTransitions(expenseWorkflow, e.status as FinanceState, role);
                const canEdit = e.status === "DRAFT" || e.status === "RETURNED";
                const busy = busyId === e.id;

                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-text-soft">
                      {fmtDate(e.spentAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-text">{e.label}</p>
                      {e.receiptRef && (
                        <p className="text-role-meta text-text-faint">Pièce : {e.receiptRef}</p>
                      )}
                      {e.status === "RETURNED" && e.returnedReason && (
                        <p className="mt-1 text-role-meta text-warning">
                          Motif du renvoi : {e.returnedReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-text-soft">
                      {categories.find((c) => c.value === e.category)?.label ?? e.category}
                    </TableCell>
                    <TableCell className="text-text-soft">{e.payee ?? "—"}</TableCell>
                    <TableCell numeric className="font-semibold tabular-nums text-text">
                      {fmt(e.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge domain="expense" status={e.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {canEdit && !locked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Modifier « ${e.label} »`}
                            icon={<Pencil aria-hidden="true" className="h-4 w-4" />}
                            disabled={busy}
                            onClick={() => openEdit(e)}
                          />
                        )}
                        {transitions.some((t) => t.to === "SUBMITTED") && !locked && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Send aria-hidden="true" className="h-4 w-4" />}
                            loading={busy}
                            onClick={() => run(e.id, submitExpense)}
                          >
                            Transmettre
                          </Button>
                        )}
                        {transitions.some((t) => t.to === "CANCELLED") && !locked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Annuler « ${e.label} »`}
                            icon={<Ban aria-hidden="true" className="h-4 w-4" />}
                            disabled={busy}
                            onClick={() => run(e.id, cancelExpense)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-semibold text-text">
                  Approuvé sur la période
                </TableCell>
                <TableCell numeric className="font-semibold tabular-nums text-text">
                  {fmt(totals.approved)}
                </TableCell>
                <TableCell colSpan={2} className="text-role-meta text-text-faint">
                  {totals.submitted > 0 && <>en attente : {fmt(totals.submitted)} · </>}
                  {totals.open > 0 && <>non transmis : {fmt(totals.open)}</>}
                </TableCell>
              </TableRow>
            </TableFooter>
          </DataTable>
        )}
      </Card>

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        expense={editing}
        categories={categories}
        error={error}
        onSubmit={onSubmitForm}
        pending={pending}
      />
    </>
  );
}

/* ─────────────────────────────── formulaire ─────────────────────────────── */

function ExpenseForm({
  open,
  onClose,
  expense,
  categories,
  error,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
  categories: Category[];
  error: string | null;
  onSubmit: (form: FormData) => Promise<void>;
  pending: boolean;
}) {
  const [saving, setSaving] = useState(false);

  async function handle(formData: FormData) {
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
  }

  const dateValue = expense ? expense.spentAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? "Modifier la dépense" : "Nouvelle dépense"}
      description={
        expense
          ? "La dépense reste modifiable tant qu'elle n'a pas été transmise."
          : "Elle démarre en brouillon : rien n'est transmis avant votre validation."
      }
      size="lg"
    >
      {/* `key` force la réinitialisation des champs entre deux ouvertures : sans
          elle, React réutilise l'instance et le formulaire garde la dépense
          précédente. */}
      <form key={expense?.id ?? "new"} action={handle} className="space-y-4">
        <Input
          name="label"
          label="Libellé"
          required
          maxLength={200}
          defaultValue={expense?.label ?? ""}
          placeholder="Facture SENELEC — août"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            name="amount"
            label="Montant (FCFA)"
            required
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={expense ? String(Math.round(expense.amount)) : ""}
          />
          <Input
            name="spentAt"
            label="Date de la dépense"
            required
            type="date"
            defaultValue={dateValue}
            hint="La date réelle de la sortie d'argent, pas celle de la saisie."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select name="category" label="Poste" required defaultValue={expense?.category ?? "OTHER"}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} — {c.hint}
              </option>
            ))}
          </Select>
          <Input
            name="payee"
            label="Bénéficiaire"
            maxLength={300}
            defaultValue={expense?.payee ?? ""}
            placeholder="SENELEC"
            hint="Facultatif."
          />
        </div>

        <Input
          name="receiptRef"
          label="Référence du justificatif"
          maxLength={300}
          defaultValue={expense?.receiptRef ?? ""}
          placeholder="Reçu n° 2026-0142"
          hint="Où retrouver la pièce papier. L'application ne stocke pas encore les fichiers."
        />

        <Textarea
          name="note"
          label="Note"
          rows={2}
          maxLength={300}
          defaultValue={expense?.note ?? ""}
          hint="Facultatif. Utile pour préciser un poste « Autre »."
        />

        {error && (
          <p role="alert" className="text-role-body text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-rule pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving || pending}>
            Annuler
          </Button>
          <Button type="submit" loading={saving || pending}>
            {expense ? "Enregistrer" : "Créer la dépense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
