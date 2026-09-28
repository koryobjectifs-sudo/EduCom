"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Hash, Lock, Briefcase, Users, Plus, Newspaper, BarChart3, ChevronDown } from "lucide-react";
import type { BarreLaterale, EspaceVue } from "@/lib/community";
import type { ConversationResume } from "@/lib/messagerie";
import { initiales, teinte } from "./outils";
import SlackTooltip from "@/components/ui/SlackTooltip";

/**
 * Entrées de la Communauté dans LA barre contextuelle du logiciel
 * (26 sept. 2026). Mêmes classes que `ContextualSidebar` (titres de section en
 * petites capitales grises, liens `text-xs`, élément actif blanc avec filet à
 * gauche) : aucune nouvelle barre, seulement de nouvelles entrées.
 */
type Props = {
  baseHref: string;
  famille: boolean;
  barre: BarreLaterale;
  conversations: ConversationResume[];
  actifCle: string | null;
  discussionId: string | null;
  peutOuvrirDiscussion: boolean;
  formsARemplir: number;
  ouvrirCanal: () => void;
  ouvrirDiscussion: () => void;
  replie: boolean;
  apresClic?: () => void;
};

const ACTIF =
  "bg-[var(--color-sidebar-active,white)] font-semibold text-slate-900 shadow-2xs border-l-2 border-[var(--color-frame-bg,#581C87)]";
const INACTIF = "font-medium text-slate-700 hover:bg-black/5 hover:text-slate-900";

function IconeEspace({ e, actif }: { e: Pick<EspaceVue, "type" | "kind">; actif: boolean }) {
  const Icone = e.type === "CLASSE" ? Users : e.kind === "MEMBRES" ? Lock : e.kind === "PERSONNEL" ? Briefcase : Hash;
  return (
    <Icone
      aria-hidden="true"
      strokeWidth={actif ? 2.2 : 1.8}
      className={`h-3.5 w-3.5 shrink-0 ${actif ? "text-[var(--color-frame-bg,#581C87)]" : "text-slate-500 group-hover:text-slate-800"}`}
    />
  );
}

function Entree({
  href,
  actif,
  icone,
  libelle,
  nonLus = 0,
  replie,
  apresClic,
}: {
  href: string;
  actif: boolean;
  icone: React.ReactNode;
  libelle: string;
  nonLus?: number;
  replie: boolean;
  apresClic?: () => void;
}) {
  if (replie) {
    return (
      <SlackTooltip title={libelle} tip={nonLus > 0 ? `${nonLus} non lu(s)` : undefined} placement="right">
        <Link
          href={href}
          onClick={apresClic}
          aria-label={libelle}
          aria-current={actif ? "page" : undefined}
          className={`group relative mx-auto flex h-8.5 w-8.5 items-center justify-center rounded-control transition-colors ${
            actif ? "bg-[var(--color-sidebar-active,white)] text-slate-900 shadow-2xs" : "text-slate-600 hover:bg-black/5"
          }`}
        >
          {icone}
          {nonLus > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />}
        </Link>
      </SlackTooltip>
    );
  }
  return (
    <Link
      href={href}
      onClick={apresClic}
      aria-current={actif ? "page" : undefined}
      className={`group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        actif ? ACTIF : nonLus ? "font-bold text-slate-900 hover:bg-black/5" : INACTIF
      }`}
    >
      {icone}
      <span className="min-w-0 flex-1 truncate">{libelle}</span>
      {nonLus > 0 && (
        <span className="ml-auto flex h-4 min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold tabular-nums text-white">
          {nonLus > 99 ? "99+" : nonLus}
        </span>
      )}
    </Link>
  );
}

function Titre({
  texte,
  ajouter,
  ajouterLibelle,
  replie,
  ouvert,
  basculer,
}: {
  texte: string;
  ajouter?: () => void;
  ajouterLibelle?: string;
  replie: boolean;
  ouvert?: boolean;
  basculer?: () => void;
}) {
  if (replie) return <div className="mx-auto my-1 h-px w-6 bg-slate-200" aria-hidden="true" />;
  return (
    <div className="flex items-center justify-between px-2 pb-0.5">
      {basculer ? (
        <button
          type="button"
          onClick={basculer}
          aria-expanded={ouvert}
          className="group flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700"
        >
          <ChevronDown aria-hidden="true" className={`h-3 w-3 transition-transform ${ouvert ? "" : "-rotate-90"}`} />
          {texte}
        </button>
      ) : (
        <h3 className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{texte}</h3>
      )}
      {ajouter && (
        <SlackTooltip title={ajouterLibelle} placement="top">
          <button
            type="button"
            onClick={ajouter}
            aria-label={ajouterLibelle}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-black/5 hover:text-slate-800 cursor-pointer"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </SlackTooltip>
      )}
    </div>
  );
}

/** Sections repliables (Canaux, Classes, Messages directs), mémorisées sur l'appareil. */
const CLE_REPLI = "educom:communaute:sections-repliees";
function useSectionsRepliees() {
  const [repliees, setRepliees] = useState<string[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(CLE_REPLI) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage local après montage
      if (Array.isArray(v)) setRepliees(v.filter((x) => typeof x === "string"));
    } catch {}
  }, []);
  const basculer = (id: string) =>
    setRepliees((prev) => {
      const suivant = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(CLE_REPLI, JSON.stringify(suivant));
      } catch {}
      return suivant;
    });
  return { ouvert: (id: string) => !repliees.includes(id), basculer };
}

