"use client";

import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Hash,
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
  BarChart3,
  X,
  SendHorizontal,
  Lock,
  Pencil,
  Clock,
} from "lucide-react";
import type { PublicationVue } from "@/lib/community";
import ZoneMention, { type Mentionnable } from "./ZoneMention";
import { envoyerMedia, ACCEPT, type MediaEnvoye } from "./envoiMedia";
import { Avatar, GrilleMedias, ApercuPieces } from "./Elements";
import { heure, ilYa, jour } from "./outils";
import { BoutonProgrammer, ChoixHeure, libelleProgramme } from "./Programmer";
import {
  Mentions,
  REACTIONS,
  mentionsDuTexte,
  TexteAvecMentionsCtx,
  CarteSondage,
  Engagement,
  Reactions,
  Menu,
  MenuModeles,
  EditeurSondage,
  SONDAGE_VIDE,
  type EditionSondage,
  type Cible,
} from "./FilPublications";
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
  modifierPublication,
  reprogrammerPublication,
} from "@/app/dashboard/communications/communaute/actions";

/**
 * Canal façon Slack — 26 sept. 2026 (demande de Kory : « le style de Slack
 * sur la partie messagerie »). Messages du plus ancien au plus récent,
 * séparateurs de jour (« Aujourd'hui », « Hier »), ligne rouge « Nouveaux »
 * à partir du premier message non lu, fil de réponses dans un volet à droite,
 * composeur collé en bas. Le fil d'actualité garde ses cartes.
 * Mêmes actions serveur que le fil : les droits restent vérifiés côté serveur.
 */
type Agir = (fn: () => Promise<{ ok: boolean; error?: string }>) => void;

