"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, ClipboardList, Download, ArrowRight, Lock, Plus } from "lucide-react";
import type { TableauResultats, CarteFormulaire, CarteSondageResultat } from "@/lib/resultats";
import { lireChoix } from "@/lib/interpretation";
import { Anneau, Classement } from "./Interpretation";
import { ilYa, telechargerCSV, lignesSondage } from "./outils";
import { RelanceSondage } from "./FilPublications";

/**
 * Espace « Résultats » — 26 sept. 2026. Toutes les enquêtes (formulaires et
 * sondages) au même endroit, avec la lecture automatique de chacune.
 */
const TON = {
  positif: "border-l-success",
  neutre: "border-l-primary-ink",
  alerte: "border-l-danger",
} as const;

function Tuile({ titre, valeur, aide }: { titre: string; valeur: string; aide: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-faint">{titre}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-text">{valeur}</p>
      <p className="mt-0.5 text-xs text-text-soft">{aide}</p>
    </div>
  );
}

export default function EspaceResultats({ d, baseHref }: { d: TableauResultats; baseHref: string }) {
  const [filtre, setFiltre] = useState<"tout" | "formulaire" | "sondage" | "encours">("tout");
  const cartes = useMemo(
    () => d.cartes.filter((c) => filtre === "tout" || (filtre === "encours" ? !c.clos : c.type === filtre)),
    [d, filtre],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 py-4 sm:px-6 sm:py-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tuile titre="Enquêtes" valeur={String(d.totaux.enquetes)} aide="Formulaires et sondages" />
        <Tuile titre="En cours" valeur={String(d.totaux.enCours)} aide="Encore ouvertes aux réponses" />
        <Tuile titre="Réponses" valeur={String(d.totaux.reponses)} aide="Toutes enquêtes confondues" />
        <Tuile titre="Participation" valeur={d.totaux.tauxMoyen === null ? "—" : `${d.totaux.tauxMoyen} %`} aide="Moyenne par enquête" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["tout", "Tout"],
            ["encours", "En cours"],
            ["formulaire", "Formulaires"],
            ["sondage", "Sondages"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filtre === id}
            onClick={() => setFiltre(id)}
            className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold ${filtre === id ? "bg-primary-ink text-white" : "bg-surface text-text-soft ring-1 ring-rule hover:bg-sunk"}`}
          >
            {label}
          </button>
        ))}
        {d.peutCreer && (
        <Link
          href={`${baseHref}?form=nouveau`}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-ink px-4 text-[13px] font-bold text-white hover:bg-primary-ink-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Nouvelle enquête
        </Link>
        )}
      </div>

      {d.cartes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule bg-surface px-6 py-10 text-center">
          <p className="text-[15px] font-bold text-text">Aucune enquête pour l&apos;instant.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-soft">
            Lancez un sondage depuis le fil, ou choisissez un modèle (satisfaction, cantine, sortie…). Les résultats et leur lecture arriveront ici.
          </p>
        </div>
      ) : cartes.length === 0 ? (
        <p className="text-sm text-text-soft">Rien dans ce filtre.</p>
      ) : (
        <ul className="space-y-3">
          {cartes.map((c) => (
            <li key={`${c.type}-${c.id}`}>{c.type === "formulaire" ? <CarteForm c={c} baseHref={baseHref} /> : <CarteSondage c={c} baseHref={baseHref} />}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Entete({ type, titre, sous, clos }: { type: "formulaire" | "sondage"; titre: string; sous: string; clos: boolean }) {
  const Ic = type === "formulaire" ? ClipboardList : BarChart3;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-ink/10 text-primary-ink">
        <Ic aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-snug text-text">{titre}</p>
        <p className="text-xs text-text-soft">
          {type === "formulaire" ? "Formulaire" : "Sondage"} · {sous}
          {clos && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-sunk px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-soft">
              <Lock aria-hidden="true" className="h-2.5 w-2.5" /> Clos
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function CarteForm({ c, baseHref }: { c: CarteFormulaire; baseHref: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Entete type="formulaire" titre={c.titre} sous={`${c.auteur} · ${ilYa(c.date)}`} clos={c.clos} />
        <div className="flex items-center gap-4">
          <Anneau valeur={c.taux} taille={56} libelle={`${c.repondants}/${c.destinataires}`} sousLibelle="réponses" />
          {c.indice !== null && <Anneau valeur={c.indice} taille={56} libelle="Satisfaction" sousLibelle="indice sur 100" />}
        </div>
      </div>
      {c.constats.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {c.constats.map((k, i) => (
            <li key={i} className={`rounded-xl border border-l-4 border-rule ${TON[k.ton]} bg-sunk/30 px-3 py-2`}>
              <p className="text-[13px] font-bold text-text">{k.titre}</p>
              <p className="text-xs text-text-soft">{k.texte}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-text-soft">{c.repondants < 3 ? "Encore trop peu de réponses pour en tirer une tendance." : "Pas de tendance marquée."}</p>
      )}
      <Link href={`${baseHref}?form=${c.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-ink hover:underline">
        Voir l&apos;analyse complète <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CarteSondage({ c, baseHref }: { c: CarteSondageResultat; baseHref: string }) {
  const [noms, setNoms] = useState(false);
  const choix = useMemo(() => lireChoix(c.options, c.votants, c.multiple), [c]);
  const parLabel = useMemo(() => new Map(c.options.map((o) => [o.label, o.noms])), [c]);
  const aDesNoms = c.options.some((o) => o.noms && o.noms.length);
  return (
    <div className="rounded-2xl border border-rule bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Entete type="sondage" titre={c.question} sous={`#${c.espaceNom} · ${c.auteur} · ${ilYa(c.date)}`} clos={c.clos} />
        <Anneau
          valeur={c.taux}
          taille={56}
          libelle={c.destinataires ? `${c.votants}/${c.destinataires}` : `${c.votants}`}
          sousLibelle={c.destinataires ? "ont voté" : "votants"}
        />
      </div>
      <div className="mt-3">
        {c.votants === 0 ? <p className="text-xs text-text-soft">Aucun vote pour l&apos;instant.</p> : <Classement choix={choix} noms={noms ? parLabel : undefined} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Link href={`${baseHref}?espace=${encodeURIComponent(c.espace)}#pub-${c.postId}`} className="inline-flex items-center gap-1 font-semibold text-primary-ink hover:underline">
          Voir dans le fil <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
        {aDesNoms && (
          <button type="button" onClick={() => setNoms((v) => !v)} className="font-semibold text-text-soft hover:text-text">
            {noms ? "Masquer les noms" : "Voir qui a voté quoi"}
          </button>
        )}
        {c.votants > 0 && (
          <button
            type="button"
            onClick={() => telechargerCSV(`sondage ${c.question}`, lignesSondage(c))}
            className="inline-flex items-center gap-1 font-semibold text-text-soft hover:text-text"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" /> Exporter
          </button>
        )}
        {c.peutRelancer && <RelanceSondage id={c.id} />}
        {c.anonyme && <span className="text-text-faint">Vote anonyme</span>}
      </div>
    </div>
  );
}
