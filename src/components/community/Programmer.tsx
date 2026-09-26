"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";

/**
 * Programmer l'envoi d'un message (canaux et messages directs) — 26 sept. 2026.
 * Raccourcis façon Slack + heure libre. Renvoie une date ISO, ou null.
 */
function prochain(jourSemaine: number | null, heure: number) {
  const d = new Date();
  d.setSeconds(0, 0);
  if (jourSemaine === null) {
    d.setDate(d.getDate() + 1);
  } else {
    const ecart = (jourSemaine - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + ecart);
  }
  d.setHours(heure, 0, 0, 0);
  return d;
}

export const libelleProgramme = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const local = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 16);
};

export function ChoixHeure({ choisir, fermer }: { choisir: (iso: string) => void; fermer: () => void }) {
  const [libre, setLibre] = useState("");
  const [min] = useState(() => local(new Date(Date.now() + 5 * 60_000)));
  // Calculés une fois à l'ouverture du menu.
  const [raccourcis] = useState(() => [
    { label: "Dans 1 heure", d: new Date(Math.ceil((Date.now() + 3600_000) / 300_000) * 300_000) },
    { label: "Demain à 8 h", d: prochain(null, 8) },
    { label: "Lundi à 8 h", d: prochain(1, 8) },
  ]);
  return (
    <>
      <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={fermer} />
      <div className="absolute bottom-full right-0 z-30 mb-1 w-64 overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-overlay">
        <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-faint">Programmer l&apos;envoi</p>
        {raccourcis.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => choisir(r.d.toISOString())}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text hover:bg-sunk"
          >
            {r.label}
            <span className="text-xs text-text-faint">{r.d.toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </button>
        ))}
        <div className="border-t border-rule px-3 py-2">
          <label className="block text-xs font-semibold text-text-soft">
            Autre date et heure
            <input
              type="datetime-local"
              min={min}
              value={libre}
              onChange={(e) => setLibre(e.target.value)}
              className="mt-1 min-h-9 w-full rounded-lg border border-rule px-2 text-sm text-text"
            />
          </label>
          <button
            type="button"
            disabled={!libre}
            onClick={() => choisir(new Date(libre).toISOString())}
            className="mt-2 min-h-8 w-full rounded-lg bg-primary-ink text-xs font-bold text-white disabled:bg-primary-ink/30"
          >
            Programmer
          </button>
        </div>
      </div>
    </>
  );
}

/** Bouton horloge + pastille « Programmé : … » dans un composeur. */
export function BoutonProgrammer({ valeur, changer }: { valeur: string | null; changer: (v: string | null) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="relative flex items-center gap-1">
      {valeur && (
        <span className="inline-flex max-w-[220px] items-center gap-1 rounded-full bg-primary-ink/10 py-0.5 pl-2 pr-1 text-[11px] font-semibold text-primary-ink">
          <Clock aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span className="truncate">{libelleProgramme(valeur)}</span>
          <button type="button" aria-label="Annuler la programmation" onClick={() => changer(null)} className="rounded-full p-0.5 hover:bg-primary-ink/15">
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </span>
      )}
      <button
        type="button"
        title="Programmer l'envoi"
        aria-label="Programmer l'envoi"
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
        className={`flex h-8 w-8 items-center justify-center rounded-md ${valeur ? "bg-primary-ink/10 text-primary-ink" : "text-text-soft hover:bg-sunk hover:text-text"}`}
      >
        <Clock aria-hidden="true" className="h-4 w-4" />
      </button>
      {ouvert && (
        <ChoixHeure
          choisir={(iso) => {
            changer(iso);
            setOuvert(false);
          }}
          fermer={() => setOuvert(false)}
        />
      )}
    </div>
  );
}
