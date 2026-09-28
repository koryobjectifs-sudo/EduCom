"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { changerStatutTicket, marquerTicketLu, repondreTicket } from "@/lib/gestes";

export function Repondre({ ticketId, statut }: { ticketId: string; statut: string }) {
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const router = useRouter();
  useEffect(() => {
    marquerTicketLu(ticketId).then(() => router.refresh());
  }, [ticketId, router]);
  const envoyer = () =>
    demarrer(async () => {
      const r = await repondreTicket(ticketId, texte);
      if (!r.ok) return setErreur(r.error);
      setTexte("");
      setErreur("");
      router.refresh();
    });
  const statuer = (s: "OUVERT" | "EN_COURS" | "RESOLU") =>
    demarrer(async () => {
      await changerStatutTicket(ticketId, s);
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) envoyer(); }}
        rows={3}
        placeholder="Répondre à l'école… (⌘/Ctrl + Entrée pour envoyer)"
        className="w-full rounded-lg border border-rule bg-surface p-2.5 text-[13px]"
      />
      {erreur && <p className="text-[12px] text-danger">{erreur}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {statut !== "RESOLU" ? (
            <Button size="sm" variant="secondary" disabled={enCours} onClick={() => statuer("RESOLU")}>Marquer résolue</Button>
          ) : (
            <Button size="sm" variant="secondary" disabled={enCours} onClick={() => statuer("OUVERT")}>Rouvrir</Button>
          )}
          {statut === "OUVERT" && <Button size="sm" variant="ghost" disabled={enCours} onClick={() => statuer("EN_COURS")}>Prendre en charge</Button>}
        </div>
        <Button size="sm" loading={enCours} disabled={!texte.trim()} onClick={envoyer}>Envoyer</Button>
      </div>
      <p className="text-[11px] text-text-faint">L&apos;auteur est prévenu dans EduCom (cloche et notification) et lit la réponse dans « Aide ».</p>
    </div>
  );
}
