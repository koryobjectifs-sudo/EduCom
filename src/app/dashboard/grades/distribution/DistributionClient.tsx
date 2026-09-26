"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Send, AlertTriangle, CalendarClock } from "lucide-react";
import type { EtatClasse } from "@/lib/bulletinsParents";
import { distribuerBulletins, annulerDistribution } from "./actions";

/**
 * Distribution des bulletins — direction et secrétariat (26 sept. 2026).
 * Une classe ne part que si tous ses bulletins sont approuvés (bon à tirer).
 */
export default function DistributionClient({
  termes,
  termId,
  classes,
}: {
  termes: { id: string; name: string }[];
  termId: string | null;
  classes: EtatClasse[];
}) {
  const router = useRouter();
  const [choix, setChoix] = useState<string[]>([]);
  const [quand, setQuand] = useState<"maintenant" | "date">("maintenant");
  const [date, setDate] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [aujourdhui] = useState(() => new Date().toISOString().slice(0, 10));

  const disponibles = classes.filter((c) => c.pret && !c.distribution?.publie);
  const tout = disponibles.length > 0 && disponibles.every((c) => choix.includes(c.classId));

  const distribuer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await distribuerBulletins(termId!, choix, quand === "date" ? date : null);
      if (!r.ok) return setErreur(r.error);
      toast.success(
        quand === "date"
          ? `Distribution programmée pour ${r.classes} classe${r.classes > 1 ? "s" : ""} : les familles seront prévenues le ${new Date(`${date}T07:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
          : `Bulletins distribués (${r.classes} classe${r.classes > 1 ? "s" : ""}) : ${r.prevenus} famille${r.prevenus > 1 ? "s" : ""} prévenue${r.prevenus > 1 ? "s" : ""}.`,
      );
      setChoix([]);
      router.refresh();
    });

  if (!termId) {
    return <p className="rounded-2xl border border-dashed border-rule bg-surface p-6 text-sm text-text-soft">Aucun trimestre n&apos;est encore créé.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {termes.map((t) => (
          <Link
            key={t.id}
            href={`?termId=${t.id}`}
            className={`inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold ${t.id === termId ? "bg-primary-ink text-white" : "bg-surface text-text-soft ring-1 ring-rule hover:bg-sunk"}`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <ol className="flex flex-wrap items-center gap-2 text-xs text-text-soft">
        {["Saisie des notes", "Validation du secrétariat", "Conseil de classe", "Distribution aux familles"].map((e, i) => (
          <li key={e} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${i === 3 ? "bg-primary-ink/10 font-bold text-primary-ink" : "bg-sunk"}`}>
            <span className="tabular-nums">{i + 1}.</span> {e}
          </li>
        ))}
      </ol>

      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-text">
            <input
              type="checkbox"
              checked={tout}
              disabled={!disponibles.length}
              onChange={(e) => setChoix(e.target.checked ? disponibles.map((c) => c.classId) : [])}
              className="h-4 w-4 accent-[var(--color-primary-ink)]"
            />
            Toutes les classes prêtes ({disponibles.length})
          </label>
        </div>
        <ul>
          {classes.map((c) => {
            const dejaPublie = c.distribution?.publie;
            const programme = c.distribution && !c.distribution.publie;
            return (
              <li key={c.classId} className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-3 last:border-0">
                <input
                  type="checkbox"
                  aria-label={`Choisir ${c.classe}`}
                  checked={choix.includes(c.classId)}
                  disabled={!c.pret || Boolean(dejaPublie)}
                  onChange={(e) => setChoix((x) => (e.target.checked ? [...x, c.classId] : x.filter((id) => id !== c.classId)))}
                  className="h-4 w-4 accent-[var(--color-primary-ink)] disabled:opacity-30"
                />
                <span className="min-w-24 text-sm font-bold text-text">{c.classe}</span>
                <span className="text-xs text-text-soft">
                  {c.approuves} bulletin{c.approuves > 1 ? "s" : ""} approuvé{c.approuves > 1 ? "s" : ""}
                  {c.autres > 0 && ` · ${c.autres} en attente`}
                </span>
                <span className="ml-auto">
                  {dejaPublie ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-xs font-bold text-success">
                      <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> Distribué le{" "}
                      {new Date(c.distribution!.publishAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </span>
                  ) : programme ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-ink/10 px-2.5 py-1 text-xs font-bold text-primary-ink">
                        <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Prévu le{" "}
                        {new Date(c.distribution!.publishAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      </span>
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() =>
                          demarrer(async () => {
                            const r = await annulerDistribution(termId, c.classId);
                            if (r.ok) router.refresh();
                            else toast.error(r.error);
                          })
                        }
                        className="text-xs font-semibold text-text-soft hover:text-danger"
                      >
                        Annuler
                      </button>
                    </span>
                  ) : c.pret ? (
                    <span className="rounded-full bg-sunk px-2.5 py-1 text-xs font-semibold text-text-soft">Prête</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2.5 py-1 text-xs font-semibold text-text">
                      <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
                      {c.approuves + c.autres === 0 ? "Aucun bulletin validé" : "Validation en cours"}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule bg-surface p-4">
        <div className="flex gap-1 rounded-xl bg-sunk p-1">
          {(
            [
              ["maintenant", "Maintenant"],
              ["date", "À une date"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setQuand(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${quand === id ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {quand === "date" && (
          <label className="inline-flex items-center gap-2 text-sm text-text-soft">
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            <input type="date" min={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} className="min-h-10 rounded-lg border border-rule px-3 text-sm text-text" />
            <span className="text-xs">(les familles sont prévenues le matin)</span>
          </label>
        )}
        <button
          type="button"
          onClick={distribuer}
          disabled={enCours || !choix.length || (quand === "date" && !date)}
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-ink px-5 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {enCours ? "Distribution…" : `Distribuer (${choix.length} classe${choix.length > 1 ? "s" : ""})`}
        </button>
        {erreur && (
          <p role="alert" className="w-full text-sm font-medium text-danger">
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}
