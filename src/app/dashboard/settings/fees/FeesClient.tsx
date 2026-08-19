"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Check, X, Trash2, Power } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatAmount } from "@/lib/moneyFormat";
import { FEE_KIND_LABELS, FEE_CADENCE_LABELS } from "@/lib/feesLabels";
import {
  createSchedule, activateSchedule, upsertFeeItem, deleteFeeItem, decideFeeChange,
} from "./actions";

/**
 * Gestion de la grille tarifaire — lot 12.1.
 *
 * ⚠️ Aucun contrôle de permission ici : cet écran n'est atteignable que par
 * `/dashboard/settings`, gardé côté serveur, et **chaque action revérifie le
 * chemin** de son côté. Un composant client ne décide jamais d'un droit — il
 * serait contournable par un appel direct à la server action.
 */

type Schedule = { id: string; label: string; academicYear: string; status: string; itemCount: number };
type Item = {
  id: string; kind: string; label: string; amount: number; cadence: string;
  mandatory: boolean; classId: string | null; className: string | null; cycle: string | null;
};
type ClassRow = { id: string; name: string; cycle: string };
type Request = {
  id: string; status: string; reason: string; currentAmount: number; proposedAmount: number;
  itemLabel: string; className: string | null; decisionReason: string | null;
};

const CYCLES = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE", "AUTRE"];

