"use client";

import { useState, useTransition } from "react";
import { annulerPaiement } from "@/lib/gestes";

export default function BoutonRembourser({
  paiementId,
  montant,
}: {
  paiementId: string;
  montant: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("Remboursement / Annulation client");
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const executer = () => {
    setErreur(null);
    demarrer(async () => {
      const res = await annulerPaiement(paiementId, motif);
      if (!res.ok) setErreur(res.error);
      else setOuvert(false);
    });
  };

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded px-2 py-0.5 text-[10.5px] font-medium text-text-soft hover:bg-danger/10 hover:text-danger transition-colors"
        title="Marquer ce paiement comme remboursé et réajuster l'accès"
      >
        Annuler / Rembourser
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-danger/30 bg-danger/5 p-2 text-left">
      <p className="text-[11px] font-bold text-danger">
        Confirmer le remboursement de {montant.toLocaleString("fr-FR")} F CFA ?
      </p>
      <input
        type="text"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Motif (ex: Erreur de paiement, rétractation)"
        className="rounded border border-rule bg-surface px-2 py-1 text-xs text-text"
      />
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={executer}
          disabled={enCours}
          className="rounded bg-danger px-2.5 py-1 text-[11px] font-bold text-white hover:bg-danger/90 disabled:opacity-50"
        >
          {enCours ? "En cours…" : "Confirmer le remboursement"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-[11px] text-text-soft hover:text-text"
        >
          Annuler
        </button>
      </div>
      {erreur && <p className="text-[10.5px] text-danger">{erreur}</p>}
    </div>
  );
}
