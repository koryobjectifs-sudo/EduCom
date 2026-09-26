"use client";

import { useMemo, useState } from "react";
import { Users, X, AtSign, GraduationCap, Briefcase } from "lucide-react";
import type { PersonneVue } from "@/lib/community";
import { Avatar } from "./Elements";

/**
 * Choix des destinataires « à la @ » — canaux et formulaires (26 sept. 2026).
 * Groupes (@tous-les-parents, @enseignants…), classes (@parents-CM2,
 * @profs-CM2) et personnes. Le serveur revérifie tout (`lib/audience.ts`).
 */
type Suggestion = { cle: string; libelle: string; aide: string; type: "groupe" | "classe" | "personne" };

const GROUPES: Suggestion[] = [
  { cle: "PARENTS", libelle: "@tous-les-parents", aide: "Tous les parents de l'école", type: "groupe" },
  { cle: "PERSONNEL", libelle: "@tout-le-personnel", aide: "Toute l'équipe de l'école", type: "groupe" },
  { cle: "ROLE:TEACHER", libelle: "@enseignants", aide: "Tous les enseignants", type: "groupe" },
  { cle: "ROLE:SECRETARY", libelle: "@secrétariat", aide: "Le secrétariat", type: "groupe" },
  { cle: "ROLE:ACCOUNTANT", libelle: "@comptabilité", aide: "La comptabilité", type: "groupe" },
  { cle: "ROLE:ADMIN", libelle: "@direction", aide: "La direction", type: "groupe" },
];

export default function SelecteurAudience({
  classes,
  personnes,
  regles,
  setRegles,
  membres,
  setMembres,
  sansGroupes = false,
}: {
  classes: { id: string; nom: string }[];
  personnes: PersonneVue[];
  regles: string[];
  setRegles: (f: (r: string[]) => string[]) => void;
  membres: string[];
  setMembres: (f: (m: string[]) => string[]) => void;
  /** Enseignant : pas de groupes d'école, seulement ses classes et des personnes. */
  sansGroupes?: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const suggestions = useMemo<Suggestion[]>(() => {
    const parClasse = classes.flatMap((c) => {
      const slug = c.nom.replace(/\s+/g, "-");
      return [
        { cle: `PARENTS_CLASSE:${c.id}`, libelle: `@parents-${slug}`, aide: `Les parents de la classe ${c.nom}`, type: "classe" as const },
        { cle: `PROFS_CLASSE:${c.id}`, libelle: `@profs-${slug}`, aide: `Les enseignants de la classe ${c.nom}`, type: "classe" as const },
      ];
    });
    const gens = personnes.map((p) => ({ cle: `U:${p.id}`, libelle: `@${p.nom}`, aide: p.detail, type: "personne" as const }));
    return [...(sansGroupes ? [] : GROUPES), ...parClasse, ...gens];
  }, [classes, personnes, sansGroupes]);
  const parCle = useMemo(() => new Map(suggestions.map((s) => [s.cle, s])), [suggestions]);

  const choisis = [...regles, ...membres.map((id) => `U:${id}`)];
  const q = recherche.trim().replace(/^@/, "").toLowerCase();
  const trouves = suggestions
    .filter((s) => !choisis.includes(s.cle))
    .filter((s) => !q || `${s.libelle} ${s.aide}`.toLowerCase().includes(q))
    .slice(0, q ? 40 : 14);

  const ajouter = (cle: string) => {
    if (cle.startsWith("U:")) setMembres((m) => [...new Set([...m, cle.slice(2)])]);
    else setRegles((r) => [...new Set([...r, cle])]);
    setRecherche("");
  };
  const retirer = (cle: string) => {
    if (cle.startsWith("U:")) setMembres((m) => m.filter((x) => x !== cle.slice(2)));
    else setRegles((r) => r.filter((x) => x !== cle));
  };

  const icone = (s: Suggestion) =>
    s.type === "personne" ? (
      <Avatar nom={s.libelle.slice(1)} taille="sm" />
    ) : s.type === "classe" ? (
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
        {s.cle.startsWith("PARENTS") ? <Users className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
      </span>
    ) : (
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-800">
        {s.cle === "PARENTS" ? <Users className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
      </span>
    );

  return (
    <>
      <div className="rounded-xl border border-rule p-2 focus-within:border-primary-ink/50 focus-within:ring-2 focus-within:ring-primary-ink/15">
        {choisis.length > 0 && (
          <ul className="mb-1.5 flex flex-wrap gap-1.5">
            {choisis.map((cle) => {
              const s = parCle.get(cle);
              return (
                <li key={cle} className="inline-flex items-center gap-1 rounded-full bg-primary-ink/10 py-0.5 pl-2 pr-1.5 text-xs font-semibold text-primary-ink">
                  {s?.libelle ?? "@membre"}
                  <button type="button" aria-label={`Retirer ${s?.libelle ?? ""}`} onClick={() => retirer(cle)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary-ink/15">
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center gap-2 px-1">
          <AtSign aria-hidden="true" className="h-4 w-4 text-text-faint" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trouves[0]) {
                e.preventDefault();
                ajouter(trouves[0].cle);
              }
            }}
            aria-label="Ajouter un groupe ou une personne"
            placeholder={sansGroupes ? "@parents-CM2, un nom…" : "@parents-CM2, @enseignants, un nom…"}
            className="min-h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-text focus:outline-none focus:ring-0"
          />
        </div>
      </div>
      <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-rule">
        {trouves.length === 0 && <li className="px-3 py-3 text-sm text-text-soft">Rien ne correspond.</li>}
        {trouves.map((s) => (
          <li key={s.cle} className="border-b border-rule last:border-0">
            <button type="button" onClick={() => ajouter(s.cle)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-sunk/70">
              {icone(s)}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">{s.libelle}</span>
                <span className="block truncate text-xs text-text-soft">{s.aide}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
