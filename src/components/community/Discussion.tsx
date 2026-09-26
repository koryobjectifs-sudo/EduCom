"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Paperclip, Smile, Trash2, Pencil, Clock } from "lucide-react";
import type { MessageVue } from "@/lib/messagerie";
import { envoyerMessage, supprimerMessage, modifierMessage, reprogrammerMessage } from "@/app/dashboard/communications/discussions/actions";
import { BoutonProgrammer, ChoixHeure, libelleProgramme } from "./Programmer";
import { envoyerMedia, ACCEPT, type MediaEnvoye } from "./envoiMedia";
import { Avatar, GrilleMedias, ApercuPieces } from "./Elements";
import { heure, jour } from "./outils";

/**
 * Discussion privée (parent ↔ un service de l'école, à propos d'un élève).
 * Affichage façon messagerie d'équipe : avatar, nom, heure, messages groupés
 * par auteur ; composeur en bas. Refonte du 26 sept. 2026.
 */
const EMOJIS = ["👍", "🙏", "😊", "👏", "❤️", "✅", "📚", "🎉"];

export default function Discussion({ id, titre, messages }: { id: string; titre: string; messages: MessageVue[] }) {
  const bas = useRef<HTMLDivElement>(null);
  const ligne = useRef<HTMLDivElement>(null);
  // Figé à l'ouverture : la ligne « Nouveau » reste pendant la lecture (façon Slack).
  const [premierNouveau] = useState<string | null>(() => messages.find((m) => m.nonLu)?.id ?? null);
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current && ligne.current) ligne.current.scrollIntoView({ block: "center" });
    else bas.current?.scrollIntoView({ block: "end" });
    premier.current = false;
  }, [messages.length, id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-sm text-center">
            <Avatar nom={titre} taille="lg" />
            <p className="mt-3 text-[15px] font-bold text-text">C&apos;est le début de votre discussion avec {titre}.</p>
            <p className="mt-1 text-sm text-text-soft">Les messages restent privés entre la famille et ce service de l&apos;école.</p>
          </div>
        ) : (
          <>
            <Messages messages={messages.filter((m) => !m.programme)} premierNouveau={premierNouveau} ligne={ligne} />
            {messages.some((m) => m.programme) && (
              <section aria-label="Messages programmés" className="mt-3 rounded-xl border border-dashed border-primary-ink/30 bg-primary-ink/[0.03] px-2 py-2">
                <p className="flex items-center gap-1.5 px-2 pb-1 text-xs font-bold text-primary-ink">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Programmés · visibles par vous seul
                </p>
                <Messages messages={messages.filter((m) => m.programme)} premierNouveau={null} ligne={ligne} />
              </section>
            )}
          </>
        )}
        <div ref={bas} />
      </div>
      <Composeur conversationId={id} titre={titre} />
    </div>
  );
}

