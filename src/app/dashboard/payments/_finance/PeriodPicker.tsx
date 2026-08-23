"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Sélecteur de période — les cinq granularités du lot 10, dans l'URL.
 *
 * ⚠️ **L'état vit dans l'URL, pas dans le composant.** Une période dans un
 * `useState` ne se partage pas, ne se recharge pas et ne revient pas par le
 * bouton « précédent ». Ici un lien ou un rafraîchissement reproduit exactement
 * la même vue — ce qui compte quand un gestionnaire envoie « regarde août » à sa
 * direction.
 *
 * ⚠️ **Aucune borne n'est calculée ici.** Le composant ne transmet que le *choix*
 * (`kind`, plus deux dates pour une période personnalisée) ; les bornes sont
 * résolues côté serveur par `resolvePeriod()`. Un client ne doit pas décider de
 * la fenêtre d'agrégation d'un montant.
 *
 * Le trimestre n'est proposé que si l'établissement a des trimestres. Ceux sans
 * dates restent visibles mais désactivés, avec la raison affichée : les cacher
 * laisserait croire qu'ils n'existent pas, alors qu'il manque seulement leurs
 * dates dans les Paramètres.
 */

type Term = { id: string; name: string; dated: boolean };

const GRANULARITES = [
  { kind: "day", label: "Jour" },
  { kind: "week", label: "Semaine" },
  { kind: "month", label: "Mois" },
] as const;

export function PeriodPicker({
  activeKind,
  activeLabel,
  terms,
  termId,
  from,
  to,
  notice,
}: {
  activeKind: string;
  activeLabel: string;
  terms: Term[];
  termId?: string;
  from: string;
  to: string;
  notice?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [customMonth, setCustomMonth] = useState(params.get("month") || new Date().toISOString().slice(0, 7)); // YYYY-MM

  function go(next: Record<string, string | undefined>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    start(() => router.push(`${pathname}?${q.toString()}`));
  }

  const datedTerms = terms.filter((t) => t.dated);
  const undatedTerms = terms.filter((t) => !t.dated);

  return (
    <div className="rounded-surface border border-rule bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2 text-text-soft">
          <Calendar aria-hidden="true" className="h-4 w-4" />
          <span className="text-role-label font-semibold uppercase tracking-wide">Période</span>
        </div>

        <div role="group" aria-label="Granularité de la période" className="flex flex-wrap gap-1.5">
          {GRANULARITES.map((g) => (
            <Button
              key={g.kind}
              size="sm"
              variant={activeKind === g.kind ? "primary" : "secondary"}
              aria-pressed={activeKind === g.kind}
              disabled={pending}
              onClick={() => go({ kind: g.kind, termId: undefined, from: undefined, to: undefined, month: g.kind === "month" ? customMonth : undefined })}
            >
              {g.label}
            </Button>
          ))}

          {datedTerms.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={activeKind === "term" && termId === t.id ? "primary" : "secondary"}
              aria-pressed={activeKind === "term" && termId === t.id}
              disabled={pending}
              onClick={() => go({ kind: "term", termId: t.id, from: undefined, to: undefined, month: undefined })}
            >
              {t.name}
            </Button>
          ))}

          <Button
            size="sm"
            variant={activeKind === "custom" ? "primary" : "secondary"}
            aria-pressed={activeKind === "custom"}
            disabled={pending}
            onClick={() => go({ kind: "custom", termId: undefined, from: customFrom, to: customTo, month: undefined })}
          >
            Personnalisée
          </Button>
        </div>

        <p className="ml-auto text-role-body text-text-soft">
          Affiché : <span className="font-semibold text-text">{activeLabel}</span>
        </p>
      </div>

      {activeKind === "month" && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4">
          <label className="flex flex-col gap-1">
            <span className="text-role-label font-medium text-text-soft">Mois de l'année</span>
            <input
              type="month"
              value={customMonth}
              onChange={(e) => {
                setCustomMonth(e.target.value);
                go({ kind: "month", month: e.target.value, termId: undefined, from: undefined, to: undefined });
              }}
              className="h-10 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      )}

      {activeKind === "custom" && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4">
          <label className="flex flex-col gap-1">
            <span className="text-role-label font-medium text-text-soft">Du</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-10 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-role-label font-medium text-text-soft">Au</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-10 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <Button
            size="md"
            loading={pending}
            onClick={() => go({ kind: "custom", from: customFrom, to: customTo, termId: undefined, month: undefined })}
          >
            Appliquer
          </Button>
        </div>
      )}

      {/* Un trimestre sans dates n'est pas caché : la cause est dite. */}
      {undatedTerms.length > 0 && (
        <p className="mt-3 text-role-meta text-text-faint">
          Sans dates, donc indisponibles comme période :{" "}
          {undatedTerms.map((t) => t.name).join(", ")}. Renseignez leurs dates dans Paramètres.
        </p>
      )}

      {notice && (
        <p role="status" className="mt-3 rounded-control border border-warning/30 bg-warning/5 px-3 py-2 text-role-body text-warning">
          {notice}
        </p>
      )}
    </div>
  );
}
