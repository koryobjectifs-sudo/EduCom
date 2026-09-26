"use client";

import { useState } from "react";
import type { TableauEngagement as Donnees } from "@/lib/engagement";
import { ilYa } from "./outils";

/**
 * Tableau d'engagement de la direction — 26 sept. 2026.
 * Ce que les familles voient vraiment, et qui relancer.
 */
function Tuile({ titre, valeur, aide }: { titre: string; valeur: string; aide: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">{titre}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-text">{valeur}</p>
      <p className="mt-0.5 text-xs text-text-soft">{aide}</p>
    </div>
  );
}

export default function TableauEngagement({ d, baseHref }: { d: Donnees; baseHref: string }) {
  const [tous, setTous] = useState(false);
  const pctActifs = d.parents.total ? Math.round((d.parents.actifs30j / d.parents.total) * 100) : 0;
  const pctNotif = d.parents.total ? Math.round((d.parents.notifications / d.parents.total) * 100) : 0;
  const moyVus = d.publications.length
    ? Math.round(
        (d.publications.reduce((t, p) => t + (p.destinataires ? p.vus / p.destinataires : 0), 0) / d.publications.length) * 100,
      )
    : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 py-4 sm:px-6 sm:py-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tuile titre="Parents actifs" valeur={`${pctActifs} %`} aide={`${d.parents.actifs30j} sur ${d.parents.total} ont ouvert la Communauté ces 30 jours`} />
        <Tuile titre="Publications vues" valeur={`${moyVus} %`} aide="En moyenne, sur les 20 dernières" />
        <Tuile titre="Notifications activées" valeur={`${pctNotif} %`} aide={`${d.parents.notifications} parents préviennent sur leur téléphone`} />
      </div>

      <section className="rounded-2xl border border-rule bg-surface">
        <h2 className="border-b border-rule px-4 py-3 text-[15px] font-bold text-text">Dernières publications</h2>
        {d.publications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-soft">Rien de publié pour l&apos;instant.</p>
        ) : (
          <ul>
            {d.publications.map((p) => {
              const pct = p.destinataires ? Math.round((p.vus / p.destinataires) * 100) : 0;
              return (
                <li key={p.id} className="border-b border-rule px-4 py-3 last:border-0">
                  <a href={`${baseHref}#pub-${p.id}`} className="block">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-text">{p.extrait}</p>
                      <span className="shrink-0 text-xs text-text-faint">
                        {p.espace} · {ilYa(p.date)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                        <span className={`block h-full rounded-full ${pct < 40 ? "bg-warning" : "bg-primary-ink"}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-text-soft">
                        vu {p.vus}/{p.destinataires} · {p.reactions} réactions · {p.reponses} réponses
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {d.formulaires.length > 0 && (
        <section className="rounded-2xl border border-rule bg-surface">
          <h2 className="border-b border-rule px-4 py-3 text-[15px] font-bold text-text">Formulaires</h2>
          <ul>
            {d.formulaires.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 text-sm last:border-0">
                <span className="truncate text-text">{f.titre}</span>
                <span className="shrink-0 tabular-nums text-text-soft">
                  {f.reponses}/{f.destinataires} réponses
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-rule bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <h2 className="text-[15px] font-bold text-text">Parents à relancer ({d.parents.inactifs.length})</h2>
          <span className="text-xs text-text-soft">Aucune visite depuis 30 jours</span>
        </div>
        {d.parents.inactifs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-soft">Tous les parents sont venus ce mois-ci. 🎉</p>
        ) : (
          <>
            <ul className="grid gap-x-6 px-4 py-2 sm:grid-cols-2">
              {(tous ? d.parents.inactifs : d.parents.inactifs.slice(0, 20)).map((p, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-rule py-2 text-sm">
                  <span className="truncate font-semibold text-text">{p.nom}</span>
                  <span className="truncate text-text-soft">{p.enfants}</span>
                </li>
              ))}
            </ul>
            {d.parents.inactifs.length > 20 && (
              <button type="button" onClick={() => setTous((v) => !v)} className="px-4 pb-3 text-sm font-semibold text-primary-ink hover:underline">
                {tous ? "Réduire" : `Voir les ${d.parents.inactifs.length}`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
