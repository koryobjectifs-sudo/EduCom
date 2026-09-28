"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { envoyerDemande } from "@/app/dashboard/aide/actions";

const TYPES = [
  { id: "QUESTION", nom: "Une question" },
  { id: "PROBLEME", nom: "Un problème" },
  { id: "CHANGEMENT", nom: "Un changement" },
];

/** Formulaire « Écrire à l'équipe EduCom » : la page ouverte est jointe automatiquement. */
export default function FormulaireAide({ onEnvoye, pageForcee }: { onEnvoye?: (id: string) => void; pageForcee?: string }) {
  const chemin = usePathname();
  const router = useRouter();
  const [kind, setKind] = useState("QUESTION");
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const page = pageForcee ?? chemin;
  const envoyer = () =>
    demarrer(async () => {
      const r = await envoyerDemande(kind, texte, page);
      if (!r.ok) return setErreur(r.error);
      setTexte("");
      setErreur("");
      if (onEnvoye) onEnvoye(r.id);
      else router.push(`/dashboard/aide?t=${r.id}`);
    });
  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 rounded-lg bg-sunk p-1">
        {TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => setKind(t.id)} aria-pressed={kind === t.id} className={`flex-1 rounded-md px-2 py-1.5 text-role-meta font-semibold ${kind === t.id ? "bg-surface text-primary shadow-card" : "text-text-soft"}`}>
            {t.nom}
          </button>
        ))}
      </div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={5}
        autoFocus
        placeholder={kind === "PROBLEME" ? "Que s'est-il passé ? Sur quel élève, quelle classe ?" : kind === "CHANGEMENT" ? "Que souhaitez-vous modifier ?" : "Votre question…"}
        className="w-full rounded-lg border border-rule bg-surface p-2.5 text-role-body text-text"
      />
      <p className="rounded-lg bg-sunk px-2.5 py-1.5 text-role-meta text-text-soft">Joint automatiquement : la page ouverte ({page}), votre compte et votre école.</p>
      {erreur && <p className="text-role-meta text-danger">{erreur}</p>}
      <div className="flex justify-end">
        <Button onClick={envoyer} loading={enCours} disabled={texte.trim().length < 5}>Envoyer à EduCom</Button>
      </div>
    </div>
  );
}
