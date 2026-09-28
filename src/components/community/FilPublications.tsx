"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import ZoneMention, { TexteAvecMentions, type Mentionnable } from "./ZoneMention";
import { AssistantRedaction, BoutonAnalyseIA } from "./IA";
import {
  Pin,
  BellRing,
  MessageSquare,
  MessageCircleOff,
  Share2,
  EyeOff,
  Eye,
  Trash2,
  Flag,
  CheckCircle2,
  Paperclip,
  SmilePlus,
  MinusCircle,
  PlusCircle,
  CornerDownRight,
  MoreHorizontal,
  Hash,
  FileText,
  BarChart3,
  X,
  Check,
  CheckSquare,
  CalendarClock,
  Download,
  Lightbulb,
} from "lucide-react";
import type { PublicationVue, SondageVue, TypeReaction } from "@/lib/community";
import type { EngagementPublication } from "@/lib/engagement";
import { voirEngagement } from "@/app/dashboard/communications/communaute/engagement-actions";
import { envoyerMedia, ACCEPT, type MediaEnvoye } from "./envoiMedia";
import { Avatar, GrilleMedias, ApercuPieces } from "./Elements";
import { ilYa, telechargerCSV, lignesSondage } from "./outils";
import SelecteurEmoji from "./SelecteurEmoji";
import { lireChoix } from "@/lib/interpretation";
import { IDEES_SONDAGES } from "@/lib/modelesEnquetes";
import {
  publier,
  reagir,
  commenter,
  marquerLu,
  epingler,
  masquerPublication,
  supprimerPublication,
  masquerCommentaire,
  signaler,
  voter,
  clore,
  relancerSondage,
} from "@/app/dashboard/communications/communaute/actions";
import SlackTooltip from "@/components/ui/SlackTooltip";

/**
 * Fil d'un espace — refonte du 26 sept. 2026, inspirée des fils de commentaires
 * (cartes bordées, « Répondre », réponses reliées par un filet) et adaptée à
 * EduCom. Les droits affichés ne sont qu'un confort : tout est revérifié côté
 * serveur (`lib/community.ts`).
 */

export const REACTIONS: { kind: TypeReaction; emoji: string; label: string }[] = [
  { kind: "JAIME", emoji: "👍", label: "J'aime" },
  { kind: "BRAVO", emoji: "👏", label: "Bravo" },
  { kind: "MERCI", emoji: "🙏", label: "Merci" },
  { kind: "COEUR", emoji: "❤️", label: "J'adore" },
];

export type Cible = { cle: string; nom: string; type: "ECOLE" | "CLASSE" | "CANAL" };

type Props = {
  publications: PublicationVue[];
  /** Espaces où l'on peut publier ; vide = pas de composeur. */
  cibles: Cible[];
  /** Espace affiché ("" = fil d'actualité). */
  espace: string;
  baseHref: string;
  moderateur: boolean;
  estParent: boolean;
  peutEpingler: boolean;
  vide: { titre: string; texte: string };
  /** Vue « Sondages » : le composeur s'ouvre directement sur un sondage. */
  sondageParDefaut?: boolean;
  /** Personnes que l'on peut mentionner (« @ »). */
  personnes?: Mentionnable[];
  /** Outils d'IA (personnel uniquement). */
  ia?: boolean;
  /** Non lus par espace (clé de `pub.espace`) : pastille dans le fil regroupé. */
  nonLusParEspace?: Record<string, number>;
};

/** Fil d'actualité regroupé : un aperçu de chaque canal, pas tout l'historique. */
const MAX_APERCU = 3;

/** Personnes mentionnables, partagées par le composeur, les réponses et l'affichage. */
export const Mentions = createContext<{ personnes: Mentionnable[]; noms: string[]; ia: boolean }>({ personnes: [], noms: [], ia: false });

/** Garde les mentions encore présentes dans le texte envoyé. */
export function mentionsDuTexte(texte: string, ids: string[], personnes: Mentionnable[]) {
  return [...new Set(ids)].filter((id) => {
    const p = personnes.find((x) => x.id === id);
    return p ? texte.includes(`@${p.nom}`) : false;
  });
}

