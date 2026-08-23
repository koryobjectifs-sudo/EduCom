"use client";

import { useState } from "react";
import { Loader2, Check, TriangleAlert, CalendarRange } from "lucide-react";
import { setTermDates } from "@/app/dashboard/grades/actions";

/**
 * **Le calendrier d'un trimestre** — la porte d'entrée qui manquait à
 * `setTermDates()`.
 *
 * ⚠️ **Composant PARTAGÉ, extrait de `GradesClient.tsx` le 22 août 2026.** Il
 * est monté à deux endroits : la configuration historique
 * (`/dashboard/grades/bulletin`) et l'écran de configuration pédagogique
 * (`/dashboard/settings/pedagogie`). Le recopier aurait produit deux champs de
 * dates aux validations divergentes sur la donnée qui décide du trimestre
 * courant de toute l'école.
 *
 * ═══ POURQUOI CE CHAMP N'EST PAS UN DÉTAIL ═══
 *
 * L'action serveur existait, complète et sécurisée, mais n'était appelée depuis
 * AUCUN écran : seule une écriture directe en base pouvait dater un trimestre.
 * Or c'est la date qui décide quel trimestre EduCom ouvre par défaut —
 * `pickCurrentTerm()` ne peut désigner comme « courant » qu'un trimestre déjà
 * commencé, ce qui exige une `startDate`. Sans dates, elle retombe sur le
 * dernier trimestre de la liste, et l'enseignant atterrit en juin alors qu'on
 * est en octobre.
 *
 * ⚠️ **Aucune date par défaut.** Le calendrier scolaire est propre à chaque
 * établissement — rentrée, congés, compositions. En proposer un serait inventer
 * celui de l'école, et cette invention orienterait ensuite la saisie des notes
 * vers la mauvaise période. Les champs restent donc vides jusqu'à ce que l'école
 * les remplisse, et l'écran dit ce que ce vide coûte.
 *
 * ⚠️ **Aucun `useEffect` de resynchronisation sur les props.** C'est le piège
 * déjà payé dans `FastEntry` : après chaque `router.refresh()`, un tel effet
 * repartirait et écraserait la saisie en cours. L'état local fait foi ; le
 * rafraîchissement ne sert qu'à remettre le reste de l'écran d'accord.
 */
export default function TermDates({ term, onSaved }: { term: any; onSaved: () => void }) {
  /** `Date` ou chaîne ISO → `YYYY-MM-DD`, le seul format qu'accepte `<input type="date">`. */
  const toInput = (v: unknown): string => {
    if (!v) return "";
    const d = v instanceof Date ? v : new Date(String(v));
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  const [start, setStart] = useState(() => toInput(term.startDate));
  const [end, setEnd] = useState(() => toInput(term.endDate));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const commit = async (nextStart: string, nextEnd: string) => {
    setState("saving");
    setError(null);
    // `""` signifie « pas de date », pas « date vide » : l'action attend `null`.
    const res = await setTermDates(term.id, nextStart || null, nextEnd || null);
    if (res?.error) {
      setState("error");
      setError(res.error);
      return;
    }
    setState("saved");
    onSaved();
  };

  const onChange = (champ: "start" | "end", valeur: string) => {
    const nextStart = champ === "start" ? valeur : start;
    const nextEnd = champ === "end" ? valeur : end;
    if (champ === "start") setStart(valeur); else setEnd(valeur);
    // Un `<input type="date">` n'émet qu'une date complète ou une chaîne vide :
    // il n'y a pas d'état intermédiaire à filtrer, on peut enregistrer aussitôt.
    void commit(nextStart, nextEnd);
  };

  const FIELD =
    "border border-gray-200 rounded-lg px-2 py-1 text-[13px] text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-colors";

  const sansDates = !start && !end;

  return (
    <div className="px-3 py-2.5 border-b border-gray-100 bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <CalendarRange className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />

        {/* ⚠️ Chaque libellé est SOLIDAIRE de son champ. Dans une colonne au
            tiers de la largeur, un `flex-wrap` à plat cassait la ligne entre
            « au » et sa date : le mot restait orphelin en fin de ligne et la
            paire ne se lisait plus comme une paire. */}
        <span className="inline-flex items-center gap-1.5">
          <label className="text-[13px] text-gray-500" htmlFor={`debut-${term.id}`}>Du</label>
          <input
            id={`debut-${term.id}`}
            type="date"
            value={start}
            onChange={(e) => onChange("start", e.target.value)}
            className={FIELD}
          />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <label className="text-[13px] text-gray-500" htmlFor={`fin-${term.id}`}>au</label>
          <input
            id={`fin-${term.id}`}
            type="date"
            value={end}
            onChange={(e) => onChange("end", e.target.value)}
            className={FIELD}
          />
        </span>

        <span className="ml-auto text-[12px]" aria-live="polite">
          {state === "saving" && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Enregistrement
            </span>
          )}
          {state === "saved" && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Check className="w-3 h-3" aria-hidden="true" /> Enregistré
            </span>
          )}
          {state === "error" && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <TriangleAlert className="w-3 h-3" aria-hidden="true" /> Non enregistré
            </span>
          )}
        </span>
      </div>

      {/* Ce que le vide coûte, dit sans dramatiser : ce n'est pas une erreur. */}
      {sansDates && state !== "error" && (
        <p className="mt-1.5 pl-5 text-[12px] text-gray-400">
          Sans dates, ce trimestre ne peut pas être choisi comme trimestre courant.
        </p>
      )}
      {error && <p className="mt-1.5 pl-5 text-[12px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
