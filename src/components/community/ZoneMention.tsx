"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Users } from "lucide-react";
import { Avatar } from "./Elements";

/**
 * Zone de texte avec @mentions — 26 sept. 2026.
 * Taper « @ » puis quelques lettres propose des personnes ; la personne
 * choisie est prévenue (cloche + notification) si elle voit la publication —
 * vérifié côté serveur, jamais sur la seule foi du navigateur.
 */
export type Mentionnable = { id: string; nom: string; detail: string; groupe?: boolean };

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
  personnes: Mentionnable[];
  onMention: (id: string) => void;
  /** Liste des personnes au-dessus de la zone (composeur collé en bas, façon Slack). */
  versLeHaut?: boolean;
};

const JETON = /(^|\s)@([\p{L}\p{N}'-]{0,30})$/u;

const normaliser = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const ZoneMention = forwardRef<HTMLTextAreaElement, Props>(function ZoneMention(
  { value, onValueChange, personnes, onMention, onKeyDown, versLeHaut = false, ...reste },
  ref,
) {
  const zone = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => zone.current as HTMLTextAreaElement);
  const [requete, setRequete] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const trouves =
    requete === null
      ? []
      : personnes.filter((p) => normaliser(`${p.nom} ${p.detail}`).includes(normaliser(requete))).slice(0, 6);

  const analyser = (texte: string, curseur: number) => {
    const m = texte.slice(0, curseur).match(JETON);
    setRequete(m ? m[2] : null);
    setIndex(0);
  };

  const choisir = (p: Mentionnable) => {
    const el = zone.current;
    if (!el) return;
    const curseur = el.selectionStart ?? value.length;
    const avant = value.slice(0, curseur).replace(JETON, (_t, espace: string) => `${espace}@${p.nom} `);
    const suivant = avant + value.slice(curseur);
    onValueChange(suivant);
    onMention(p.id);
    setRequete(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(avant.length, avant.length);
    });
  };

  return (
    <div className="relative min-w-0 flex-1">
      <textarea
        {...reste}
        ref={zone}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          analyser(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (trouves.length) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              return setIndex((i) => (i + 1) % trouves.length);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              return setIndex((i) => (i - 1 + trouves.length) % trouves.length);
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              return choisir(trouves[index]);
            }
            if (e.key === "Escape") return setRequete(null);
          }
          onKeyDown?.(e);
        }}
        onBlur={() => setTimeout(() => setRequete(null), 150)}
      />
      {trouves.length > 0 && (
        <ul role="listbox" className={`absolute left-0 z-30 w-72 ${versLeHaut ? "bottom-full mb-1" : "top-full mt-1"} max-w-full overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-overlay`}>
          {trouves.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choisir(p);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${i === index ? "bg-primary-ink/10" : "hover:bg-sunk"}`}
              >
                {p.groupe ? (
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-ink/10 text-primary-ink">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <Avatar nom={p.nom} taille="sm" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text">{p.groupe ? `@${p.nom}` : p.nom}</span>
                  <span className="block truncate text-xs text-text-soft">{p.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default ZoneMention;

/** Met en valeur les « @Prénom Nom » d'un texte (affichage). */
export function TexteAvecMentions({ texte, noms }: { texte: string; noms: string[] }) {
  if (!noms.length || !texte.includes("@")) return <>{texte}</>;
  const tries = [...noms].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(${tries.join("|")})`, "g");
  const morceaux: React.ReactNode[] = [];
  let dernier = 0;
  for (const m of texte.matchAll(re)) {
    if (m.index! > dernier) morceaux.push(texte.slice(dernier, m.index));
    morceaux.push(
      <span key={m.index} className="rounded bg-primary-ink/10 px-0.5 font-semibold text-primary-ink">
        {m[0]}
      </span>,
    );
    dernier = m.index! + m[0].length;
  }
  morceaux.push(texte.slice(dernier));
  return <>{morceaux}</>;
}
