"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatAmount } from "@/lib/moneyFormat";
import { FEE_KIND_LABELS, FEE_CADENCE_LABELS } from "@/lib/feesLabels";
import { requestFeeChange } from "../../settings/fees/actions";

/**
 * Consultation de la grille + demande de modification. Lot 12.2.
 *
 * ⚠️ **Une seule action est importée** : `requestFeeChange()`. Aucune fonction
 * d'écriture de la grille n'est accessible depuis ce composant — et si elle
 * l'était, elle serait refusée côté serveur (`FEE_REVIEW_PATH`).
 */

type Item = {
  id: string; kind: string; label: string; amount: number;
  cadence: string; mandatory: boolean; className: string | null; cycle: string | null;
};
type Request = {
  id: string; status: string; reason: string; currentAmount: number; proposedAmount: number;
  itemLabel: string; className: string | null; decisionReason: string | null;
};

export function TarifsClient({
  scheduleLabel, academicYear, items, requests, forecastTotal, forecastStudents, uncovered,
}: {
  scheduleLabel: string; academicYear: string; items: Item[]; requests: Request[];
  forecastTotal: number | null; forecastStudents: number; uncovered: number;
}) {
  const [pending, start] = useTransition();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [proposed, setProposed] = useState("");
  const [reason, setReason] = useState("");

  const pendingReq = requests.filter((r) => r.status === "SUBMITTED");
  const decided = requests.filter((r) => r.status !== "SUBMITTED");

  function submit(item: Item) {
    const amount = Number(proposed);
    // Contrôles côté client pour la lisibilité — la règle qui compte est celle
    // de la server action, qui refuse un motif vide et un montant identique.
    if (!Number.isFinite(amount) || amount < 0) { toast.error("Montant proposé invalide."); return; }
    if (!reason.trim()) { toast.error("Un motif est obligatoire — la direction doit pouvoir juger."); return; }

    start(async () => {
      const r = await requestFeeChange({ feeItemId: item.id, proposedAmount: amount, reason });
      if (r.error) {
        // `startTransition` attend une fonction sans valeur de retour : renvoyer
        // le résultat de `toast.error()` (une chaîne) casse le typage.
        toast.error(r.error);
        return;
      }
      toast.success("Demande transmise à la direction.");
      setOpenFor(null);
      setProposed("");
      setReason("");
    });
  }

  return (
    <div className="space-y-6">
      {/* Forecast — calculé, jamais ressaisi (PARTIE 6). */}
      <Card
        title="Attendu annuel calculé"
        description="Calculé automatiquement à partir de la grille officielle et des élèves réellement inscrits. Vous n'avez aucun tarif à ressaisir."
      >
        {forecastTotal === null ? (
          <p className="text-role-body text-text-soft">
            Aucun forecast : la configuration financière de l&apos;établissement est incomplète.
          </p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-role-page font-semibold tabular-nums text-text">
              {formatAmount(forecastTotal)}{" "}
              <span className="text-role-meta font-medium text-text-soft">FCFA</span>
            </p>
            <p className="text-role-meta text-text-soft">
              prévision annuelle · {forecastStudents} élève(s) couvert(s)
              {uncovered > 0 && <span className="text-warning"> · {uncovered} hors grille, non comptés</span>}
            </p>
          </div>
        )}
      </Card>

      {/* Grille officielle, en lecture seule. */}
      <Card
        title={`Grille « ${scheduleLabel} » — ${academicYear}`}
        description="Lecture seule. Utilisez « Demander une modification » pour proposer un changement."
        actions={
          <span className="inline-flex items-center gap-1.5 text-role-meta text-text-faint">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            Définie par la direction
          </span>
        }
      >
        {items.length === 0 ? (
          <EmptyState size="sm" title="Grille vide" description="Aucune ligne tarifaire n'a encore été saisie." />
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="rounded-control border border-rule px-3 py-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-text">{i.label}</span>
                  <Badge size="sm">{FEE_KIND_LABELS[i.kind as keyof typeof FEE_KIND_LABELS] ?? i.kind}</Badge>
                  <span className="tabular-nums font-semibold text-text">{formatAmount(i.amount)} FCFA</span>
                  <span className="text-role-meta text-text-soft">
                    {FEE_CADENCE_LABELS[i.cadence as keyof typeof FEE_CADENCE_LABELS] ?? i.cadence}
                    {i.className ? ` · ${i.className}` : i.cycle ? ` · ${i.cycle}` : " · tout l'établissement"}
                    {!i.mandatory && " · facultatif"}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    onClick={() => {
                      setOpenFor(openFor === i.id ? null : i.id);
                      setProposed(String(i.amount));
                      setReason("");
                    }}
                  >
                    Demander une modification
                  </Button>
                </div>

                {openFor === i.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-rule pt-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-role-meta text-text-soft">Montant actuel</span>
                      <span className="flex h-9 items-center rounded-control bg-sunk px-3 text-role-body tabular-nums text-text-soft">
                        {formatAmount(i.amount)} FCFA
                      </span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-role-meta text-text-soft">Montant proposé</span>
                      <input
                        type="number"
                        min="0"
                        value={proposed}
                        onChange={(e) => setProposed(e.target.value)}
                        className="h-9 w-40 rounded-control border border-rule bg-surface px-3 text-role-body tabular-nums text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-role-meta text-text-soft">Motif (obligatoire)</span>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Pourquoi ce tarif devrait-il changer ?"
                        className="h-9 min-w-56 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <Button size="sm" loading={pending} onClick={() => submit(i)}>
                      <Send aria-hidden="true" className="h-4 w-4" />
                      Transmettre à la direction
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Suivi des demandes. */}
      {pendingReq.length > 0 && (
        <Card title="Mes demandes en attente" description="Transmises à la direction, pas encore tranchées.">
          <ul className="space-y-2">
            {pendingReq.map((r) => (
              <li key={r.id} className="rounded-control border border-rule px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{r.itemLabel}{r.className ? ` (${r.className})` : ""}</span>
                  <span className="tabular-nums text-text-soft">
                    {formatAmount(r.currentAmount)} → {formatAmount(r.proposedAmount)} FCFA
                  </span>
                  <StatusBadge domain="expense" status={r.status} />
                </div>
                <p className="mt-1 text-role-meta text-text-soft">Motif : {r.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {decided.length > 0 && (
        <Card
          title="Décisions rendues"
          description="Une demande refusée reste consultable : le tarif n'a pas changé, mais la demande n'est pas effacée."
        >
          <ul className="space-y-2">
            {decided.map((r) => (
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
