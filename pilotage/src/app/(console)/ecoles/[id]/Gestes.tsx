"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { enregistrerPaiement, offrirJours, preparerRenvoiAcces } from "@/lib/gestes";

/** Gestes sûrs sur une école : chacun demande un motif et reste tracé. */
export default function Gestes({ schoolId, prix, proprietaire }: { schoolId: string; prix: number; proprietaire: { id: string; email: string } | null }) {
  const [ouvert, setOuvert] = useState<"" | "jours" | "paiement">("");
  const [jours, setJours] = useState(7);
  const [motif, setMotif] = useState("");
  const [mois, setMois] = useState(1);
  const [montant, setMontant] = useState(prix);
  const [reference, setReference] = useState("");
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [message, setMessage] = useState<{ texte: string; tel: string | null } | null>(null);
  const [enCours, demarrer] = useTransition();

  const lancer = (f: () => Promise<{ ok: true; info?: string } | { ok: false; error: string }>) =>
    demarrer(async () => {
      const r = await f();
      setRetour(r.ok ? { ok: true, texte: r.info ?? "Fait." } : { ok: false, texte: r.error });
      if (r.ok) {
        setOuvert("");
        setMotif("");
        setReference("");
      }
    });

  const champ = "h-8 rounded-lg border border-rule bg-surface px-2 text-[13px]";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={ouvert === "jours" ? "primary" : "secondary"} onClick={() => setOuvert(ouvert === "jours" ? "" : "jours")}>Offrir des jours…</Button>
        <Button size="sm" variant={ouvert === "paiement" ? "primary" : "secondary"} onClick={() => setOuvert(ouvert === "paiement" ? "" : "paiement")}>Enregistrer un paiement reçu…</Button>
        {proprietaire && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              demarrer(async () => {
                const r = await preparerRenvoiAcces(schoolId, proprietaire.id);
                if (r.ok && r.message) setMessage({ texte: r.message, tel: r.telephone?.replace(/\D/g, "") ?? null });
                else if (!r.ok) setRetour({ ok: false, texte: r.error });
              })
            }
          >
            Renvoyer l&apos;accès au directeur
          </Button>
        )}
      </div>

      {ouvert === "jours" && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-sunk p-2.5">
          <label className="text-[12px] text-text-soft">Jours<br /><input type="number" min={1} max={90} value={jours} onChange={(e) => setJours(Number(e.target.value))} className={`${champ} w-20`} /></label>
          <label className="flex-1 text-[12px] text-text-soft">Motif<br /><input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. installation retardée, geste commercial" className={`${champ} w-full`} /></label>
          <Button size="sm" loading={enCours} onClick={() => lancer(() => offrirJours(schoolId, jours, motif))}>Offrir</Button>
        </div>
      )}
      {ouvert === "paiement" && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-sunk p-2.5">
          <label className="text-[12px] text-text-soft">Mois<br /><input type="number" min={1} max={24} value={mois} onChange={(e) => { const m = Number(e.target.value); setMois(m); setMontant(m * prix); }} className={`${champ} w-16`} /></label>
          <label className="text-[12px] text-text-soft">Montant (F CFA)<br /><input type="number" min={0} value={montant} onChange={(e) => setMontant(Number(e.target.value))} className={`${champ} w-28`} /></label>
          <label className="flex-1 text-[12px] text-text-soft">Moyen / référence<br /><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. espèces reçues le 27/09, Orange Money 7X…" className={`${champ} w-full`} /></label>
          <Button size="sm" loading={enCours} onClick={() => lancer(() => enregistrerPaiement(schoolId, mois, montant, reference))}>Enregistrer</Button>
        </div>
      )}
      {message && (
        <div className="space-y-1.5 rounded-lg bg-sunk p-2.5">
          <p className="whitespace-pre-wrap text-[12.5px] text-text select-all">{message.texte}</p>
          <div className="flex gap-1.5">
            <a className="rounded-lg bg-primary px-2.5 py-1 text-[12px] font-semibold text-white" href={`https://wa.me/${message.tel ?? ""}?text=${encodeURIComponent(message.texte)}`} target="_blank" rel="noopener noreferrer">Envoyer sur WhatsApp</a>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(message.texte)}>Copier</Button>
            <Button size="sm" variant="ghost" onClick={() => setMessage(null)}>Fermer</Button>
          </div>
        </div>
      )}
      {retour && <p className={`text-[12.5px] ${retour.ok ? "text-success" : "text-danger"}`}>{retour.texte}</p>}
      <p className="text-[11px] text-text-faint">Chaque geste prévient la direction de l&apos;école et reste inscrit au journal.</p>
    </div>
  );
}