function Messages({
  messages,
  premierNouveau,
  ligne,
}: {
  messages: MessageVue[];
  premierNouveau: string | null;
  ligne: React.RefObject<HTMLDivElement | null>;
}) {
  const [enCours, demarrer] = useTransition();
  const [edition, setEdition] = useState<{ id: string; texte: string } | null>(null);
  const [heurePour, setHeurePour] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const agir = (fn: () => Promise<{ ok: boolean; error?: string }>, apres?: () => void) =>
    demarrer(async () => {
      setErreur(null);
      const r = await fn();
      if (r.ok) apres?.();
      else setErreur(r.error ?? "Action impossible.");
    });
  const enregistrer = () => {
    if (!edition) return;
    const { id, texte } = edition;
    agir(() => modifierMessage(id, texte), () => setEdition(null));
  };
  return (
    <ol className="space-y-0.5">
      {erreur && (
        <li role="alert" className="px-2 text-sm font-medium text-danger">
          {erreur}
        </li>
      )}
      {messages.map((m, i) => {
        const prec = messages[i - 1];
        const nouveauJour = !prec || jour(prec.createdAt) !== jour(m.createdAt);
        const estNouveau = m.id === premierNouveau;
        const groupe =
          !nouveauJour && !estNouveau && prec && prec.auteur === m.auteur && new Date(m.createdAt).getTime() - new Date(prec.createdAt).getTime() < 5 * 60_000;
        return (
          <li key={m.id}>
            {nouveauJour && (
              <div className="sticky top-0 z-[1] my-3 flex justify-center" role="separator">
                <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-rule" />
                <span className="relative rounded-full border border-rule bg-surface px-3.5 py-0.5 text-xs font-bold text-text shadow-2xs first-letter:uppercase">
                  {jour(m.createdAt)}
                </span>
              </div>
            )}
            {estNouveau && (
              <div ref={ligne} className="my-2 flex items-center" role="separator" aria-label="Nouveaux messages">
                <span aria-hidden="true" className="h-px flex-1 bg-danger" />
                <span className="ml-2 rounded bg-danger px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">Nouveau</span>
              </div>
            )}
            <div className={`group relative flex gap-3 rounded-lg px-2 hover:bg-sunk/60 ${groupe ? "py-0.5" : "pt-2 pb-0.5"}`}>
              <div className="w-9 shrink-0">
                {groupe ? (
                  <span className="invisible block pt-1 text-right text-[10px] text-text-faint group-hover:visible">{heure(m.createdAt)}</span>
                ) : (
                  <span className="mt-0.5 block">
                    <Avatar nom={m.auteur} taille="lg" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {!groupe && (
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[15px] font-bold text-text">{m.estAMoi ? "Vous" : m.auteur}</span>
                    <span className="text-xs text-text-faint">
                      {m.role && !m.estAMoi ? `${m.role} · ` : ""}
                      {heure(m.createdAt)}
                    </span>
                  </p>
                )}
                {m.programme && (
                  <div className="relative flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-primary-ink">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Envoi prévu {libelleProgramme(m.programme)}
                    </span>
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => agir(() => reprogrammerMessage(m.id, null))}
                      className="rounded-full bg-primary-ink px-2.5 py-0.5 font-bold text-white hover:bg-primary-ink-hover"
                    >
                      Envoyer maintenant
                    </button>
                    <button type="button" onClick={() => setHeurePour((v) => (v === m.id ? null : m.id))} className="font-semibold text-text-soft hover:text-text">
                      Changer l&apos;heure
                    </button>
                    {heurePour === m.id && (
                      <span className="absolute bottom-0 left-48">
                        <ChoixHeure
                          fermer={() => setHeurePour(null)}
                          choisir={(iso) => {
                            setHeurePour(null);
                            agir(() => reprogrammerMessage(m.id, iso));
                          }}
                        />
                      </span>
                    )}
                  </div>
                )}
                {m.supprime ? (
                  <p className="text-sm italic text-text-faint">Message supprimé</p>
                ) : edition?.id === m.id ? (
                  <div className="mt-1 rounded-lg border border-primary-ink/40 bg-surface p-2">
                    <label htmlFor={`edit-msg-${m.id}`} className="sr-only">
                      Modifier le message
                    </label>
                    <textarea
                      id={`edit-msg-${m.id}`}
                      autoFocus
                      value={edition.texte}
                      onChange={(e) => setEdition({ id: m.id, texte: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEdition(null);
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          enregistrer();
                        }
                      }}
                      rows={Math.min(8, Math.max(2, edition.texte.split("\n").length))}
                      maxLength={4000}
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
                  <div className="space-y-2">
                    {m.body && (
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text">
                        {m.body}
                        {m.modifie && <span className="ml-1 text-xs text-text-faint">(modifié)</span>}
                      </p>
                    )}
                    {m.medias.length > 0 && (
                      <div className="max-w-md">
                        <GrilleMedias medias={m.medias} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.estAMoi && !m.supprime && edition?.id !== m.id && (
                <div className="absolute -top-3 right-2 z-[2] hidden items-center gap-0.5 rounded-lg border border-rule bg-surface p-0.5 shadow-card group-focus-within:flex group-hover:flex">
                  <button
                    type="button"
                    aria-label="Modifier ce message"
                    title="Modifier"
                    onClick={() => setEdition({ id: m.id, texte: m.body })}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-soft hover:bg-sunk hover:text-text"
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer ce message"
                    title="Supprimer"
                    disabled={enCours}
                    onClick={() => {
                      if (window.confirm("Supprimer ce message ?")) agir(() => supprimerMessage(m.id));
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-soft hover:bg-sunk hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Composeur({ conversationId, titre }: { conversationId: string; titre: string }) {
  const [texte, setTexte] = useState("");
  const [medias, setMedias] = useState<MediaEnvoye[]>([]);
  const [envois, setEnvois] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [emojis, setEmojis] = useState(false);
  const [programme, setProgramme] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const zone = useRef<HTMLTextAreaElement>(null);

  const joindre = async (files: FileList | null) => {
    if (!files) return;
    const liste = Array.from(files).slice(0, 5);
    setEnvois((n) => n + liste.length);
    for (const f of liste) {
      try {
        const m = await envoyerMedia(f, "MESSAGE");
        setMedias((p) => [...p, m]);
      } catch (e) {
        setErreur((e as Error).message);
      } finally {
        setEnvois((n) => n - 1);
      }
    }
  };

  const envoyer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await envoyerMessage(conversationId, texte, medias.map((m) => m.mediaId), programme);
      if (r.ok) {
        setProgramme(null);
        setTexte("");
        setMedias([]);
      } else setErreur(r.error);
    });

  const vide = !texte.trim() && medias.length === 0;

  return (
    <div className="shrink-0 px-3 pb-3 sm:px-6 sm:pb-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        className="rounded-2xl border border-primary-ink/20 bg-primary-ink/[0.04] focus-within:border-primary-ink/45 focus-within:bg-surface"
      >
        <div className="px-4 pt-3">
          <label htmlFor={`msg-${conversationId}`} className="sr-only">
            Message
          </label>
          <textarea
            id={`msg-${conversationId}`}
            ref={zone}
            rows={2}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                if (!vide) envoyer();
              }
            }}
            maxLength={4000}
            placeholder={`Écrire à ${titre}…`}
            className="block max-h-40 min-h-12 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
          />
          <div className="mt-2">
            <ApercuPieces medias={medias} envois={envois} retirer={(id) => setMedias((p) => p.filter((x) => x.mediaId !== id))} />
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <label title="Joindre une photo, une vidéo ou un PDF" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text">
            <Paperclip aria-hidden="true" className="h-[18px] w-[18px]" />
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
          <div className="relative">
            <button
              type="button"
              aria-label="Emoji"
              aria-expanded={emojis}
              onClick={() => setEmojis((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text"
            >
              <Smile aria-hidden="true" className="h-[18px] w-[18px]" />
            </button>
            {emojis && (
              <>
                <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setEmojis(false)} />
                <div className="absolute bottom-full left-0 z-20 mb-1 grid grid-cols-4 gap-0.5 rounded-xl border border-rule bg-surface p-1 shadow-overlay">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setTexte((t) => `${t}${e}`);
                        setEmojis(false);
                        zone.current?.focus();
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-sunk"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span aria-hidden="true" className="flex-1 sm:hidden" />
          <span className="ml-auto hidden text-[11px] text-text-faint sm:inline">Entrée pour envoyer · Maj+Entrée pour un retour à la ligne</span>
          {!vide && (
            <button
              type="button"
              onClick={() => {
                setTexte("");
                setMedias([]);
              }}
              className="ml-2 min-h-9 rounded-lg border border-rule bg-surface px-3 text-sm font-semibold text-text-soft hover:text-text"
            >
              Effacer
            </button>
          )}
          <span className="ml-2">
            <BoutonProgrammer valeur={programme} changer={setProgramme} />
          </span>
          <button
            type="submit"
            disabled={enCours || envois > 0 || vide}
            className="ml-2 min-h-9 rounded-lg bg-primary-ink px-4 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
          >
            {enCours ? "Envoi…" : programme ? "Programmer" : "Envoyer"}
          </button>
        </div>
      </form>
      {erreur && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