export default function FilPublications({
  publications,
  cibles,
  espace,
  baseHref,
  moderateur,
  estParent,
  peutEpingler,
  vide,
  sondageParDefaut = false,
  personnes = [],
  ia = false,
  nonLusParEspace = {},
}: Props) {
  const mentions = useMemo(() => ({ personnes, noms: personnes.map((p) => p.nom), ia }), [personnes, ia]);
  const epinglees = publications.filter((p) => p.pinned);
  const autres = publications.filter((p) => !p.pinned);
  // Fil d'actualité (tous les espaces mélangés) : regroupé par canal/classe pour
  // éviter le mélange bruyant (retour de Kory, 27 sept. 2026). Un espace précis
  // (?espace=…) garde l'affichage plat d'origine.
  const parEspace = useMemo(() => {
    if (espace) return null;
    const carte = new Map<string, { nom: string; items: PublicationVue[] }>();
    for (const p of autres) {
      const g = carte.get(p.espace);
      if (g) g.items.push(p);
      else carte.set(p.espace, { nom: p.espaceNom, items: [p] });
    }
    return [...carte.entries()];
  }, [espace, autres]);
  return (
    <Mentions.Provider value={mentions}>
    <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      {cibles.length > 0 && (
        <Composeur key={`${espace}-${sondageParDefaut}`} cibles={cibles} espace={espace} peutEpingler={peutEpingler} sondageParDefaut={sondageParDefaut} />
      )}

      {publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule bg-surface px-6 py-10 text-center">
          <p className="text-[15px] font-bold text-text">{vide.titre}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-soft">{vide.texte}</p>
        </div>
      ) : parEspace ? (
        // Aperçu par canal/classe — pas tout l'historique : de quoi voir qu'il y a du
        // nouveau et repérer où, puis ouvrir le canal pour lire et répondre (retour
        // de Kory, 27 sept. 2026 : « ça n'a pas de sens de tout faire depuis le fil »).
        <>
          {epinglees.length > 0 && (
            <GroupeEspace titre="Épinglé" icone={<Pin aria-hidden="true" className="h-3.5 w-3.5" />} cle="" baseHref={baseHref} nonLus={0} reste={0}>
              {epinglees.slice(0, MAX_APERCU).map((p) => (
                <ApercuPublication key={p.id} pub={p} baseHref={baseHref} />
              ))}
            </GroupeEspace>
          )}
          {parEspace.map(([cle, g]) => (
            <GroupeEspace
              key={cle || "general"}
              titre={g.nom}
              icone={<Hash aria-hidden="true" className="h-3.5 w-3.5" />}
              cle={cle}
              baseHref={baseHref}
              nonLus={nonLusParEspace[cle] ?? 0}
              reste={Math.max(0, g.items.length - MAX_APERCU)}
            >
              {g.items.slice(0, MAX_APERCU).map((p) => (
                <ApercuPublication key={p.id} pub={p} baseHref={baseHref} />
              ))}
            </GroupeEspace>
          ))}
        </>
      ) : (
        <>
          {[...epinglees, ...autres].map((p) => (
            <CartePublication
              key={p.id}
              pub={p}
              moderateur={moderateur}
              estParent={estParent}
              peutEpingler={peutEpingler}
              afficherEspace={!espace}
              baseHref={baseHref}
            />
          ))}
        </>
      )}
    </div>
    </Mentions.Provider>
  );
}

/** Carte de groupe (« # Général », « Épinglé »…) : en-tête cliquable + aperçu, pas l'historique complet. */
function GroupeEspace({
  titre,
  icone,
  cle,
  baseHref,
  nonLus,
  reste,
  children,
}: {
  titre: string;
  icone: React.ReactNode;
  cle: string;
  baseHref: string;
  nonLus: number;
  reste: number;
  children: React.ReactNode;
}) {
  const href = `${baseHref}?espace=${encodeURIComponent(cle)}`;
  const enTete = (
    <>
      <span className="text-text-soft">{icone}</span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-text">{titre}</span>
      {nonLus > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold tabular-nums text-white">
          {nonLus > 99 ? "99+" : nonLus}
        </span>
      )}
      {cle && <span className="shrink-0 text-xs font-semibold text-primary-ink">Voir tout →</span>}
    </>
  );
  return (
    <section aria-label={titre} className="overflow-hidden rounded-2xl border border-rule bg-surface">
      {cle ? (
        <Link href={href} className="flex items-center gap-2 border-b border-rule px-4 py-3 hover:bg-sunk/50">
          {enTete}
        </Link>
      ) : (
        <div className="flex items-center gap-2 border-b border-rule px-4 py-3">{enTete}</div>
      )}
      <div className="divide-y divide-rule">{children}</div>
      {reste > 0 && (
        <Link href={href} className="block px-4 py-2.5 text-center text-xs font-semibold text-primary-ink hover:bg-sunk/50">
          + {reste} autre{reste > 1 ? "s" : ""} message{reste > 1 ? "s" : ""}
        </Link>
      )}
    </section>
  );
}

/** Aperçu compact d'une publication dans le fil regroupé : ouvre le canal pour lire et répondre. */
function ApercuPublication({ pub, baseHref }: { pub: PublicationVue; baseHref: string }) {
  const n = pub.commentaires.length;
  return (
    <Link href={`${baseHref}?espace=${encodeURIComponent(pub.espace)}#pub-${pub.id}`} className="flex gap-3 px-4 py-3 hover:bg-sunk/40">
      <Avatar nom={pub.auteur} avatar={pub.auteurAvatar} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-bold text-text">{pub.auteur}</span>
          <span className="text-xs text-text-faint">{ilYa(pub.createdAt)}</span>
          {pub.mustRead && <span className="text-xs font-semibold text-warning">À lire</span>}
        </p>
        <p className="mt-0.5 line-clamp-2 break-words text-sm text-text-soft">
          {pub.body || (pub.sondage ? `📊 ${pub.sondage.question}` : pub.medias.length > 0 ? "📎 Photo, vidéo ou document" : "")}
        </p>
        {n > 0 && <p className="mt-0.5 text-xs text-text-faint">{n} réponse{n > 1 ? "s" : ""}</p>}
      </div>
    </Link>
  );
}

/* ═══════════════════════ Composeur (« Votre publication ») ═══════════════════════ */

