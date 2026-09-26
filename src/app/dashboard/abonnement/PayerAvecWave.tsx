"use client";

import { useState, useTransition } from "react";
import { payerAbonnement } from "./actions";

const DUREES = [
  { mois: 1, libelle: "1 mois" },
  { mois: 3, libelle: "3 mois" },
  { mois: 12, libelle: "12 mois" },
] as const;

/**
 * Choix de la durée puis redirection vers Wave.
 * ⚠️ `wave_launch_url` s'ouvre dans le navigateur (exigence Wave), jamais
 * dans une webview ni une iframe.
 */
export default function PayerAvecWave({ prixMensuel, actif }: { prixMensuel: number; actif: boolean }) {
  const [mois, setMois] = useState<number>(1);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const payer = () => {
    setErreur(null);
    demarrer(async () => {
      const r = await payerAbonnement(mois);
      if ("url" in r) window.location.assign(r.url);
      else setErreur(r.error);
    });
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Durée" className="flex flex-wrap gap-2">
        {DUREES.map((d) => (
          <button
            key={d.mois}
            type="button"
            role="radio"
            aria-checked={mois === d.mois}
            onClick={() => setMois(d.mois)}
            className={`min-h-11 rounded-control border px-4 text-sm font-semibold transition-colors ${
              mois === d.mois ? "border-primary bg-primary/10 text-primary" : "border-rule bg-surface text-text hover:bg-sunk"
            }`}
          >
            {d.libelle}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={payer}
        disabled={!actif || enCours}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-[#1DC8FF] px-5 text-[15px] font-bold text-[#0B1F3A] shadow-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {enCours ? "Ouverture de Wave…" : `Payer ${(prixMensuel * mois).toLocaleString("fr-FR")} F CFA avec Wave`}
      </button>
      {!actif && (
        <p className="text-xs text-text-soft">Le paiement Wave sera disponible dès son activation par l&apos;équipe EduCom.</p>
      )}
      {erreur && (
        <p role="alert" className="text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