function MiniAvatar({ nom, avatar }: { nom: string; avatar?: string | null }) {
  const [erreur, setErreur] = useState(false);
  if (avatar && !erreur) {
    return (
      <img
        src={avatar}
        alt=""
        aria-hidden="true"
        className="h-4 w-4 shrink-0 rounded-full object-cover"
        onError={() => setErreur(true)}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7.5px] font-bold ${teinte(nom)}`}>
      {initiales(nom)}
    </span>
  );
}

export default function BarreCommunaute({
  baseHref,
  famille,
  barre,
  conversations,
  actifCle,
  discussionId,
  peutOuvrirDiscussion,
  formsARemplir,
  ouvrirCanal,
  ouvrirDiscussion,
  replie,
  apresClic,
}: Props) {
  const href = (cle: string) => `${baseHref}?espace=${encodeURIComponent(cle)}`;
  const icone = (Ic: typeof Hash, actif: boolean) => (
    <Ic
      aria-hidden="true"
      strokeWidth={actif ? 2.2 : 1.8}
      className={`h-3.5 w-3.5 shrink-0 ${actif ? "text-[var(--color-frame-bg,#581C87)]" : "text-slate-500 group-hover:text-slate-800"}`}
    />
  );
  const canaux = [barre.general, ...barre.canaux];
  const sections = useSectionsRepliees();
  // Barre repliée (icônes seules) : tout reste visible.
  const vu = (id: string) => replie || sections.ouvert(id);

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Titre texte="Communauté" replie={replie} />
        <Entree href={baseHref} actif={actifCle === ""} icone={icone(Newspaper, actifCle === "")} libelle="Fil d'actualité" replie={replie} apresClic={apresClic} />
        <Entree
          href={`${baseHref}?espace=${famille && formsARemplir > 0 ? "FORMULAIRES" : "SONDAGES"}`}
          actif={actifCle === "SONDAGES" || actifCle === "FORMULAIRES" || actifCle === "RESULTATS"}
          icone={icone(BarChart3, actifCle === "SONDAGES" || actifCle === "FORMULAIRES" || actifCle === "RESULTATS")}
          libelle="Enquêtes"
          nonLus={formsARemplir}
          replie={replie}
          apresClic={apresClic}
        />
      </div>

      <div data-tour="comms-channels-list" className="space-y-0.5">
        <Titre
          texte="Canaux"
          ajouter={barre.gererCanaux ? ouvrirCanal : undefined}
          ajouterLibelle="Créer un canal"
          replie={replie}
          ouvert={vu("canaux")}
          basculer={() => sections.basculer("canaux")}
        />
        {vu("canaux") && canaux.map((e) => (
          <Entree
            key={e.cle}
            href={href(e.cle)}
            actif={actifCle === e.cle}
            icone={<IconeEspace e={e} actif={actifCle === e.cle} />}
            libelle={e.nom}
            nonLus={e.nonLus}
            replie={replie}
            apresClic={apresClic}
          />
        ))}
        {barre.gererCanaux && !replie && vu("canaux") && (
          <button
            type="button"
            onClick={ouvrirCanal}
            className="group flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            Créer un canal
          </button>
        )}
      </div>

      {barre.classes.length > 0 && (
        <div className="space-y-0.5">
          <Titre
            texte={famille ? "Classes de mes enfants" : "Parents par classe"}
            replie={replie}
            ouvert={vu("classes")}
            basculer={() => sections.basculer("classes")}
          />
          {vu("classes") && barre.classes.map((e) => (
            <Entree
              key={e.cle}
              href={href(e.cle)}
              actif={actifCle === e.cle}
              icone={<IconeEspace e={e} actif={actifCle === e.cle} />}
              libelle={e.nom}
              nonLus={e.nonLus}
              replie={replie}
              apresClic={apresClic}
            />
          ))}
        </div>
      )}

      <div className="space-y-0.5">
        <Titre
          texte="Messages directs"
          ajouter={peutOuvrirDiscussion ? ouvrirDiscussion : undefined}
          ajouterLibelle="Nouveau message"
          replie={replie}
          ouvert={vu("messages")}
          basculer={() => sections.basculer("messages")}
        />
        {vu("messages") && conversations.map((c) => (
          <Entree
            key={c.id}
            href={`${baseHref}?c=${c.id}`}
            actif={discussionId === c.id}
            icone={<MiniAvatar nom={c.titre} avatar={c.avatar} />}
            libelle={c.titre}
            nonLus={c.nonLus}
            replie={replie}
            apresClic={apresClic}
          />
        ))}
        {conversations.length === 0 && !replie && vu("messages") && (
          <p className="px-2.5 py-1 text-[11px] leading-snug text-slate-400">
            {famille ? "Écrivez à l'enseignant, au secrétariat, à la comptabilité ou à la direction." : "Les messages des familles arriveront ici."}
          </p>
        )}
      </div>
    </div>
  );
}
