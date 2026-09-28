"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ajouterMessage, marquerLuEcole } from "./actions";

export default function RepondreEcole({ ticketId, resolu }: { ticketId: string; resolu: boolean }) {
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const router = useRouter();
  useEffect(() => {
    marquerLuEcole(ticketId);
  }, [ticketId]);
  return (
    <div className="space-y-2">
      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder={resolu ? "Ce n'est pas réglé ? Écrivez ici, la demande sera rouverte." : "Ajouter un message…"} className="w-full rounded-lg border border-rule bg-surface p-2.5 text-role-body" />
      {erreur && <p className="text-role-meta text-danger">{erreur}</p>}
      <div className="flex justify-end">
        <Button
          loading={enCours}
          disabled={!texte.trim()}
          onClick={() =>
            demarrer(async () => {
              const r = await ajouterMessage(ticketId, texte);
              if (!r.ok) return setErreur(r.error);
              setTexte("");
              setErreur("");
              router.refresh();
            })
          }
        >
          Envoyer
        </Button>
      </div>
    </div>
  );
}
