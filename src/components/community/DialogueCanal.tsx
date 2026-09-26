"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hash, Lock, X } from "lucide-react";
import SelecteurAudience from "./SelecteurAudience";
import type { PersonneVue } from "@/lib/community";
import { creerCanal, modifierCanal, archiverCanal } from "@/app/dashboard/communications/communaute/actions";

/**
 * Créer / modifier un canal — 26 sept. 2026.
 * Qui fait partie du canal se choisit « à la @ » : des groupes
 * (@tous-les-parents, @parents-CM2, @profs-CM2, @enseignants…) et des personnes.
 * Rien de choisi = canal privé (vous et la direction) : aucun canal n'est
 * public par erreur. Règles appliquées côté serveur (`lib/audience.ts`).
 */
const MODELES: { name: string; description: string; regles: string[]; membersCanPost: boolean }[] = [
  { name: "comite-de-gestion", description: "Le comité de gestion de l'école.", regles: [], membersCanPost: true },
  { name: "ape", description: "L'association des parents d'élèves.", regles: [], membersCanPost: true },
  { name: "salle-des-profs", description: "Les échanges de l'équipe pédagogique.", regles: ["ROLE:TEACHER", "ROLE:ADMIN"], membersCanPost: true },
  { name: "sorties-et-evenements", description: "Kermesse, sorties, fêtes de l'école.", regles: ["PARENTS", "PERSONNEL"], membersCanPost: false },
  { name: "cantine", description: "Menus et informations de la cantine.", regles: ["PARENTS", "PERSONNEL"], membersCanPost: false },
];

export type CanalEdite = {
  id: string;
  name: string;
  description: string | null;
  regles: string[];
  membersCanPost: boolean;
  memberIds: string[];
};

export default function DialogueCanal({
  baseHref,
  invitables,
  classes,
  canal,
  fermer,
}: {
  baseHref: string;
  invitables: PersonneVue[];
  classes: { id: string; nom: string }[];
  canal?: CanalEdite;
  fermer: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(canal?.name ?? "");
  const [description, setDescription] = useState(canal?.description ?? "");
  const [regles, setRegles] = useState<string[]>(canal?.regles ?? []);
  const [membersCanPost, setMembersCanPost] = useState(canal?.membersCanPost ?? false);
  const [membres, setMembres] = useState<string[]>(canal?.memberIds ?? []);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const appliquerModele = (m: (typeof MODELES)[number]) => {
    setName(m.name);
    setDescription(m.description);
    setRegles(m.regles);
    setMembersCanPost(m.membersCanPost);
  };

  const valider = () =>
    demarrer(async () => {
      setErreur(null);
      const donnees = { name, description, regles, membersCanPost, memberIds: membres };
      if (canal) {
        const r = await modifierCanal(canal.id, donnees);
        if (!r.ok) return setErreur(r.error);
        fermer();
        router.refresh();
      } else {
        const r = await creerCanal(donnees);
        if (!r.ok) return setErreur(r.error);
        fermer();
        router.push(`${baseHref}?espace=${encodeURIComponent(r.espace)}`);
      }
    });

  const archiver = () => {
    if (!canal || !window.confirm(`Archiver #${canal.name} ? Il disparaîtra de la liste des canaux ; rien n'est effacé.`)) return;
    demarrer(async () => {
      const r = await archiverCanal(canal.id);
      if (!r.ok) return setErreur(r.error);
      fermer();
      router.push(baseHref);
    });
  };

  const apercuNom = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-");
  const parentsInclus = regles.some((r) => r === "PARENTS" || r.startsWith("PARENTS_CLASSE:"));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-canal" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-overlay sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <h2 id="titre-canal" className="text-lg font-bold text-text">
              {canal ? "Modifier le canal" : "Créer un canal"}
            </h2>
            <p className="text-sm text-text-soft">Un espace de discussion autour d&apos;un sujet.</p>
          </div>
          <button type="button" onClick={fermer} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full text-text-soft hover:bg-sunk">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!canal && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-faint">Partir d&apos;un modèle</p>
              <div className="flex flex-wrap gap-1.5">
                {MODELES.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => appliquerModele(m)}
                    className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ring-1 transition-colors ${
                      name === m.name ? "bg-primary-ink/10 text-primary-ink ring-primary-ink/30" : "text-text-soft ring-rule hover:bg-sunk"
                    }`}
                  >
                    <Hash aria-hidden="true" className="h-3 w-3" />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="canal-nom" className="mb-1.5 block text-sm font-semibold text-text">
              Nom
            </label>
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-rule px-3 focus-within:border-primary-ink/50 focus-within:ring-2 focus-within:ring-primary-ink/15">
              <Hash aria-hidden="true" className="h-4 w-4 text-text-faint" />
              <input
                id="canal-nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="par exemple : comite-de-gestion"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-text focus:outline-none focus:ring-0"
              />
            </div>
            {apercuNom && apercuNom !== name && <p className="mt-1 text-xs text-text-faint">Sera enregistré : #{apercuNom}</p>}
          </div>

          <div>
            <label htmlFor="canal-desc" className="mb-1.5 block text-sm font-semibold text-text">
              Description <span className="font-normal text-text-faint">(facultatif)</span>
            </label>
            <input
              id="canal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="À quoi sert ce canal ?"
              className="min-h-11 w-full rounded-xl border border-rule px-3 text-[15px] text-text focus:border-primary-ink/50 focus:outline-none focus:ring-2 focus:ring-primary-ink/15"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-text">Qui fait partie du canal ?</p>
            <SelecteurAudience classes={classes} personnes={invitables} regles={regles} setRegles={setRegles} membres={membres} setMembres={setMembres} />
            <p className="mt-2 flex items-start gap-1.5 text-xs text-text-soft">
              <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {regles.length + membres.length === 0
                ? "Personne n'est ajouté : le canal reste privé (vous et la direction)."
                : "Seules ces personnes voient le canal, plus vous et la direction. Les nouveaux inscrits d'une classe y entrent tout seuls."}
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule px-3 py-3">
            <input
              type="checkbox"
              checked={membersCanPost}
              onChange={(e) => setMembersCanPost(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-rule accent-[var(--color-primary-ink)]"
            />
            <span>
              <span className="block text-sm font-semibold text-text">Tout le monde peut publier</span>
              <span className="block text-xs text-text-soft">
                Sinon, seuls la direction et le secrétariat publient ; les autres réagissent et répondent.
                {parentsInclus && membersCanPost && " Attention : les parents du canal pourront écrire à tous ses membres."}
              </span>
            </span>
          </label>

          {erreur && (
            <p role="alert" className="text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-rule px-5 py-3">
          {canal && (
            <button type="button" onClick={archiver} disabled={enCours} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger/10">
              Archiver
            </button>
          )}
          <button type="button" onClick={fermer} className="ml-auto min-h-10 rounded-lg px-4 text-sm font-semibold text-text-soft hover:bg-sunk">
            Annuler
          </button>
          <button
            type="button"
            onClick={valider}
            disabled={enCours || apercuNom.length < 2}
            className="min-h-10 rounded-lg bg-primary-ink px-5 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
          >
            {enCours ? "Enregistrement…" : canal ? "Enregistrer" : "Créer le canal"}
          </button>
        </footer>
      </div>
    </div>
  );
}
