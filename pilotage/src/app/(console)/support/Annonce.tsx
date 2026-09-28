"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ecrireAuxEcoles } from "@/lib/gestes";

/** Message de l'équipe EduCom aux directions des écoles (cloche + notification). */
export default function Annonce() {
  const [ouvert, setOuvert] = useState(false);
  const [cible, setCible] = useState<"TOUTES" | "PAYANTES" | "ESSAI">("TOUTES");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [retour, setRetour] = useState("");
  const [enCours, demarrer] = useTransition();
  if (!ouvert) return <Button size="sm" variant="secondary" onClick={() => setOuvert(true)}>Écrire aux écoles…</Button>;
  return (
    <div className="w-full space-y-2 rounded-xl border border-rule bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <b>Écrire aux directions :</b>
        {(["TOUTES", "PAYANTES", "ESSAI"] as const).map((c) => (
          <button key={c} type="button" onClick={() => setCible(c)} className={`rounded-full border px-2.5 py-0.5 ${cible === c ? "border-primary bg-primary text-white" : "border-rule"}`}>
            {c === "TOUTES" ? "Toutes les écoles actives" : c === "PAYANTES" ? "Clients" : "En essai"}
          </button>
        ))}
      </div>
      <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre (ex. Nouveauté : bulletins en PDF)" className="h-8 w-full rounded-lg border border-rule px-2.5 text-[13px]" />
      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder="Message (500 caractères max.)" className="w-full rounded-lg border border-rule p-2.5 text-[13px]" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-text-soft">{retour}</span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOuvert(false)}>Fermer</Button>
          <Button size="sm" loading={enCours} onClick={() => confirm("Envoyer ce message aux directions des écoles choisies ?") && demarrer(async () => { const r = await ecrireAuxEcoles(cible, titre, texte); setRetour(r.ok ? r.info ?? "Envoyé." : r.error); if (r.ok) { setTitre(""); setTexte(""); } })}>Envoyer</Button>
        </div>
      </div>
    </div>
  );
}