export default function FilCanal({
  publications,
  cible,
  nomEspace,
  description,
  moderateur,
  estParent,
  peutEpingler,
  personnes,
  ia,
  luJusqua,
}: {
  publications: PublicationVue[];
  /** Espace où l'on peut écrire ; null = lecture seule. */
  cible: Cible | null;
  nomEspace: string;
  description: string | null;
  moderateur: boolean;
  estParent: boolean;
  peutEpingler: boolean;
  personnes: Mentionnable[];
  ia: boolean;
  luJusqua: string | null;
}) {
  const mentions = useMemo(() => ({ personnes, noms: personnes.map((p) => p.nom), ia }), [personnes, ia]);
  const tries = useMemo(() => [...publications].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [publications]);
  const messages = useMemo(() => tries.filter((m) => !m.programme), [tries]);
  // Programmés : visibles de leur seul auteur, regroupés en bas (comme Slack).
  const programmes = useMemo(() => tries.filter((m) => m.programme), [tries]);
  const jours = useMemo(() => {
    const g: { cle: string; items: PublicationVue[] }[] = [];
    for (const m of messages) {
      const cle = jour(m.createdAt);
      if (g[g.length - 1]?.cle === cle) g[g.length - 1].items.push(m);
      else g.push({ cle, items: [m] });
    }
    return g;
  }, [messages]);
  // Figé à l'ouverture du canal : la ligne « Nouveaux » reste pendant la lecture (comme Slack).
  const [premierNouveau] = useState<string | null>(
    () => (luJusqua ? messages.find((m) => !m.estAMoi && m.createdAt > luJusqua)?.id : null) ?? null,
  );
  const [filOuvert, setFilOuvert] = useState<string | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const nouveau = useRef<HTMLDivElement>(null);
  const nombre = useRef(messages.length);

  // Ouverture : lien direct (#pub-…), sinon la ligne « Nouveaux », sinon le bas.
  useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    const cibleHash = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    if (cibleHash) cibleHash.scrollIntoView({ block: "center" });
    else if (nouveau.current) nouveau.current.scrollIntoView({ block: "center" });
    else el.scrollTop = el.scrollHeight;
  }, []);

  // Nouveau message (le mien ou celui d'un autre) : on descend si l'on était déjà en bas.
  useEffect(() => {
    const el = zone.current;
    if (!el || messages.length <= nombre.current) {
      nombre.current = messages.length;
      return;
    }
    nombre.current = messages.length;
    const dernier = messages[messages.length - 1];
    if (dernier?.estAMoi || el.scrollHeight - el.scrollTop - el.clientHeight < 240) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const pubFil = filOuvert ? messages.find((m) => m.id === filOuvert) ?? null : null;

  return (
    <Mentions.Provider value={mentions}>
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={zone} className="min-h-0 flex-1 overflow-y-auto pb-2 pt-4">
            {/* Début du canal */}
            <div className="px-4 pb-4 sm:px-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-ink/10 text-primary-ink">
                <Hash aria-hidden="true" className="h-6 w-6" />
              </span>
              <p className="mt-2 text-xl font-bold text-text">
                {messages.length >= 40 ? `#${nomEspace}` : `C'est le début de #${nomEspace}`}
              </p>
              {description && <p className="mt-0.5 text-sm text-text-soft">{description}</p>}
            </div>

            {jours.map((g) => (
              <section key={g.cle} aria-label={jour(g.items[0].createdAt)} className="relative">
                {/* Ligne du jour fixe, pastille collante (comme Slack) */}
                <span aria-hidden="true" className="absolute inset-x-0 top-[15px] h-px bg-rule" />
                <div className="pointer-events-none sticky top-0 z-[3] flex justify-center py-1.5">
                  <span className="pointer-events-auto rounded-full border border-rule bg-surface px-3.5 py-0.5 text-xs font-bold text-text shadow-2xs first-letter:uppercase">
                    {jour(g.items[0].createdAt)}
                  </span>
                </div>
                <ol>
                  {g.items.map((m) => {
                    const i = messages.indexOf(m);
                    const prec = messages[i - 1];
                    const estNouveau = m.id === premierNouveau;
                    const groupe =
                      !estNouveau &&
                      prec &&
                      jour(prec.createdAt) === jour(m.createdAt) &&
                      prec.auteur === m.auteur &&
                      !prec.sondage &&
                      !m.pinned &&
                      !m.mustRead &&
                      new Date(m.createdAt).getTime() - new Date(prec.createdAt).getTime() < 5 * 60_000;
                    return (
                      <li key={m.id}>
                        {estNouveau && (
                          <div ref={nouveau} className="relative my-1 flex items-center px-4 sm:px-5" role="separator" aria-label="Nouveaux messages">
                            <span aria-hidden="true" className="h-px flex-1 bg-danger" />
                            <span className="ml-2 rounded bg-danger px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">Nouveau</span>
                          </div>
                        )}
                        <Message
                          pub={m}
                          groupe={Boolean(groupe)}
                          moderateur={moderateur}
                          estParent={estParent}
                          peutEpingler={peutEpingler}
                          ouvrirFil={() => setFilOuvert(m.id)}
                          filActif={filOuvert === m.id}
                        />
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}

            {programmes.length > 0 && (
              <section aria-label="Messages programmés" className="mx-4 mt-3 rounded-xl border border-dashed border-primary-ink/30 bg-primary-ink/[0.03] py-2 sm:mx-5">
                <p className="flex items-center gap-1.5 px-4 pb-1 text-xs font-bold text-primary-ink">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                  {programmes.length} message{programmes.length > 1 ? "s" : ""} programmé{programmes.length > 1 ? "s" : ""} · visible{programmes.length > 1 ? "s" : ""} par vous seul
                </p>
                {programmes.map((m) => (
                  <Message key={m.id} pub={m} groupe={false} moderateur={moderateur} estParent={estParent} peutEpingler={peutEpingler} />
                ))}
              </section>
            )}
          </div>

          {cible ? (
            <ComposeurCanal cible={cible} peutEpingler={peutEpingler} />
          ) : (
            <p className="m-3 flex items-center gap-2 rounded-xl bg-sunk px-4 py-3 text-sm text-text-soft sm:mx-5">
              <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
              Seule l&apos;école écrit dans ce canal. Vous pouvez réagir et répondre dans les fils.
            </p>
          )}
        </div>

        {pubFil && (
          <VoletFil pub={pubFil} nomEspace={nomEspace} moderateur={moderateur} estParent={estParent} fermer={() => setFilOuvert(null)} />
        )}
      </div>
    </Mentions.Provider>
  );
}

/* ═══════════════════════ Un message ═══════════════════════ */

function useActions(pub: PublicationVue, moderateur: boolean, peutEpingler: boolean, agir: Agir, modifier: () => void) {
  const partager = () => {
    const extrait = pub.body.length > 220 ? `${pub.body.slice(0, 220)}…` : pub.body;
    const lien = `${window.location.origin}/famille/communaute?espace=${encodeURIComponent(pub.espace)}#pub-${pub.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${extrait}\n\nÀ lire sur EduCom : ${lien}`)}`, "_blank", "noopener");
  };
  return [
    ...(pub.estAMoi && !pub.masque ? [{ label: "Modifier", icone: <Pencil className="h-4 w-4" />, fn: modifier }] : []),
    ...(!pub.masque && !pub.programme ? [{ label: "Partager sur WhatsApp", icone: <Share2 className="h-4 w-4" />, fn: partager }] : []),
    ...(peutEpingler && !pub.masque && !pub.programme
      ? [{ label: pub.pinned ? "Désépingler" : "Épingler", icone: <Pin className="h-4 w-4" />, fn: () => agir(() => epingler(pub.id, !pub.pinned)) }]
      : []),
    ...(moderateur && !pub.estAMoi
      ? [
          {
            label: pub.masque ? "Réafficher" : "Masquer (modération)",
            icone: pub.masque ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />,
            fn: () => agir(() => masquerPublication(pub.id, !pub.masque)),
          },
        ]
      : []),
    ...(pub.estAMoi
      ? [
          {
            label: "Supprimer",
            icone: <Trash2 className="h-4 w-4" />,
            danger: true,
            fn: () => {
              if (window.confirm(pub.programme ? "Supprimer ce message programmé ?" : "Supprimer définitivement ce message ?")) agir(() => supprimerPublication(pub.id));
            },
          },
        ]
      : []),
    ...(!moderateur && !pub.estAMoi
      ? [
          {
            label: "Signaler à la direction",
            icone: <Flag className="h-4 w-4" />,
            fn: () => {
              const raison = window.prompt("Pourquoi signaler ce message à la direction ?");
              if (raison !== null) agir(() => signaler({ postId: pub.id }, raison));
            },
          },
        ]
      : []),
  ];
}

function Message({
  pub,
  groupe,
  moderateur,
  estParent,
  peutEpingler,
  ouvrirFil,
  filActif,
  dansLeFil = false,
}: {
  pub: PublicationVue;
  groupe: boolean;
  moderateur: boolean;
  estParent: boolean;
  peutEpingler: boolean;
  ouvrirFil?: () => void;
  filActif?: boolean;
  dansLeFil?: boolean;
}) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const agir: Agir = (fn) =>
    demarrer(async () => {
      setErreur(null);
      const r = await fn();
      if (!r.ok) setErreur(r.error ?? "Action impossible.");
    });
  const [edition, setEdition] = useState<string | null>(null);
  const [quiAVu, setQuiAVu] = useState(false);
  const [choixHeure, setChoixHeure] = useState(false);
  const actions = useActions(pub, moderateur, peutEpingler, agir, () => setEdition(pub.body));
  const enregistrer = () => {
    if (edition === null) return;
    const t = edition;
    agir(async () => {
      const r = await modifierPublication(pub.id, t);
      if (r.ok) setEdition(null);
      return r;
    });
  };
  const n = pub.commentaires.length;
  const repondants = [...new Set(pub.commentaires.map((c) => c.auteur))].slice(0, 3);
  const derniere = pub.commentaires[n - 1];

  return (
    <article
      id={`pub-${pub.id}`}
      className={`group relative scroll-mt-16 px-4 sm:px-5 ${groupe ? "py-0.5" : "pb-1 pt-2"} ${
        pub.pinned ? "bg-warning/[0.06]" : filActif ? "bg-primary-ink/[0.05]" : "hover:bg-sunk/60"
      } ${pub.masque ? "opacity-60" : ""} target:bg-primary-ink/[0.08]`}
    >
      {pub.pinned && (
        <p className="mb-0.5 flex items-center gap-1 pl-12 text-[11px] font-semibold text-warning">
          <Pin aria-hidden="true" className="h-3 w-3" /> Épinglé
        </p>
      )}
      <div className="flex gap-3">
        <div className="w-9 shrink-0">
          {groupe ? (
            <span className="invisible block pt-1 text-right text-[10px] tabular-nums text-text-faint group-hover:visible">{heure(pub.createdAt)}</span>
          ) : (
            <Avatar nom={pub.auteur} taille="lg" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {!groupe && (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[15px] font-bold text-text">{pub.auteur}</span>
              <span className="text-xs text-text-faint">
                {pub.role} · <time dateTime={pub.createdAt} title={new Date(pub.createdAt).toLocaleString("fr-FR")}>{heure(pub.createdAt)}</time>
              </span>
              {pub.masque && <span className="text-xs font-semibold text-danger">Masqué par la direction</span>}
            </p>
          )}

          {pub.mustRead && (
            <p className="mb-0.5 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 font-semibold text-text">
                <BellRing aria-hidden="true" className="h-3 w-3 text-warning" /> À lire obligatoirement
              </span>
              {pub.lecture && (
                <span className="text-text-soft">
                  lu par {pub.lecture.lus} sur {pub.lecture.destinataires}
                </span>
              )}
              {estParent &&
                (pub.luParMoi ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-success">
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> Lu
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => agir(() => marquerLu(pub.id))}
                    disabled={enCours}
                    className="inline-flex min-h-6 items-center gap-1 rounded-full bg-primary-ink px-2.5 font-bold text-white"
                  >
                    <CheckCircle2 aria-hidden="true" className="h-3 w-3" /> J&apos;ai lu
                  </button>
                ))}
            </p>
          )}

          {pub.programme && (
            <div className="relative mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-primary-ink">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Envoi prévu {libelleProgramme(pub.programme)}
              </span>
              <button
                type="button"
                disabled={enCours}
                onClick={() => agir(() => reprogrammerPublication(pub.id, null))}
                className="rounded-full bg-primary-ink px-2.5 py-0.5 font-bold text-white hover:bg-primary-ink-hover"
              >
                Envoyer maintenant
              </button>
              <button type="button" onClick={() => setChoixHeure((v) => !v)} className="font-semibold text-text-soft hover:text-text">
                Changer l&apos;heure
              </button>
              {choixHeure && (
                <span className="absolute bottom-0 left-48">
                  <ChoixHeure
                    fermer={() => setChoixHeure(false)}
                    choisir={(iso) => {
                      setChoixHeure(false);
                      agir(() => reprogrammerPublication(pub.id, iso));
                    }}
                  />
                </span>
              )}
            </div>
          )}

          {edition !== null ? (
            <div className="mt-1 rounded-lg border border-primary-ink/40 bg-surface p-2">
              <label htmlFor={`edit-${pub.id}`} className="sr-only">
                Modifier le message
              </label>
              <textarea
                id={`edit-${pub.id}`}
                autoFocus
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEdition(null);
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enregistrer();
                  }
                }}
                rows={Math.min(8, Math.max(2, edition.split("\n").length))}
                maxLength={5000}
                className="block w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-text focus:outline-none focus:ring-0"
              />
              <div className="mt-1.5 flex items-center justify-end gap-2 text-xs">
                <span className="mr-auto text-text-faint">Échap pour annuler · Entrée pour enregistrer</span>
                <button type="button" onClick={() => setEdition(null)} className="min-h-7 rounded-md px-2.5 font-semibold text-text-soft hover:bg-sunk">
                  Annuler
                </button>
                <button type="button" onClick={enregistrer} disabled={enCours} className="min-h-7 rounded-md bg-primary-ink px-3 font-bold text-white disabled:opacity-50">
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            pub.body && (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text">
                <TexteAvecMentionsCtx texte={pub.body} />
                {pub.modifie && <span className="ml-1 text-xs text-text-faint">(modifié)</span>}
              </p>
            )
          )}
          {pub.medias.length > 0 && (
            <div className="mt-1.5 max-w-md">
              <GrilleMedias medias={pub.medias} />
            </div>
          )}
          {pub.sondage && <CarteSondage s={pub.sondage} estParent={estParent} agir={agir} enCours={enCours} serre />}
          {!pub.programme && <Reactions pub={pub} enCours={enCours} agir={agir} serre />}

          {!dansLeFil && n > 0 && pub.commentsEnabled && (
            <button
              type="button"
              onClick={ouvrirFil}
              className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-transparent py-1 pl-1 pr-2 text-left hover:border-rule hover:bg-surface"
            >
              <span className="flex -space-x-1">
                {repondants.map((r) => (
                  <span key={r} className="rounded-full ring-2 ring-surface">
                    <Avatar nom={r} taille="sm" />
                  </span>
                ))}
              </span>
              <span className="text-[13px] font-bold text-primary-ink">
                {n} réponse{n > 1 ? "s" : ""}
              </span>
              {derniere && <span className="truncate text-xs text-text-faint">Dernière réponse {ilYa(derniere.createdAt)}</span>}
            </button>
          )}
          {/* Pas encore de réponse : lien discret, toujours visible (le survol n'existe pas sur téléphone). */}
          {!dansLeFil && n === 0 && pub.commentsEnabled && !pub.masque && !pub.programme && ouvrirFil && (
            <button
              type="button"
              onClick={ouvrirFil}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-text-faint hover:text-primary-ink [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:inline-flex"
            >
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" /> Répondre dans le fil
            </button>
          )}
          {quiAVu && <Engagement postId={pub.id} serre auto />}
          {erreur && (
            <p role="alert" className="mt-1 text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
        </div>
      </div>

      {/* Barre d'actions au survol (comme Slack) */}
      {!dansLeFil && !pub.masque && edition === null && (
        <div className="absolute -top-3 right-4 z-[2] hidden items-center gap-0.5 rounded-lg border border-rule bg-surface p-0.5 shadow-card group-focus-within:flex group-hover:flex">
          {!pub.programme && REACTIONS.map((r) => (
            <button
              key={r.kind}
              type="button"
              title={r.label}
              aria-label={r.label}
              disabled={enCours}
              onClick={() => agir(() => reagir(pub.id, pub.maReaction === r.kind ? null : r.kind))}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-sunk ${pub.maReaction === r.kind ? "bg-primary-ink/10" : ""}`}
            >
              {r.emoji}
            </button>
          ))}
          {pub.commentsEnabled && ouvrirFil && !pub.programme && (
            <button
              type="button"
              title="Répondre dans le fil"
              aria-label="Répondre dans le fil"
              onClick={ouvrirFil}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-soft hover:bg-sunk hover:text-text"
            >
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          {pub.peutSupprimer && !estParent && !pub.programme && (
            <button
              type="button"
              title="Qui a vu ?"
              aria-label="Qui a vu ?"
              aria-pressed={quiAVu}
              onClick={() => setQuiAVu((v) => !v)}
              className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-sunk ${quiAVu ? "text-primary-ink" : "text-text-soft hover:text-text"}`}
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          {actions.length > 0 && <Menu actions={actions} />}
        </div>
      )}
    </article>
  );
}

/* ═══════════════════════ Volet « fil de discussion » ═══════════════════════ */

function VoletFil({
  pub,
  nomEspace,
  moderateur,
  estParent,
  fermer,
}: {
  pub: PublicationVue;
  nomEspace: string;
  moderateur: boolean;
  estParent: boolean;
  fermer: () => void;
}) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const bas = useRef<HTMLDivElement>(null);
  const agir: Agir = (fn) =>
    demarrer(async () => {
      setErreur(null);
      const r = await fn();
      if (!r.ok) setErreur(r.error ?? "Action impossible.");
    });
  useEffect(() => {
    bas.current?.scrollIntoView({ block: "end" });
  }, [pub.commentaires.length]);
  const n = pub.commentaires.length;

  return (
    <aside
      aria-label="Fil de discussion"
      className="absolute inset-0 z-20 flex flex-col border-l border-rule bg-surface shadow-overlay sm:left-auto sm:w-[400px] 2xl:static 2xl:shadow-none"
    >
      <header className="flex min-h-12 shrink-0 items-center justify-between border-b border-rule px-4">
        <p className="text-[15px] font-bold text-text">
          Fil <span className="font-normal text-text-soft">· #{nomEspace}</span>
        </p>
        <button type="button" onClick={fermer} aria-label="Fermer le fil" className="flex h-8 w-8 items-center justify-center rounded-lg text-text-soft hover:bg-sunk">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-3">
        <Message pub={pub} groupe={false} moderateur={moderateur} estParent={estParent} peutEpingler={false} dansLeFil />
        <div className="my-2 flex items-center gap-3 px-4 text-xs font-semibold text-text-soft">
          {n > 0 ? `${n} réponse${n > 1 ? "s" : ""}` : "Pas encore de réponse"}
          <span aria-hidden="true" className="h-px flex-1 bg-rule" />
        </div>
        <ol>
          {pub.commentaires.map((c) => (
            <li key={c.id} className={`group flex gap-3 px-4 py-2 hover:bg-sunk/60 ${c.masque ? "opacity-60" : ""}`}>
              <Avatar nom={c.auteur} taille="lg" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[15px] font-bold text-text">{c.auteur}</span>
                  <span className="text-xs text-text-faint">
                    {c.role} · {heure(c.createdAt)}
                    {jour(c.createdAt) !== "Aujourd'hui" && ` · ${jour(c.createdAt)}`}
                  </span>
                  {c.masque && <span className="text-[11px] font-semibold text-danger">masqué</span>}
                </p>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text">
                  <TexteAvecMentionsCtx texte={c.body} />
                </p>
                <div className="hidden gap-3 pt-0.5 text-xs font-semibold text-text-faint group-focus-within:flex group-hover:flex">
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
            </li>
          ))}
        </ol>
        <div ref={bas} />
      </div>
      {erreur && (
        <p role="alert" className="px-4 pb-1 text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
      {pub.commentsEnabled && !pub.masque ? (
        <ComposeurFil postId={pub.id} desactive={enCours} />
      ) : (
        <p className="m-3 flex items-center gap-2 rounded-xl bg-sunk px-3 py-2.5 text-sm text-text-soft">
          <MessageCircleOff aria-hidden="true" className="h-4 w-4" /> Les réponses sont fermées pour ce message.
        </p>
      )}
    </aside>
  );
}

function ComposeurFil({ postId, desactive }: { postId: string; desactive: boolean }) {
  const { personnes } = useContext(Mentions);
  const [mentions, setMentions] = useState<string[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), [postId]);
  const envoyer = () =>
    demarrer(async () => {
      if (!texte.trim()) return;
      setErreur(null);
      const r = await commenter(postId, texte, mentionsDuTexte(texte, mentions, personnes));
      if (r.ok) {
        setTexte("");
        setMentions([]);
      } else setErreur(r.error);
    });
  return (
    <div className="shrink-0 px-3 pb-3">
      <div className="flex items-end gap-2 rounded-xl border border-rule px-3 py-2 focus-within:border-primary-ink/45">
        <label htmlFor={`fil-${postId}`} className="sr-only">
          Répondre
        </label>
        <ZoneMention
          id={`fil-${postId}`}
          ref={ref}
          value={texte}
          onValueChange={setTexte}
          personnes={personnes}
          onMention={(id) => setMentions((m) => [...m, id])}
          versLeHaut
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              envoyer();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="Répondre…"
          className="block max-h-40 min-h-10 w-full resize-none border-0 bg-transparent p-0 text-[14.5px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
        />
        <button
          type="button"
          onClick={envoyer}
          disabled={enCours || desactive || !texte.trim()}
          aria-label="Envoyer la réponse"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-ink text-white disabled:bg-primary-ink/30"
        >
          <SendHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {erreur && <p className="mt-1 text-xs font-medium text-danger">{erreur}</p>}
    </div>
  );
}

/* ═══════════════════════ Composeur du canal (en bas) ═══════════════════════ */

function ComposeurCanal({ cible, peutEpingler }: { cible: Cible; peutEpingler: boolean }) {
  const { personnes } = useContext(Mentions);
  const [mentions, setMentions] = useState<string[]>([]);
  const [texte, setTexte] = useState("");
  const [sondage, setSondage] = useState<EditionSondage | null>(null);
  const [mustRead, setMustRead] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [sansReponses, setSansReponses] = useState(false);
  const [programme, setProgramme] = useState<string | null>(null);
  const [medias, setMedias] = useState<MediaEnvoye[]>([]);
  const [envois, setEnvois] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const sondagePret = sondage !== null && sondage.question.trim() !== "" && sondage.options.filter((o) => o.trim()).length >= 2;
  const vide = sondage ? !sondagePret : !texte.trim() && medias.length === 0;

  const joindre = async (files: FileList | null) => {
    if (!files) return;
    setErreur(null);
    const liste = Array.from(files).slice(0, Math.max(0, 10 - medias.length));
    setEnvois((n) => n + liste.length);
    for (const f of liste) {
      try {
        const m = await envoyerMedia(f, "PUBLICATION");
        setMedias((p) => [...p, m]);
      } catch (e) {
        setErreur((e as Error).message);
      } finally {
        setEnvois((n) => n - 1);
      }
    }
  };

  const envoyer = () => {
    if (vide || envois > 0) return;
    setErreur(null);
    demarrer(async () => {
      const r = await publier({
        mediaIds: medias.map((m) => m.mediaId),
        body: texte,
        espace: cible.cle,
        mentions: mentionsDuTexte(texte, mentions, personnes),
        mustRead,
        pinned,
        commentsEnabled: !sansReponses,
        sondage: sondage
          ? {
              question: sondage.question,
              options: sondage.options,
              multiple: sondage.multiple,
              anonymous: sondage.anonyme,
              closesAt: sondage.fin ? new Date(`${sondage.fin}T23:59:00`).toISOString() : null,
            }
          : null,
        programmeLe: programme,
      });
      if (r.ok) {
        setProgramme(null);
        setTexte("");
        setMentions([]);
        setSondage(null);
        setMustRead(false);
        setPinned(false);
        setSansReponses(false);
        setMedias([]);
      } else setErreur(r.error);
    });
  };

  const option = (actif: boolean, basculer: () => void, titre: string, icone: React.ReactNode) => (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      onClick={basculer}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${actif ? "bg-primary-ink/10 text-primary-ink" : "text-text-soft hover:bg-sunk hover:text-text"}`}
    >
      {icone}
    </button>
  );

  return (
    <div className="shrink-0 px-3 pb-3 sm:px-5 sm:pb-4">
      <div className="rounded-xl border border-rule bg-surface shadow-2xs focus-within:border-primary-ink/45">
        {sondage && (
          <div className="px-3 pt-1">
            <EditeurSondage valeur={sondage} changer={setSondage} fermer={() => setSondage(null)} />
          </div>
        )}
        <div className="px-3 pt-2.5">
          <label htmlFor="canal-texte" className="sr-only">
            Message
          </label>
          <ZoneMention
            id="canal-texte"
            value={texte}
            onValueChange={setTexte}
            personnes={personnes}
            onMention={(id) => setMentions((m) => [...m, id])}
            versLeHaut
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                envoyer();
              }
            }}
            rows={texte.split("\n").length > 1 ? Math.min(8, texte.split("\n").length) : 1}
            maxLength={5000}
            placeholder={sondage ? "Un mot d'introduction (facultatif)…" : cible.type === "ECOLE" ? "Écrire à toute l'école dans #général" : `Écrire dans #${cible.nom}`}
            className="block max-h-52 min-h-6 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
          />
          <ApercuPieces medias={medias} envois={envois} retirer={(id) => setMedias((p) => p.filter((x) => x.mediaId !== id))} />
        </div>
        <div className="flex items-center gap-0.5 px-1.5 pb-1.5 pt-1">
          <label title="Joindre une photo, une vidéo ou un PDF" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-text-soft hover:bg-sunk hover:text-text">
            <Paperclip aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Joindre une photo, une vidéo ou un PDF</span>
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                void joindre(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <MenuModeles appliquer={setTexte} />
          {option(sondage !== null, () => setSondage((v) => (v ? null : SONDAGE_VIDE)), "Ajouter un sondage", <BarChart3 className="h-4 w-4" />)}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-rule" />
          {option(mustRead, () => setMustRead((v) => !v), "À lire obligatoirement", <BellRing className="h-4 w-4" />)}
          {peutEpingler && option(pinned, () => setPinned((v) => !v), "Épingler", <Pin className="h-4 w-4" />)}
          {option(sansReponses, () => setSansReponses((v) => !v), "Sans réponses", <MessageCircleOff className="h-4 w-4" />)}
          <span className="ml-auto hidden pr-2 text-[11px] text-text-faint xl:inline">Entrée pour envoyer · Maj+Entrée pour aller à la ligne</span>
          <span aria-hidden="true" className="flex-1 xl:hidden" />
          <BoutonProgrammer valeur={programme} changer={setProgramme} />
          <button
            type="button"
            onClick={envoyer}
            disabled={enCours || envois > 0 || vide}
            aria-label={programme ? "Programmer" : "Envoyer"}
            title={programme ? "Programmer" : "Envoyer"}
            className="flex h-8 w-9 items-center justify-center rounded-md bg-primary-ink text-white hover:bg-primary-ink-hover disabled:bg-transparent disabled:text-text-faint"
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      {erreur && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
