"use client";

import { useState, useTransition } from "react";
import { Sparkles, Copy, Check, X } from "lucide-react";
import { iaRediger, iaResumerSondage, iaAnalyserFormulaire, iaRecapEspace } from "@/app/dashboard/communications/communaute/ia-actions";

/**
 * Briques d'IA de la Communauté (26 sept. 2026) — personnel uniquement.
 * Si la clé n'est pas configurée, le bouton explique quoi faire au lieu d'échouer.
 */
type Etat = { texte: string | null; erreur: string | null };

function Encart({ etat, fermer, utiliser }: { etat: Etat; fermer: () => void; utiliser?: (t: string) => void }) {
  const [copie, setCopie] = useState(false);
  if (!etat.texte && !etat.erreur) return null;
  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-800">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Proposition de l&apos;IA — à relire
        </span>
        <button type="button" onClick={fermer} aria-label="Fermer" className="text-violet-700/60 hover:text-violet-900">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {etat.erreur ? (
        <p className="text-danger">{etat.erreur}</p>
      ) : (
        <>
          <p className="whitespace-pre-wrap leading-relaxed text-text">{etat.texte}</p>
          <div className="mt-2 flex gap-2">
            {utiliser && (
              <button type="button" onClick={() => utiliser(etat.texte!)} className="rounded-full bg-violet-700 px-3 py-1 text-xs font-bold text-white hover:bg-violet-800">
                Utiliser ce texte
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(etat.texte!);
                setCopie(true);
                setTimeout(() => setCopie(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-300 hover:bg-violet-100"
            >
              {copie ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
              {copie ? "Copié" : "Copier"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Aide à la rédaction dans « Votre publication ». */
export function AssistantRedaction({ texte, remplacer }: { texte: string; remplacer: (t: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [consigne, setConsigne] = useState("");
  const [etat, setEtat] = useState<Etat>({ texte: null, erreur: null });
  const [enCours, demarrer] = useTransition();
  const lancer = (mode: string) =>
    demarrer(async () => {
      setEtat({ texte: null, erreur: null });
      const r = await iaRediger(mode, texte, consigne);
      setEtat(r.ok ? { texte: r.texte, erreur: null } : { texte: null, erreur: r.error });
    });

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        title="Rédiger avec l'IA"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
      >
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> IA
      </button>
    );
  }
  const bouton = (mode: string, label: string) => (
    <button
      key={mode}
      type="button"
      disabled={enCours}
      onClick={() => lancer(mode)}
      className="rounded-full px-3 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50"
    >
      {label}
    </button>
  );
  return (
    <div className="w-full rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-violet-700" />
        <input
          value={consigne}
          onChange={(e) => setConsigne(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lancer("rediger");
            }
          }}
          maxLength={1000}
          placeholder="Ex. : rappel réunion de parents samedi 10 h, ton chaleureux"
          aria-label="Consigne pour l'IA"
          className="min-h-9 min-w-0 flex-1 rounded-lg border border-violet-200 bg-surface px-3 text-sm focus:border-violet-400 focus:outline-none"
        />
        <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer l'assistant" className="text-text-faint hover:text-text">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {bouton("rediger", enCours ? "…" : "Rédiger")}
        {texte.trim() && [
          bouton("ameliorer", "Améliorer"),
          bouton("raccourcir", "Raccourcir"),
          bouton("corriger", "Corriger les fautes"),
          bouton("formel", "Plus formel"),
        ]}
      </div>
      <Encart
        etat={etat}
        fermer={() => setEtat({ texte: null, erreur: null })}
        utiliser={(t) => {
          remplacer(t);
          setEtat({ texte: null, erreur: null });
          setOuvert(false);
        }}
      />
    </div>
  );
}

/** Bouton « ✨ Résumer / Analyser / Récap » + encart de résultat. */
export function BoutonAnalyseIA({ type, id, libelle }: { type: "sondage" | "formulaire" | "recap"; id: string; libelle: string }) {
  const [etat, setEtat] = useState<Etat>({ texte: null, erreur: null });
  const [enCours, demarrer] = useTransition();
  const lancer = () =>
    demarrer(async () => {
      setEtat({ texte: null, erreur: null });
      const r = type === "sondage" ? await iaResumerSondage(id) : type === "formulaire" ? await iaAnalyserFormulaire(id) : await iaRecapEspace(id);
      setEtat(r.ok ? { texte: r.texte, erreur: null } : { texte: null, erreur: r.error });
    });
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={lancer}
        disabled={enCours}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-60"
      >
        <Sparkles aria-hidden="true" className={`h-3.5 w-3.5 ${enCours ? "animate-pulse" : ""}`} />
        {enCours ? "L'IA réfléchit…" : libelle}
      </button>
      <Encart etat={etat} fermer={() => setEtat({ texte: null, erreur: null })} />
    </div>
  );
}
