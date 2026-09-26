"use client";

import { useState, useTransition } from "react";
import { mettreAJourBaseCommunaute } from "@/app/dashboard/communications/communaute/schema-actions";

export default function MettreAJourBase() {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            const r = await mettreAJourBaseCommunaute();
            if (r.ok) window.location.reload();
            else setErreur(r.error);
          })
        }
        className="min-h-11 rounded-full bg-primary-ink px-6 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/40"
      >
        {enCours ? "Mise à jour…" : "Mettre à jour la base"}
      </button>
      <p className="mt-2 text-xs text-text-faint">Ajoute ce qui manque (canaux, messages, sondages, formulaires). Rien n&apos;est supprimé.</p>
      {erreur && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