function Composeur({
  cibles,
  espace,
  peutEpingler,
  sondageParDefaut,
}: {
  cibles: Cible[];
  espace: string;
  peutEpingler: boolean;
  sondageParDefaut: boolean;
}) {
  const [sondage, setSondage] = useState<EditionSondage | null>(sondageParDefaut ? SONDAGE_VIDE : null);
  const { personnes, ia } = useContext(Mentions);
  const [mentions, setMentions] = useState<string[]>([]);
  const [cible, setCible] = useState(cibles.find((c) => c.cle === espace)?.cle ?? cibles[0].cle);
  const [texte, setTexte] = useState("");
  const [mustRead, setMustRead] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [commentaires, setCommentaires] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [medias, setMedias] = useState<MediaEnvoye[]>([]);
  const [envois, setEnvois] = useState(0);
  const [focus, setFocus] = useState(false);
  const choisie = cibles.find((c) => c.cle === cible) ?? cibles[0];
  const ouvert = focus || texte.length > 0 || medias.length > 0 || envois > 0 || sondage !== null;
  const sondagePret = sondage !== null && sondage.question.trim() !== "" && sondage.options.filter((o) => o.trim()).length >= 2;

  const ajouterFichiers = async (files: FileList | null) => {
    if (!files) return;
    setErreur(null);
    const liste = Array.from(files).slice(0, Math.max(0, 10 - medias.length));
    setEnvois((n) => n + liste.length);
    for (const f of liste) {
      try {
        const m = await envoyerMedia(f, "PUBLICATION");
        setMedias((prev) => [...prev, m]);
      } catch (e) {
        setErreur((e as Error).message);
      } finally {
        setEnvois((n) => n - 1);
      }
    }
  };

  const envoyer = () => {
    setErreur(null);
    demarrer(async () => {
      const r = await publier({
        mediaIds: medias.map((m) => m.mediaId),
        body: texte,
        espace: cible,
        mentions: mentionsDuTexte(texte, mentions, personnes),
        mustRead,
        pinned,
        commentsEnabled: commentaires,
        sondage: sondage
          ? {
              question: sondage.question,
              options: sondage.options,
              multiple: sondage.multiple,
              anonymous: sondage.anonyme,
              closesAt: sondage.fin ? new Date(`${sondage.fin}T23:59:00`).toISOString() : null,
            }
          : null,
      });
      if (r.ok) {
        setTexte("");
        setMentions([]);
        setSondage(sondageParDefaut ? SONDAGE_VIDE : null);
        setMustRead(false);
        setPinned(false);
        setMedias([]);
        setFocus(false);
      } else setErreur(r.error);
    });
  };

  const placeholder =
    choisie.type === "ECOLE"
      ? "Une annonce pour toutes les familles : rentrée, réunion, fermeture…"
      : choisie.type === "CLASSE"
        ? `Un mot pour la classe ${choisie.nom} : devoirs, sortie, photos…`
        : `Écrire dans #${choisie.nom}…`;

  return (
    <section
      aria-label="Nouvelle publication"
      className={`overflow-hidden rounded-2xl border-2 bg-surface transition-colors ${ouvert ? "border-primary-ink/45 shadow-card" : "border-primary-ink/20"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
        <p className="text-[15px] font-bold text-text">Votre publication</p>
        {cibles.length > 1 ? (
          <label className="flex items-center gap-1.5 text-xs text-text-soft">
            <span>dans</span>
            <select
              value={cible}
              onChange={(e) => setCible(e.target.value)}
              className="min-h-8 max-w-[210px] rounded-full border border-rule bg-sunk/60 px-3 text-xs font-semibold text-text"
            >
              {cibles.map((c) => (
                <option key={c.cle} value={c.cle}>
                  {c.type === "ECOLE" ? "# général (toute l'école)" : c.type === "CLASSE" ? `# ${c.nom} (classe)` : `# ${c.nom}`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2.5 py-1 text-xs font-semibold text-text-soft">
            <Hash aria-hidden="true" className="h-3 w-3" />
            {choisie.nom}
          </span>
        )}
      </div>

      <div className="px-4 pt-3">
        <label htmlFor="pub-texte" className="sr-only">
          Message
        </label>
        <ZoneMention
          id="pub-texte"
          value={texte}
          onValueChange={setTexte}
          personnes={personnes}
          onMention={(id) => setMentions((m) => [...m, id])}
          onFocus={() => setFocus(true)}
          rows={ouvert ? (sondage ? 2 : 4) : 1}
          maxLength={5000}
          placeholder={sondage ? "Un mot d'introduction (facultatif)…" : `${placeholder}  (@ pour mentionner)`}
          className="block w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
        />
        {ia && ouvert && (
          <div className="mt-2">
            <AssistantRedaction texte={texte} remplacer={setTexte} />
          </div>
        )}
        {sondage && <EditeurSondage valeur={sondage} changer={setSondage} fermer={() => setSondage(null)} />}
        <div className="mt-2">
          <ApercuPieces medias={medias} envois={envois} retirer={(id) => setMedias((p) => p.filter((x) => x.mediaId !== id))} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-3 pb-3 pt-2">
        <label
          title="Photo, vidéo ou PDF"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text"
        >
          <Paperclip aria-hidden="true" className="h-[18px] w-[18px]" />
          <span className="sr-only">Joindre une photo, une vidéo ou un PDF</span>
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              void ajouterFichiers(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <MenuModeles appliquer={(t) => { setTexte(t); setFocus(true); }} />
        <button
          type="button"
          title="Ajouter un sondage"
          aria-pressed={sondage !== null}
          onClick={() => setSondage((v) => (v ? null : SONDAGE_VIDE))}
          className={`flex h-9 w-9 items-center justify-center rounded-full ${sondage ? "bg-primary-ink/10 text-primary-ink" : "text-text-soft hover:bg-sunk hover:text-text"}`}
        >
          <BarChart3 aria-hidden="true" className="h-[18px] w-[18px]" />
          <span className="sr-only">Ajouter un sondage</span>
        </button>
        {ouvert && (
          <>
            <Bascule actif={mustRead} onChange={setMustRead} icone={<BellRing className="h-3.5 w-3.5" />} texte="À lire obligatoirement" />
            {peutEpingler && <Bascule actif={pinned} onChange={setPinned} icone={<Pin className="h-3.5 w-3.5" />} texte="Épingler" />}
            <Bascule
              actif={!commentaires}
              onChange={(v) => setCommentaires(!v)}
              icone={<MessageCircleOff className="h-3.5 w-3.5" />}
              texte="Sans réponses"
            />
          </>
        )}
        <button
          type="button"
          onClick={envoyer}
          disabled={enCours || envois > 0 || (sondage ? !sondagePret : !texte.trim() && medias.length === 0)}
          className="ml-auto inline-flex min-h-9 items-center rounded-full bg-primary-ink px-5 text-sm font-bold text-white transition-colors hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
        >
          {enCours ? "Publication…" : "Publier"}
        </button>
      </div>
      {erreur && (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </section>
  );
}

export function Bascule({ actif, onChange, icone, texte }: { actif: boolean; onChange: (v: boolean) => void; icone: React.ReactNode; texte: string }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={() => onChange(!actif)}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition-colors ${
        actif ? "bg-primary-ink/10 text-primary-ink ring-primary-ink/30" : "text-text-soft ring-rule hover:bg-sunk"
      }`}
    >
      {icone}
      {texte}
    </button>
  );
}

/* ═══════════════════════ Carte de publication ═══════════════════════ */

function CartePublication({
  pub,
  moderateur,
  estParent,
  peutEpingler,
  afficherEspace,
  baseHref,
}: {
  pub: PublicationVue;
  moderateur: boolean;
  estParent: boolean;
  peutEpingler: boolean;
  afficherEspace: boolean;
  baseHref: string;
}) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponsesOuvertes, setReponsesOuvertes] = useState(pub.commentaires.length > 0 && pub.commentaires.length <= 2);
  const [repondre, setRepondre] = useState(false);

  const agir = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    demarrer(async () => {
      setErreur(null);
      const r = await fn();
      if (!r.ok) setErreur(r.error ?? "Action impossible.");
    });

  const partager = () => {
    const extrait = pub.body.length > 220 ? `${pub.body.slice(0, 220)}…` : pub.body;
    const lien = `${window.location.origin}/famille/communaute?espace=${encodeURIComponent(pub.espace)}#pub-${pub.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${extrait}\n\nÀ lire sur EduCom : ${lien}`)}`, "_blank", "noopener");
  };

  const n = pub.commentaires.length;
  const actions: { label: string; icone: React.ReactNode; fn: () => void; danger?: boolean }[] = [
    ...(!pub.masque ? [{ label: "Partager sur WhatsApp", icone: <Share2 className="h-4 w-4" />, fn: partager }] : []),
    ...(peutEpingler && !pub.masque
      ? [{ label: pub.pinned ? "Désépingler" : "Épingler en haut", icone: <Pin className="h-4 w-4" />, fn: () => agir(() => epingler(pub.id, !pub.pinned)) }]
      : []),
    ...(moderateur
      ? [
          {
            label: pub.masque ? "Réafficher" : "Masquer (modération)",
            icone: pub.masque ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />,
            fn: () => agir(() => masquerPublication(pub.id, !pub.masque)),
          },
        ]
      : []),
    ...(pub.peutSupprimer && !moderateur
      ? [
          {
            label: "Supprimer",
            icone: <Trash2 className="h-4 w-4" />,
            danger: true,
            fn: () => {
              if (window.confirm("Supprimer définitivement cette publication ?")) agir(() => supprimerPublication(pub.id));
            },
          },
        ]
      : []),
    ...(!moderateur && !pub.peutSupprimer
      ? [
          {
            label: "Signaler à la direction",
            icone: <Flag className="h-4 w-4" />,
            fn: () => {
              const raison = window.prompt("Pourquoi signaler cette publication à la direction ?");
              if (raison !== null) agir(() => signaler({ postId: pub.id }, raison));
            },
          },
        ]
      : []),
  ];

  return (
    <article id={`pub-${pub.id}`} className="scroll-mt-24">
      <div
        className={`rounded-2xl border bg-surface ${
          pub.masque ? "border-danger/30 opacity-70" : pub.pinned ? "border-primary-ink/30 ring-1 ring-primary-ink/10" : "border-rule"
        }`}
      >
        <header className="flex items-start gap-3 px-4 pt-4 sm:px-5">
          <Avatar nom={pub.auteur} avatar={pub.auteurAvatar} taille="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
              <span className="font-bold text-text">{pub.auteur}</span>
              <span className="text-[13px] text-text-faint">• {ilYa(pub.createdAt)}</span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-soft">
              <span>{pub.role}</span>
              {afficherEspace && (
                <Link
                  href={`${baseHref}?espace=${encodeURIComponent(pub.espace)}`}
                  className="inline-flex items-center gap-0.5 rounded-md bg-sunk px-1.5 py-0.5 font-semibold text-text-soft hover:text-text"
                >
                  <Hash aria-hidden="true" className="h-3 w-3" />
                  {pub.espaceNom}
                </Link>
              )}
              {pub.pinned && (
                <span className="inline-flex items-center gap-1 font-semibold text-primary-ink">
                  <Pin aria-hidden="true" className="h-3 w-3" /> Épinglé
                </span>
              )}
              {pub.masque && <span className="font-semibold text-danger">Masqué par la direction</span>}
            </p>
          </div>
          {actions.length > 0 && <Menu actions={actions} />}
        </header>

        {pub.mustRead && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-warning/12 px-3 py-2 text-[13px] text-text sm:mx-5">
            <BellRing aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" />
            <span className="font-semibold">À lire obligatoirement</span>
            {pub.lecture && (
              <span className="text-text-soft">
                · lu par {pub.lecture.lus} sur {pub.lecture.destinataires} parent{pub.lecture.destinataires > 1 ? "s" : ""}
              </span>
            )}
            {estParent &&
              (pub.luParMoi ? (
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Lu, merci
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => agir(() => marquerLu(pub.id))}
                  disabled={enCours}
                  className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-full bg-primary-ink px-3 text-xs font-bold text-white"
                >
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> J&apos;ai lu
                </button>
              ))}
          </div>
        )}

        {pub.body && (
          <p className="whitespace-pre-wrap break-words px-4 pt-3 text-[15px] leading-relaxed text-text sm:px-5">
            <TexteAvecMentionsCtx texte={pub.body} />
          </p>
        )}
        {pub.medias.length > 0 && (
          <div className="px-4 pt-3 sm:px-5">
            <GrilleMedias medias={pub.medias} />
          </div>
        )}

        {pub.peutSupprimer && !estParent && <Engagement postId={pub.id} />}

        {pub.sondage && <CarteSondage s={pub.sondage} estParent={estParent} agir={agir} enCours={enCours} />}

        <Reactions pub={pub} enCours={enCours} agir={agir} />

        <footer className="mt-3 flex items-center justify-between gap-2 border-t border-rule px-4 py-2.5 sm:px-5">
          {pub.commentsEnabled && n > 0 ? (
            <button
              type="button"
              onClick={() => setReponsesOuvertes((v) => !v)}
              aria-expanded={reponsesOuvertes}
              className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold text-text-soft hover:text-text"
            >
              {reponsesOuvertes ? <MinusCircle aria-hidden="true" className="h-4 w-4" /> : <PlusCircle aria-hidden="true" className="h-4 w-4" />}
              {reponsesOuvertes ? "Masquer" : "Voir"} les réponses ({n})
            </button>
          ) : (
            <span className="text-[13px] text-text-faint">{pub.commentsEnabled ? "Aucune réponse pour l'instant" : "Réponses fermées"}</span>
          )}
          {pub.commentsEnabled && !pub.masque && (
            <button
              type="button"
              onClick={() => {
                setRepondre(true);
                setReponsesOuvertes(true);
              }}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-rule px-3.5 text-[13px] font-semibold text-text hover:bg-sunk"
            >
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
              Répondre
            </button>
          )}
        </footer>
      </div>

      {pub.commentsEnabled && (reponsesOuvertes || repondre) && (n > 0 || repondre) && (
        <div className="relative mt-3 space-y-3 pl-11 sm:pl-12">
          <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-0 w-px bg-rule sm:left-[21px]" />
          {reponsesOuvertes &&
            pub.commentaires.map((c) => (
              <div key={c.id} className="relative">
                <Noeud />
                <div className={`rounded-2xl border border-rule bg-surface px-4 py-3 ${c.masque ? "opacity-60" : ""}`}>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm">
                    <Avatar nom={c.auteur} avatar={c.auteurAvatar} taille="sm" />
                    <span className="font-bold text-text">{c.auteur}</span>
                    <span className="text-xs text-text-faint">
                      • {c.role} • {ilYa(c.createdAt)}
                    </span>
                    {c.masque && <span className="text-xs font-semibold text-danger">masqué</span>}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-text">
                    <TexteAvecMentionsCtx texte={c.body} />
                  </p>
                  <div className="mt-1.5 flex gap-3 text-xs font-semibold text-text-faint">
                    {(c.estAMoi || moderateur) && (
                      <button type="button" className="hover:text-danger" onClick={() => agir(() => masquerCommentaire(c.id, !c.masque))}>
                        {c.estAMoi ? "Supprimer" : c.masque ? "Réafficher" : "Masquer"}
                      </button>
                    )}
                    {!c.estAMoi && !moderateur && (
                      <button
                        type="button"
                        className="hover:text-text"
                        onClick={() => {
                          const raison = window.prompt("Pourquoi signaler cette réponse ?");
                          if (raison !== null) agir(() => signaler({ commentId: c.id }, raison));
                        }}
                      >
                        Signaler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          {repondre && !pub.masque && (
            <div className="relative">
              <Noeud />
              <Reponse postId={pub.id} fermer={() => setRepondre(false)} />
            </div>
          )}
        </div>
      )}

      {erreur && (
        <p role="alert" className="mt-2 px-1 text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </article>
  );
}

function Noeud() {
  return (
    <span
      aria-hidden="true"
      className="absolute -left-[38px] top-3 flex h-7 w-7 items-center justify-center rounded-full border border-rule bg-surface text-text-faint sm:-left-[41px]"
    >
      <CornerDownRight className="h-3.5 w-3.5" />
    </span>
  );
}

export function TexteAvecMentionsCtx({ texte }: { texte: string }) {
  const { noms } = useContext(Mentions);
  return <TexteAvecMentions texte={texte} noms={noms} />;
}

function Reponse({ postId, fermer }: { postId: string; fermer: () => void }) {
  const { personnes } = useContext(Mentions);
  const [mentions, setMentions] = useState<string[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const envoyer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await commenter(postId, texte, mentionsDuTexte(texte, mentions, personnes));
      if (r.ok) {
        setTexte("");
        fermer();
      } else setErreur(r.error);
    });

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary-ink/40 bg-surface">
      <p className="border-b border-rule px-4 py-2 text-sm font-bold text-text">Votre réponse</p>
      <div className="flex items-end gap-3 px-4 py-3">
        <label htmlFor={`rep-${postId}`} className="sr-only">
          Votre réponse
        </label>
        <ZoneMention
          id={`rep-${postId}`}
          ref={ref}
          value={texte}
          onValueChange={setTexte}
          personnes={personnes}
          onMention={(id) => setMentions((m) => [...m, id])}
          onKeyDown={(e) => {
            if (e.key === "Escape") fermer();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) envoyer();
          }}
          rows={2}
          maxLength={2000}
          placeholder="Qu'en pensez-vous ? (@ pour mentionner)"
          className="min-h-12 w-full resize-none border-0 bg-transparent p-0 text-[14.5px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={fermer} className="min-h-9 rounded-full px-3 text-sm font-semibold text-text-soft hover:bg-sunk">
            Annuler
          </button>
          <button
            type="button"
            onClick={envoyer}
            disabled={enCours || !texte.trim()}
            className="min-h-9 rounded-full bg-primary-ink px-4 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
          >
            {enCours ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>
      {erreur && (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Lecture automatique du sondage (personnel) : tendance en une phrase. */
function LectureSondage({ s }: { s: SondageVue }) {
  const l = lireChoix(s.options, s.votants, s.multiple);
  return <p className="mt-2.5 rounded-lg bg-sunk/70 px-3 py-2 text-[13px] text-text">💡 {l.phrase}</p>;
}

export function RelanceSondage({ id }: { id: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await relancerSondage(id);
          setMessage(r.ok ? (r.relances ? `${r.relances} relancé${r.relances > 1 ? "s" : ""}` : "Tout le monde a voté") : r.error);
        })
      }
      className="inline-flex items-center gap-1 font-semibold text-primary-ink hover:underline disabled:opacity-50"
    >
      <BellRing aria-hidden="true" className="h-3.5 w-3.5" /> {message ?? (enCours ? "Relance…" : "Relancer les non-votants")}
    </button>
  );
}

function IaSondage({ id }: { id: string }) {
  const { ia } = useContext(Mentions);
  if (!ia) return null;
  return (
    <div className="mt-2.5">
      <BoutonAnalyseIA type="sondage" id={id} libelle="Résumer avec l'IA" />
    </div>
  );
}

/* ═══════════════════════ Engagement ═══════════════════════ */

export function Engagement({ postId, serre = false, auto = false }: { postId: string; serre?: boolean; auto?: boolean }) {
  const [e, setE] = useState<EngagementPublication | null>(null);
  const [ouvert, setOuvert] = useState(auto);
  const [liste, setListe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const charger = () =>
    demarrer(async () => {
      setOuvert(true);
      const r = await voirEngagement(postId);
      if (r.ok) setE(r.e);
      else setErreur(r.error);
    });
  // Ouvert depuis la barre d'actions d'un canal : chargement immédiat.
  useEffect(() => {
    if (!auto) return;
    let actif = true;
    void voirEngagement(postId).then((r) => {
      if (!actif) return;
      if (r.ok) setE(r.e);
      else setErreur(r.error);
    });
    return () => {
      actif = false;
    };
  }, [auto, postId]);
  if (!ouvert) {
    return (
      <div className={serre ? "pt-1" : "px-4 pt-2 sm:px-5"}>
        <button type="button" onClick={charger} className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-soft hover:text-primary-ink">
          <Eye aria-hidden="true" className="h-3.5 w-3.5" /> Qui a vu ?
        </button>
      </div>
    );
  }
  const pct = e && e.destinataires ? Math.round((e.vus / e.destinataires) * 100) : 0;
  return (
    <div className={`${serre ? "mt-2 max-w-xl" : "mx-4 mt-3 sm:mx-5"} rounded-xl bg-sunk/60 px-3 py-2.5 text-xs text-text-soft`}>
      {enCours && !e && <span>Calcul…</span>}
      {erreur && <span className="text-danger">{erreur}</span>}
      {e && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-bold text-text">
              👁 Vu par {e.vus} sur {e.destinataires} ({pct} %)
            </span>
            {e.lus !== null && <span>✅ {e.lus} « J&apos;ai lu »</span>}
            {e.votants !== null && <span>📊 {e.votants} votants</span>}
            <span>{e.reactions} réactions</span>
            <span>{e.reponses} réponses</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
            <div className="h-full rounded-full bg-primary-ink" style={{ width: `${pct}%` }} />
          </div>
          {e.pasVus.length > 0 && (
            <button type="button" onClick={() => setListe((v) => !v)} className="mt-2 font-semibold text-primary-ink hover:underline">
              {liste ? "Masquer" : `Pas encore vu (${e.destinataires - e.vus})`}
            </button>
          )}
          {liste && <p className="mt-1 leading-relaxed">{e.pasVus.map((p) => `${p.nom} (${p.detail})`).join(", ")}</p>}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ Modèles de messages ═══════════════════════ */

/** Messages types (26 sept. 2026) : les [crochets] sont à compléter avant de publier. */
const MODELES_MESSAGE: { titre: string; texte: string }[] = [
  {
    titre: "Rentrée scolaire",
    texte: "Chers parents,\n\nLa rentrée aura lieu le [date] à [heure]. Merci de prévoir les fournitures demandées et de vérifier que le dossier de votre enfant est complet.\n\nNous nous réjouissons de retrouver vos enfants.\nLa direction",
  },
  {
    titre: "Réunion de parents",
    texte: "Chers parents,\n\nUne réunion de parents se tiendra le [date] à [heure], [lieu]. Nous y présenterons [sujet]. Votre présence est importante.\n\nMerci de confirmer votre venue en réagissant à ce message.",
  },
  {
    titre: "Fermeture exceptionnelle",
    texte: "Chers parents,\n\nL'école sera exceptionnellement fermée le [date] en raison de [motif]. Les cours reprendront normalement le [date de reprise].\n\nMerci de votre compréhension.",
  },
  {
    titre: "Sortie scolaire",
    texte: "Chers parents,\n\nLa classe [classe] participera à une sortie à [lieu] le [date]. Départ à [heure], retour prévu vers [heure]. Prévoir [goûter, casquette, tenue].\n\nMerci de remplir l'autorisation de sortie.",
  },
  {
    titre: "Bulletins disponibles",
    texte: "Chers parents,\n\nLes bulletins du [trimestre] sont disponibles dans votre espace EduCom. N'hésitez pas à écrire à l'enseignant de votre enfant pour toute question.",
  },
  {
    titre: "Absence d'un enseignant",
    texte: "Chers parents,\n\n[Enseignant] sera absent(e) le [date]. [Organisation prévue : remplacement / étude surveillée]. Merci de votre compréhension.",
  },
  {
    titre: "Félicitations",
    texte: "Bravo à [élève / classe] pour [réussite] ! 🎉 Toute l'école est fière de ce beau résultat.",
  },
];

export function MenuModeles({ appliquer }: { appliquer: (t: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title="Modèles de messages"
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text"
      >
        <FileText aria-hidden="true" className="h-[18px] w-[18px]" />
        <span className="sr-only">Modèles de messages</span>
      </button>
      {ouvert && (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOuvert(false)} />
          <ul className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-overlay">
            <li className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-faint">Modèles — à compléter</li>
            {MODELES_MESSAGE.map((m) => (
              <li key={m.titre}>
                <button
                  type="button"
                  onClick={() => {
                    appliquer(m.texte);
                    setOuvert(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-text hover:bg-sunk"
                >
                  {m.titre}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ Sondages ═══════════════════════ */

export type EditionSondage = { question: string; options: string[]; multiple: boolean; anonyme: boolean; fin: string };
export const SONDAGE_VIDE: EditionSondage = { question: "", options: ["", ""], multiple: false, anonyme: false, fin: "" };

export function EditeurSondage({ valeur, changer, fermer }: { valeur: EditionSondage; changer: (v: EditionSondage) => void; fermer: () => void }) {
  const maj = (p: Partial<EditionSondage>) => changer({ ...valeur, ...p });
  const [demain] = useState(() => new Date(Date.now() + 86400_000).toISOString().slice(0, 10));
  return (
    <div className="mt-3 rounded-xl border border-rule bg-sunk/40 p-3">
      <div className="flex items-center gap-2">
        <BarChart3 aria-hidden="true" className="h-4 w-4 shrink-0 text-primary-ink" />
        <label htmlFor="sondage-question" className="sr-only">
          Question
        </label>
        <input
          id="sondage-question"
          value={valeur.question}
          onChange={(e) => maj({ question: e.target.value })}
          maxLength={300}
          placeholder="Votre question, par exemple : quelle date pour la réunion ?"
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-rule bg-surface px-3 text-[15px] font-semibold text-text focus:border-primary-ink/50 focus:outline-none"
        />
        <button type="button" onClick={fermer} aria-label="Retirer le sondage" className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-sunk hover:text-text">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {!valeur.question.trim() && valeur.options.every((o) => !o.trim()) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
          <Lightbulb aria-hidden="true" className="h-3.5 w-3.5 text-text-faint" />
          {IDEES_SONDAGES.map((idee) => (
            <button
              key={idee.question}
              type="button"
              onClick={() => maj({ question: idee.question, options: [...idee.options] })}
              className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-text-soft ring-1 ring-rule hover:text-text"
            >
              {idee.question}
            </button>
          ))}
        </div>
      )}
      <ol className="mt-2 space-y-1.5 pl-6">
        {valeur.options.map((o, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              value={o}
              aria-label={`Réponse ${i + 1}`}
              onChange={(e) => maj({ options: valeur.options.map((x, j) => (j === i ? e.target.value : x)) })}
              maxLength={120}
              placeholder={`Réponse ${i + 1}`}
              className="min-h-9 min-w-0 flex-1 rounded-lg border border-rule bg-surface px-3 text-sm text-text focus:border-primary-ink/50 focus:outline-none"
            />
            {valeur.options.length > 2 && (
              <button
                type="button"
                aria-label={`Retirer la réponse ${i + 1}`}
                onClick={() => maj({ options: valeur.options.filter((_, j) => j !== i) })}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-sunk hover:text-danger"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        {valeur.options.length < 6 && (
          <button
            type="button"
            onClick={() => maj({ options: [...valeur.options, ""] })}
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-primary-ink hover:bg-primary-ink/10"
          >
            <PlusCircle aria-hidden="true" className="h-3.5 w-3.5" /> Ajouter une réponse
          </button>
        )}
        <Bascule actif={valeur.multiple} onChange={(v) => maj({ multiple: v })} icone={<CheckSquare className="h-3.5 w-3.5" />} texte="Plusieurs choix" />
        <Bascule actif={valeur.anonyme} onChange={(v) => maj({ anonyme: v })} icone={<EyeOff className="h-3.5 w-3.5" />} texte="Vote anonyme" />
        <label className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-text-soft ring-1 ring-rule">
          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
          Clôture
          <input
            type="date"
            min={demain}
            value={valeur.fin}
            onChange={(e) => maj({ fin: e.target.value })}
            className="border-0 bg-transparent p-0 text-xs text-text focus:outline-none focus:ring-0"
          />
        </label>
      </div>
    </div>
  );
}

export function CarteSondage({ s, estParent, agir, enCours, serre = false }: { s: SondageVue; estParent: boolean; agir: (fn: () => Promise<{ ok: boolean; error?: string }>) => void; enCours: boolean; serre?: boolean }) {
  const [noms, setNoms] = useState(false);
  const total = s.options.reduce((t, o) => t + o.votes, 0);
  const aVote = s.mesChoix.length > 0;
  const choisir = (id: string) => {
    if (s.clos) return;
    const mien = s.mesChoix.includes(id);
    const suivant = s.multiple ? (mien ? s.mesChoix.filter((x) => x !== id) : [...s.mesChoix, id]) : mien ? [] : [id];
    agir(() => voter(s.id, suivant));
  };
  const peutVoirNoms = s.options.some((o) => o.noms && o.noms.length > 0);

  return (
    <div className={`${serre ? "mt-2 max-w-xl" : "mx-4 mt-3 sm:mx-5"} rounded-xl border border-rule p-3 sm:p-4`}>
      <p className="flex items-start gap-2 text-[15px] font-bold text-text">
        <BarChart3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
        {s.question}
      </p>
      <p className="mt-0.5 pl-6 text-xs text-text-soft">
        {s.clos ? "Sondage clos" : s.multiple ? "Plusieurs réponses possibles" : "Une seule réponse"}
        {s.anonyme && " · vote anonyme"}
        {s.closesAt && !s.clos && ` · clôture le ${new Date(s.closesAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
      </p>
      <ul className="mt-3 space-y-2">
        {s.options.map((o) => {
          const mien = s.mesChoix.includes(o.id);
          const pct = total ? Math.round((o.votes / total) * 100) : 0;
          const montrer = aVote || s.clos || !estParent;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={enCours || s.clos}
                aria-pressed={mien}
                onClick={() => choisir(o.id)}
                className={`relative flex min-h-11 w-full items-center gap-2.5 overflow-hidden rounded-lg border px-3 text-left text-sm transition-colors ${
                  mien ? "border-primary-ink/50" : "border-rule hover:border-primary-ink/30"
                } ${s.clos ? "cursor-default" : ""}`}
              >
                {montrer && (
                  <span
                    aria-hidden="true"
                    style={{ width: `${pct}%` }}
                    className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${mien ? "bg-primary-ink/15" : "bg-sunk"}`}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`relative flex h-4 w-4 shrink-0 items-center justify-center border ${s.multiple ? "rounded" : "rounded-full"} ${
                    mien ? "border-primary-ink bg-primary-ink text-white" : "border-slate-300 bg-surface"
                  }`}
                >
                  {mien && <Check className="h-3 w-3" />}
                </span>
                <span className={`relative min-w-0 flex-1 ${mien ? "font-semibold text-text" : "text-text"}`}>{o.label}</span>
                {montrer && <span className="relative shrink-0 text-xs font-bold tabular-nums text-text-soft">{pct} %</span>}
              </button>
              {noms && o.noms && o.noms.length > 0 && <p className="mt-1 pl-9 text-xs text-text-soft">{o.noms.join(", ")}</p>}
            </li>
          );
        })}
      </ul>
      {!estParent && s.votants > 0 && <LectureSondage s={s} />}
      {!estParent && s.votants > 0 && <IaSondage id={s.id} />}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-soft">
        <span>
          {s.votants} {s.votants > 1 ? "personnes ont" : "personne a"} répondu
        </span>
        {!aVote && !s.clos && estParent && <span>· Touchez une réponse pour voter</span>}
        {peutVoirNoms && (
          <button type="button" onClick={() => setNoms((v) => !v)} className="font-semibold text-primary-ink hover:underline">
            {noms ? "Masquer les noms" : "Voir qui a répondu"}
          </button>
        )}
        {!estParent && s.votants > 0 && (
          <button
            type="button"
            onClick={() => telechargerCSV(`sondage ${s.question}`, lignesSondage(s))}
            className="inline-flex items-center gap-1 font-semibold text-text-soft hover:text-text"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" /> Exporter
          </button>
        )}
        {s.peutClore && <RelanceSondage id={s.id} />}
        {s.peutClore && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clore ce sondage ? Plus personne ne pourra voter, et chacun recevra les résultats.")) agir(() => clore(s.id));
            }}
            className="ml-auto font-semibold text-text-soft hover:text-text"
          >
            Clore le sondage
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════ Réactions & menu ═══════════════════════ */

export function Reactions({
  pub,
  enCours,
  agir,
  serre = false,
}: {
  pub: PublicationVue;
  enCours: boolean;
  agir: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  serre?: boolean;
}) {
  const [choix, setChoix] = useState(false);
  const entrees = Object.entries(pub.reactions).filter(([, count]) => count > 0);
  const infoReaction = (kind: string) => {
    const std = REACTIONS.find((r) => r.kind === kind);
    return std ? { emoji: std.emoji, label: std.label } : { emoji: kind, label: kind };
  };
  const basculer = (kind: string) => {
    setChoix(false);
    agir(() => reagir(pub.id, pub.maReaction === kind ? null : kind));
  };
  if (pub.masque) return null;
  // Canal façon Slack : pas de bouton « réagir » isolé tant qu'il n'y a aucune réaction (il est dans la barre au survol).
  if (serre && entrees.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${serre ? "pt-1.5" : "px-4 pt-3 sm:px-5"}`}>
      {entrees.map(([kind, n]) => {
        const { emoji, label } = infoReaction(kind);
        const mien = pub.maReaction === kind;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={mien}
            aria-label={`${label} (${n})`}
            disabled={enCours}
            onClick={() => basculer(kind)}
            className={`inline-flex ${serre ? "min-h-6 rounded-full px-2" : "min-h-8 rounded-lg px-2.5"} items-center gap-1.5 text-sm transition-colors ${
              mien ? "bg-primary-ink/10 text-primary-ink ring-1 ring-primary-ink/30" : "bg-sunk text-text-soft hover:bg-rule/60"
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="text-[13px] font-bold tabular-nums">{n}</span>
          </button>
        );
      })}
      <div className="relative">
        <button
          type="button"
          aria-label="Réagir avec un émoji"
          aria-expanded={choix}
          onClick={() => setChoix((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-sunk hover:text-text"
        >
          <SmilePlus aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
        {choix && (
          <>
            <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setChoix(false)} />
            <div className="absolute bottom-full left-0 z-50 mb-2">
              <SelecteurEmoji
                onSelect={(emoji) => basculer(emoji)}
                onClose={() => setChoix(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Menu({ actions }: { actions: { label: string; icone: React.ReactNode; fn: () => void; danger?: boolean }[] }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="relative">
      <SlackTooltip title="Plus d'actions" tip="Épingler, signaler ou supprimer" placement="top" disabled={ouvert}>
        <button
          type="button"
          aria-label="Plus d'actions"
          aria-expanded={ouvert}
          onClick={() => setOuvert((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-sunk hover:text-text cursor-pointer"
        >
          <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>
      </SlackTooltip>
      {ouvert && (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOuvert(false)} />
          <ul role="menu" className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-overlay">
            {actions.map((a) => (
              <li key={a.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOuvert(false);
                    a.fn();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-sunk ${a.danger ? "text-danger" : "text-text"}`}
                >
                  {a.icone}
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