export function FeesClient({
  schedules, activeId, items, classes, requests, forecastTotal, forecastStudents, uncovered,
}: {
  schedules: Schedule[]; activeId: string | null; items: Item[]; classes: ClassRow[];
  requests: Request[]; forecastTotal: number | null; forecastStudents: number; uncovered: number;
}) {
  const [pending, start] = useTransition();
  const [newYear, setNewYear] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    kind: "TUITION", label: "", amount: "", cadence: "ANNUAL",
    mandatory: true, scope: "school" as "school" | "class" | "cycle", classId: "", cycle: "ELEMENTAIRE",
  });
  const [refusal, setRefusal] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<{ error?: string; success?: boolean; data?: unknown }>, okMsg: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else toast.success(okMsg);
    });

  const pendingRequests = requests.filter((r) => r.status === "SUBMITTED");
  const decidedRequests = requests.filter((r) => r.status !== "SUBMITTED");

  return (
    <div className="space-y-6">
      {/* ── Forecast : la conséquence directe de la grille ── */}
      <Card
        title="Attendu annuel calculé"
        description="Recalculé à chaque modification de la grille — aucune copie n'est stockée."
      >
        {forecastTotal === null ? (
          <p className="text-role-body text-text-soft">
            Aucune grille officielle active : aucun forecast n&apos;est calculé.
          </p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-role-page font-semibold tabular-nums text-text">
              {formatAmount(forecastTotal)} <span className="text-role-meta font-medium text-text-soft">FCFA</span>
            </p>
            <p className="text-role-meta text-text-soft">
              sur {forecastStudents} élève(s) couvert(s)
              {uncovered > 0 && (
                <span className="text-warning"> · {uncovered} élève(s) hors grille, non comptés</span>
              )}
            </p>
          </div>
        )}
      </Card>

      {/* ── Demandes en attente ── */}
      {pendingRequests.length > 0 && (
        <Card title="Demandes de modification en attente" description="Le gestionnaire propose ; vous décidez.">
          <ul className="space-y-3">
            {pendingRequests.map((r) => (
              <li key={r.id} className="rounded-control border border-rule p-3">
                <p className="text-role-body font-semibold text-text">
                  {r.itemLabel}{r.className ? ` (${r.className})` : ""} :{" "}
                  <span className="tabular-nums">{formatAmount(r.currentAmount)}</span> →{" "}
                  <span className="tabular-nums">{formatAmount(r.proposedAmount)}</span> FCFA
                </p>
                <p className="mt-1 text-role-meta text-text-soft">Motif : {r.reason}</p>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Button
                    size="sm"
                    loading={pending}
                    onClick={() => run(() => decideFeeChange({ id: r.id, accept: true }), "Grille modifiée.")}
                  >
                    <Check aria-hidden="true" className="h-4 w-4" /> Accepter
                  </Button>
                  <label className="flex flex-col gap-1">
                    <span className="text-role-meta text-text-soft">Motif du refus (obligatoire)</span>
                    <input
                      value={refusal[r.id] ?? ""}
                      onChange={(e) => setRefusal({ ...refusal, [r.id]: e.target.value })}
                      className="h-9 w-64 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    onClick={() =>
                      run(() => decideFeeChange({ id: r.id, accept: false, comment: refusal[r.id] }), "Demande refusée.")
                    }
                  >
                    <X aria-hidden="true" className="h-4 w-4" /> Refuser
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Grilles ── */}
      <Card
        title="Grilles tarifaires"
        actions={
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Nouvelle grille
          </Button>
        }
      >
        {showForm && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-control border border-rule bg-ground p-3">
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Année scolaire</span>
              <input
                value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="2025-2026"
                className="h-9 w-40 rounded-control border border-rule bg-surface px-3 text-role-body text-text"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Libellé</span>
              <input
                value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Grille officielle"
                className="h-9 w-64 rounded-control border border-rule bg-surface px-3 text-role-body text-text"
              />
            </label>
            <Button
              size="sm" loading={pending}
              onClick={() => run(() => createSchedule({ academicYear: newYear, label: newLabel }), "Grille créée.")}
            >
              Créer
            </Button>
          </div>
        )}

        {schedules.length === 0 ? (
          <EmptyState size="sm" title="Aucune grille" description="Créez-en une pour commencer." />
        ) : (
          <ul className="space-y-2">
            {schedules.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-control border border-rule px-3 py-2">
                <span className="font-medium text-text">{s.label}</span>
                <span className="text-role-meta text-text-soft">{s.academicYear} · {s.itemCount} ligne(s)</span>
                <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "DRAFT" ? "neutral" : "info"}>
                  {s.status === "ACTIVE" ? "Officielle" : s.status === "DRAFT" ? "Brouillon" : "Archivée"}
                </Badge>
                {s.status !== "ACTIVE" && (
                  <Button
                    size="sm" variant="secondary" className="ml-auto" loading={pending}
                    onClick={() => run(() => activateSchedule(s.id), "Grille rendue officielle.")}
                  >
                    <Power aria-hidden="true" className="h-4 w-4" /> Rendre officielle
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Lignes de la grille active ── */}
      {activeId && (
        <Card title="Lignes de la grille officielle" description="Un frais facultatif n'entre pas dans le forecast.">
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-control border border-rule px-3 py-2">
                <span className="font-medium text-text">{i.label}</span>
                <Badge size="sm">{FEE_KIND_LABELS[i.kind as keyof typeof FEE_KIND_LABELS] ?? i.kind}</Badge>
                <span className="tabular-nums text-text">{formatAmount(i.amount)} FCFA</span>
                <span className="text-role-meta text-text-soft">
                  {FEE_CADENCE_LABELS[i.cadence as keyof typeof FEE_CADENCE_LABELS] ?? i.cadence}
                  {i.className ? ` · ${i.className}` : i.cycle ? ` · ${i.cycle}` : " · tout l'établissement"}
                  {!i.mandatory && " · facultatif"}
                </span>
                <Button
                  size="sm" variant="ghost" className="ml-auto" loading={pending}
                  onClick={() => run(() => deleteFeeItem(i.id), "Ligne supprimée.")}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          {/* Ajout d'une ligne */}
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-control border border-rule bg-ground p-3">
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Nature</span>
              <select
                value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                className="h-9 rounded-control border border-rule bg-surface px-2 text-role-body text-text"
              >
                {Object.entries(FEE_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Libellé</span>
              <input
                value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="h-9 w-48 rounded-control border border-rule bg-surface px-3 text-role-body text-text"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Montant (FCFA)</span>
              <input
                type="number" min="0" value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                className="h-9 w-36 rounded-control border border-rule bg-surface px-3 text-role-body tabular-nums text-text"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Cadence</span>
              <select
                value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}
                className="h-9 rounded-control border border-rule bg-surface px-2 text-role-body text-text"
              >
                {Object.entries(FEE_CADENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-role-meta text-text-soft">Portée</span>
              <select
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as typeof draft.scope })}
                className="h-9 rounded-control border border-rule bg-surface px-2 text-role-body text-text"
              >
                <option value="school">Tout l&apos;établissement</option>
                <option value="cycle">Un cycle</option>
                <option value="class">Une classe</option>
              </select>
            </label>
            {draft.scope === "class" && (
              <select
                value={draft.classId} onChange={(e) => setDraft({ ...draft, classId: e.target.value })}
                className="h-9 rounded-control border border-rule bg-surface px-2 text-role-body text-text"
              >
                <option value="">— choisir —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {draft.scope === "cycle" && (
              <select
                value={draft.cycle} onChange={(e) => setDraft({ ...draft, cycle: e.target.value })}
                className="h-9 rounded-control border border-rule bg-surface px-2 text-role-body text-text"
              >
                {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox" checked={draft.mandatory}
                onChange={(e) => setDraft({ ...draft, mandatory: e.target.checked })}
              />
              <span className="text-role-meta text-text-soft">Obligatoire</span>
            </label>
            <Button
              size="sm" loading={pending}
              onClick={() =>
                run(
                  () => upsertFeeItem({
                    scheduleId: activeId,
                    kind: draft.kind as never,
                    label: draft.label,
                    amount: Number(draft.amount),
                    cadence: draft.cadence as never,
                    mandatory: draft.mandatory,
                    classId: draft.scope === "class" ? draft.classId : null,
                    cycle: draft.scope === "cycle" ? (draft.cycle as never) : null,
                  }),
                  "Ligne enregistrée.",
                )
              }
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </Card>
      )}

      {/* ── Historique des décisions ── */}
      {decidedRequests.length > 0 && (
        <Card title="Décisions passées" description="Une demande refusée reste consultable — refuser n'efface pas ce qui a été demandé.">
          <ul className="space-y-2">
            {decidedRequests.map((r) => (
              <li key={r.id} className="rounded-control border border-rule px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{r.itemLabel}</span>
                  <span className="tabular-nums text-text-soft">
                    {formatAmount(r.currentAmount)} → {formatAmount(r.proposedAmount)} FCFA
                  </span>
                  <StatusBadge domain="expense" status={r.status} />
                </div>
                <p className="mt-1 text-role-meta text-text-soft">
                  Motif : {r.reason}
                  {r.decisionReason && ` · Décision : ${r.decisionReason}`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
