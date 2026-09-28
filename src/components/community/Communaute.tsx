"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Hash,
  Lock,
  Briefcase,
  Search,
  Newspaper,
  Info,
  X,
  Menu as MenuIcon,
  User,
  CalendarDays,
  Eye,
  PenLine,
  Users,
  Pin,
  FileText,
  Image as ImageIcon,
  Settings2,
  Activity,
  ClipboardList,
  BarChart3,
  PieChart,
} from "lucide-react";
import type { BarreLaterale, EspaceVue, InfoEspace, PersonneVue, PublicationVue } from "@/lib/community";
import type { ConversationResume, MessageVue } from "@/lib/messagerie";
import { ouvrirDiscussion } from "@/app/dashboard/communications/discussions/actions";
import FilPublications, { type Cible } from "./FilPublications";
import FilCanal from "./FilCanal";
import Discussion from "./Discussion";
import Formulaires, { type VueFormulaires } from "./Formulaires";
import TableauEngagement from "./TableauEngagement";
import EspaceResultats from "./EspaceResultats";
import type { TableauResultats } from "@/lib/resultats";
import { BoutonAnalyseIA } from "./IA";
import type { TableauEngagement as DonneesEngagement } from "@/lib/engagement";
import BarreCommunaute from "./BarreCommunaute";
import { useSidebarSlot } from "@/components/layout/SidebarSlot";
import DialogueCanal, { type CanalEdite } from "./DialogueCanal";
import ActiverNotifications from "./ActiverNotifications";
import { Avatar } from "./Elements";
import VueSupportEduCom from "./VueSupportEduCom";
import SlackTooltip from "@/components/ui/SlackTooltip";

/**
 * Communauté — une seule page façon Slack (refonte du 26 sept. 2026, demande
 * de Kory) : à gauche les canaux (général, classes, canaux créés) et les
 * messages directs ; au centre le fil ou la discussion ; à droite les infos.
 * Mêmes composants pour le personnel et les familles ; les droits restent
 * décidés côté serveur (`lib/community.ts`, `lib/messagerie.ts`).
 */
export type DiscussionOuverte = { id: string; titre: string; sousTitre: string; messages: MessageVue[]; avatar?: string | null };

type Props = {
  famille: boolean;
  /** Rôle de la personne connectée (choix des destinataires d'un formulaire). */
  role: string;
  baseHref: string;
  ecole: string;
  barre: BarreLaterale;
  espace: string;
  publications: PublicationVue[];
  info: InfoEspace | null;
  conversations: ConversationResume[];
  discussion: DiscussionOuverte | null;
  eleves: { id: string; nom: string; classe: string }[];
  collegues: { id: string; nom: string; role: string }[];
  services: { id: string; label: string }[];
  peutEcrireFamilles: boolean;
  moderateur: boolean;
  /** Fonctions IA disponibles (clé configurée côté serveur). */
  ia: boolean;
  invitables: PersonneVue[];
  personnes: PersonneVue[];
  formulaires: VueFormulaires | null;
  engagement: DonneesEngagement | null;
  resultats: TableauResultats | null;
  luJusqua: string | null;
  formsARemplir: number;
  sondagesHref: string | null;
};

export default function Communaute(props: Props) {
  const { famille, baseHref, barre, espace, publications, info, discussion, moderateur } = props;
  const router = useRouter();
  const [tiroir, setTiroir] = useState(false);
  // Détails du canal : fermés par défaut, ouverts par le bouton « i » (façon Slack, demande de Kory).
  const [panneau, setPanneau] = useState(false);
  const [dialogue, setDialogue] = useState<null | "canal" | "discussion" | { edition: CanalEdite }>(null);

  // Nouveaux messages et publications sans recharger la page (pas de temps réel :
  // la base refuse tout accès direct du navigateur — voir context.md).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => clearInterval(t);
  }, [router]);

  const tous = useMemo(() => [barre.general, ...barre.canaux, ...barre.classes], [barre]);
  // Onglet du navigateur : « (3) Communauté » tant qu'il reste des messages non lus (façon Slack).
  const nonLusTotal = totalNonLus(props);
  useEffect(() => {
    const avant = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = nonLusTotal > 0 ? `(${nonLusTotal > 99 ? "99+" : nonLusTotal}) ${avant}` : avant;
    return () => {
      document.title = avant;
    };
  }, [nonLusTotal]);
  const vueSondages = espace === "SONDAGES";
  const vueFormulaires = props.formulaires;
  const vueEngagement = props.engagement;
  const vueResultats = props.resultats;
  const pleine = Boolean(vueFormulaires || vueEngagement || vueResultats);
  // Sondages, formulaires et résultats : un seul espace « Enquêtes » à onglets (demande de Kory, 26 sept.).
  const vueEnquetes = vueSondages || Boolean(vueFormulaires) || Boolean(vueResultats);
  const actif = tous.find((e) => e.cle === espace) ?? null;
  const cibles: Cible[] = (actif ? [actif] : tous)
    .filter((e) => e.peutPublier)
    .map((e) => ({ cle: e.cle, nom: e.nom, type: e.type }));

  const vide = vueSondages
    ? {
        titre: "Aucun sondage pour l'instant.",
        texte: cibles.length
          ? "Posez une question aux familles ou à l'équipe : date de réunion, choix de sortie, menu de la kermesse… Les réponses arrivent ici, en direct."
          : "Les sondages de l'école apparaîtront ici. Vous pourrez répondre en un geste.",
      }
    : actif
    ? cibles.length
      ? { titre: `Rien dans #${actif.nom} pour l'instant.`, texte: "Lancez la conversation : une annonce, un rappel, une photo de la journée…" }
      : { titre: `Rien dans #${actif.nom} pour l'instant.`, texte: "Les messages de l'école apparaîtront ici." }
    : {
        titre: "Votre fil est vide.",
        texte: cibles.length
          ? "Publiez une première annonce : la rentrée, une sortie, une réunion de parents…"
          : "Les annonces de l'école et de la classe de votre enfant apparaîtront ici.",
      };

  // Pastilles du fil regroupé (aperçu par canal) : mêmes compteurs que la barre latérale.
  const nonLusParEspace = useMemo(
    () => Object.fromEntries(tous.map((e) => [e.cle, e.nonLus])),
    [tous],
  );

  const classesDialogue = barre.classes.map((c) => ({ id: c.cle.slice(7), nom: c.nom }));
  const canalEditable: CanalEdite | null =
    actif?.type === "CANAL" && info?.gerable && info.kind
      ? {
          id: actif.cle.slice(6),
          name: info.titre,
          description: info.description,
          regles: info.regles,
          membersCanPost: info.membresPeuventPublier,
          memberIds: info.membreIds,
        }
      : null;

  // Parent : le « + » reste visible ; sans enfant rattaché, la fenêtre explique quoi faire.
  const peutOuvrirDiscussion = famille
    ? true
    : (props.peutEcrireFamilles && props.eleves.length > 0) || props.collegues.length > 0;
  const barreLaterale = (replie: boolean, apresClic?: () => void) => (
    <BarreCommunaute
      baseHref={baseHref}
      famille={famille}
      barre={barre}
      conversations={props.conversations}
      actifCle={discussion ? null : espace}
      discussionId={discussion?.id ?? null}
      peutOuvrirDiscussion={peutOuvrirDiscussion}
      formsARemplir={props.formsARemplir}
      ouvrirCanal={() => setDialogue("canal")}
      ouvrirDiscussion={() => setDialogue("discussion")}
      replie={replie}
      apresClic={apresClic}
    />
  );

  // Personnel : les entrées s'affichent dans LA barre contextuelle du logiciel
  // (demande de Kory, 26 sept.), pas dans une barre propre à la page.
  const { setRendu } = useSidebarSlot();
  const rendu = useRef(barreLaterale);
  useEffect(() => {
    rendu.current = barreLaterale;
  });
  const cleBarre = JSON.stringify([barre, props.formsARemplir, props.conversations.map((c) => [c.id, c.nonLus, c.titre]), espace, discussion?.id]);
  useEffect(() => {
    if (famille) return;
    setRendu((replie) => rendu.current(replie));
    return () => setRendu(null);
  }, [famille, setRendu, cleBarre]);

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-surface">
      {/* Familles (pas de barre contextuelle dans leur espace) : même style que la barre du logiciel */}
      {famille && (
        <aside
          style={{ backgroundColor: "var(--color-sidebar-bg, #F4F6F8)" }}
          className="hidden w-[220px] shrink-0 flex-col overflow-y-auto border-r border-slate-200/90 px-1.5 py-2.5 md:flex"
        >
          {barreLaterale(false)}
        </aside>
      )}

      {/* Tiroir mobile */}
      {tiroir && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Canaux et messages">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/40" onClick={() => setTiroir(false)} />
          <aside
            style={{ backgroundColor: "var(--color-sidebar-bg, #F4F6F8)" }}
            className="relative flex h-full w-[82%] max-w-[300px] flex-col overflow-y-auto px-1.5 py-3 shadow-overlay"
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-sm font-bold text-slate-900">Communauté</p>
              <button type="button" onClick={() => setTiroir(false)} aria-label="Fermer" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-black/5">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            {barreLaterale(false, () => setTiroir(false))}
          </aside>
        </div>
      )}

      {/* Centre */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-rule px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setTiroir(true)}
            aria-label="Canaux et messages"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-soft hover:bg-sunk md:hidden"
          >
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
            {totalNonLus(props) > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}
          </button>
          {discussion ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar nom={discussion.titre} avatar={discussion.avatar} />
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-bold text-text">{discussion.titre}</h1>
                <p className="truncate text-xs text-text-soft">{discussion.sousTitre}</p>
              </div>
            </div>
          ) : vueEngagement ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-ink/10 text-primary-ink">
                <Activity aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-bold text-text">Engagement du fil</h1>
                <p className="hidden truncate text-xs text-text-soft sm:block">Ce que les familles voient vraiment, et qui relancer</p>
              </div>
            </div>
          ) : vueEnquetes ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-ink/10 text-primary-ink">
                <BarChart3 aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-bold text-text">Enquêtes</h1>
                <p className="hidden truncate text-xs text-text-soft sm:block">
                  {famille ? "Les questions et formulaires de l'école, à remplir ici" : "Sondages rapides, formulaires complets et leurs résultats"}
                  {props.sondagesHref && !famille && (
                    <>
                      {" · "}
                      <a href={props.sondagesHref} className="underline hover:text-text">
                        anciens questionnaires
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : actif ? (
            <div className="flex min-w-0 items-center gap-2">
              <IconeEspace e={actif} grand />
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-bold text-text">
                  {actif.type === "CLASSE" && !famille ? `Parents · ${actif.nom}` : actif.nom}
                </h1>
                {actif.description && <p className="hidden truncate text-xs text-text-soft sm:block">{actif.description}</p>}
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-ink/10 text-primary-ink">
                <Newspaper aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-bold text-text">Fil d&apos;actualité</h1>
                <p className="hidden truncate text-xs text-text-soft sm:block">
                  {famille ? "Tout ce que l'école partage avec vous" : "Tout ce qui se publie dans l'école"}
                </p>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            {info && !discussion && !pleine && (
              <SlackTooltip
                title="Voir tous les membres de ce canal"
                tip={
                  info.personnes && info.personnes.length > 0
                    ? `Comprend ${info.personnes.slice(0, 3).map((p) => p.nom).join(", ")}${info.personnes.length > 3 ? "..." : ""}`
                    : undefined
                }
                placement="bottom"
              >
                <button
                  type="button"
                  data-tour="comms-members-btn"
                  onClick={() => setPanneau(true)}
                  aria-label="Voir tous les membres de ce canal"
                  className="hidden items-center gap-1.5 rounded-lg border border-rule bg-surface hover:bg-sunk px-2 py-1 text-xs font-semibold text-text transition-colors lg:inline-flex shadow-2xs"
                >
                  <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                    {info.personnes && info.personnes.length > 0 ? (
                      info.personnes.slice(0, 2).map((p, idx) => (
                        <span
                          key={p.id || idx}
                          className="inline-block h-4 w-4 rounded-full ring-1 ring-white bg-purple-100 text-[8px] font-bold text-purple-800 text-center leading-[16px] overflow-hidden"
                        >
                          {p.avatar ? (
                            <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            p.nom.charAt(0).toUpperCase()
                          )}
                        </span>
                      ))
                    ) : (
                      <Users aria-hidden="true" className="h-3.5 w-3.5 text-text-soft" />
                    )}
                  </div>
                  <span className="tabular-nums text-xs font-bold text-text-soft">
                    {info.nbParents + info.nbPersonnel}
                  </span>
                </button>
              </SlackTooltip>
            )}
            {canalEditable && (
              <SlackTooltip title="Paramètres du canal" tip="Audience et autorisations de publication" placement="bottom">
                <button
                  type="button"
                  onClick={() => setDialogue({ edition: canalEditable })}
                  aria-label="Paramètres du canal"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-text-soft hover:bg-sunk"
                >
                  <Settings2 aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>
              </SlackTooltip>
            )}
            {moderateur && !discussion && !pleine && !actif && !vueSondages && (
              <SlackTooltip title="Engagement du fil" tip="Consulter les vues et relancer les familles" placement="bottom">
                <a
                  href={`${baseHref}?espace=ENGAGEMENT`}
                  aria-label="Engagement : qui a vu, qui relancer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-text-soft hover:bg-sunk hover:text-text"
                >
                  <Activity aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">Engagement</span>
                </a>
              </SlackTooltip>
            )}
            {vueEngagement && (
              <a href={baseHref} className="inline-flex h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-text-soft hover:bg-sunk hover:text-text">
                ← Retour au fil
              </a>
            )}
            {!discussion && !pleine && (
              <SlackTooltip title="Détails du canal" tip="Membres, fichiers et messages épinglés" placement="bottom" align="end">
                <button
                  type="button"
                  onClick={() => setPanneau((v) => !v)}
                  aria-pressed={panneau}
                  aria-label="Détails du canal"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${panneau ? "bg-primary-ink/10 text-primary-ink" : "text-text-soft hover:bg-sunk"}`}
                >
                  <Info aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>
              </SlackTooltip>
            )}
          </div>
        </header>
        {vueEnquetes && !discussion && (
          <nav aria-label="Enquêtes" className="flex shrink-0 gap-1 overflow-x-auto border-b border-rule px-3 sm:px-5">
            {(
              [
                ["SONDAGES", "Sondages", BarChart3, 0],
                ["FORMULAIRES", "Formulaires", ClipboardList, props.formsARemplir],
                ...(famille ? [] : ([["RESULTATS", "Résultats", PieChart, 0]] as const)),
              ] as const
            ).map(([cle, label, Ic, badge]) => {
              const actifOnglet = espace === cle;
              return (
                <a
                  key={cle}
                  href={`${baseHref}?espace=${cle}`}
                  aria-current={actifOnglet ? "page" : undefined}
                  className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${
                    actifOnglet ? "border-primary-ink text-primary-ink" : "border-transparent text-text-soft hover:text-text"
                  }`}
                >
                  <Ic aria-hidden="true" className="h-4 w-4" />
                  {label}
                  {badge > 0 && <span className="rounded-full bg-primary-ink px-1.5 text-[11px] font-bold tabular-nums text-white">{badge}</span>}
                </a>
              );
            })}
          </nav>
        )}

        {discussion ? (
          <Discussion key={discussion.id} id={discussion.id} titre={discussion.titre} avatar={discussion.avatar} messages={discussion.messages} />
        ) : vueResultats ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-ground/50">
            <EspaceResultats d={vueResultats} baseHref={baseHref} />
          </div>
        ) : vueEngagement ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-ground/50">
            <TableauEngagement d={vueEngagement} baseHref={baseHref} />
          </div>
        ) : vueFormulaires ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-ground/50">
            <Formulaires
              vue={vueFormulaires}
              baseHref={baseHref}
              classes={classesDialogue}
              personnes={props.personnes}
              sansGroupes={props.role === "TEACHER"}
              ia={props.ia}
            />
          </div>
        ) : actif && (actif.nom === "support-educom" || espace.includes("support-educom")) ? (
          <VueSupportEduCom role={props.role} />
        ) : actif && !vueSondages ? (
          // Canaux, classes et #général : messagerie façon Slack (26 sept., demande de Kory).
          <FilCanal
            key={espace}
            publications={publications}
            cible={cibles.find((c) => c.cle === espace) ?? null}
            nomEspace={actif.type === "ECOLE" ? "général" : actif.nom}
            description={actif.description}
            moderateur={moderateur}
            estParent={famille}
            peutEpingler={barre.general.peutPublier}
            personnes={props.personnes}
            ia={props.ia}
            luJusqua={props.luJusqua}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-ground/50">
            <div className="px-3 pt-3 sm:px-6 sm:pt-4">
              <ActiverNotifications />
            </div>
            {props.ia && publications.length > 0 && (
              <div className="mx-auto w-full max-w-3xl px-3 pt-3 sm:px-6">
                <BoutonAnalyseIA type="recap" id={vueSondages ? "" : espace} libelle="Récap de la semaine (IA)" />
              </div>
            )}
            <FilPublications
              publications={publications}
              cibles={cibles}
              espace={vueSondages ? "" : espace}
              sondageParDefaut={vueSondages}
              personnes={props.personnes}
              ia={props.ia}
              baseHref={baseHref}
              moderateur={moderateur}
              estParent={famille}
              peutEpingler={barre.general.peutPublier}
              vide={vide}
              nonLusParEspace={nonLusParEspace}
            />
          </div>
        )}
      </section>

      {/* Détails (bouton « i ») : volet à droite ; par-dessus le contenu sous 1280 px */}
      {!discussion && !pleine && panneau && (
        <aside
          aria-label="Détails du canal"
          className="absolute inset-y-0 right-0 z-30 flex w-[min(100%,340px)] flex-col border-l border-rule bg-surface shadow-overlay xl:static xl:z-auto xl:shadow-none"
        >
          <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-rule px-4">
            <p className="text-[15px] font-bold text-text">Détails</p>
            <button
              type="button"
              onClick={() => setPanneau(false)}
              aria-label="Fermer les détails"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-soft hover:bg-sunk"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <Panneau info={info} publications={publications} actif={actif} famille={famille} vueSondages={vueSondages} />
          </div>
        </aside>
      )}

      {dialogue === "canal" && <DialogueCanal baseHref={baseHref} invitables={props.invitables} classes={classesDialogue} fermer={() => setDialogue(null)} />}
      {dialogue && typeof dialogue === "object" && (
        <DialogueCanal
          baseHref={baseHref}
          invitables={props.invitables}
          classes={classesDialogue}
          canal={dialogue.edition}
          fermer={() => setDialogue(null)}
        />
      )}
      {dialogue === "discussion" && (
        <NouvelleDiscussion
          baseHref={baseHref}
          famille={famille}
          eleves={props.peutEcrireFamilles || famille ? props.eleves : []}
          collegues={props.collegues}
          services={props.services}
          fermer={() => setDialogue(null)}
        />
      )}
    </div>
  );
}

const totalNonLus = (p: Props) =>
  [p.barre.general, ...p.barre.canaux, ...p.barre.classes].reduce((t, e) => t + e.nonLus, 0) +
  p.conversations.reduce((t, c) => t + c.nonLus, 0);

/* ═══════════════════════ Barre latérale ═══════════════════════ */

function IconeEspace({ e, grand }: { e: Pick<EspaceVue, "type" | "kind">; grand?: boolean }) {
  const cls = grand ? "h-8 w-8 rounded-lg" : "h-6 w-6 rounded-md";
  const ic = grand ? "h-4 w-4" : "h-3.5 w-3.5";
  const Icone = e.type === "CLASSE" ? Users : e.kind === "MEMBRES" ? Lock : e.kind === "PERSONNEL" ? Briefcase : Hash;
  const teinte =
    e.type === "ECOLE"
      ? "bg-primary-ink/12 text-primary-ink"
      : e.type === "CLASSE"
        ? "bg-emerald-100 text-emerald-800"
        : e.kind === "MEMBRES"
          ? "bg-amber-100 text-amber-800"
          : e.kind === "PERSONNEL"
            ? "bg-violet-100 text-violet-800"
            : "bg-sky-100 text-sky-800";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center ${cls} ${teinte}`}>
      <Icone className={ic} />
    </span>
  );
}

/* ═══════════════════════ Panneau d'infos ═══════════════════════ */

function Panneau({
  info,
  publications,
  actif,
  famille,
  vueSondages,
}: {
  info: InfoEspace | null;
  publications: PublicationVue[];
  actif: EspaceVue | null;
  famille: boolean;
  vueSondages: boolean;
}) {
  const [onglet, setOnglet] = useState<"infos" | "epingles" | "fichiers">("infos");
  const epingles = publications.filter((p) => p.pinned);
  const fichiers = publications.flatMap((p) => p.medias.map((m) => ({ ...m, pub: p.id })));
  const onglets = [
    { id: "infos" as const, label: "Infos" },
    { id: "epingles" as const, label: `Épinglés${epingles.length ? ` (${epingles.length})` : ""}` },
    { id: "fichiers" as const, label: `Fichiers${fichiers.length ? ` (${fichiers.length})` : ""}` },
  ];

  return (
    <>
      <div className="p-3">
        <div role="tablist" className="flex gap-1 rounded-xl bg-sunk p-1">
          {onglets.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              onClick={() => setOnglet(o.id)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                onglet === o.id ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft hover:text-text"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {onglet === "infos" &&
          (info && actif ? (
            <>
              <h2 className="mt-2 text-lg font-bold text-text">Informations</h2>
              {info.description && <p className="mt-1 text-sm text-text-soft">{info.description}</p>}
              <dl className="mt-4 space-y-3 text-sm">
                <Ligne icone={<Eye className="h-4 w-4" />} terme="Visible par" valeur={info.visibilite} />
                {info.creePar && <Ligne icone={<User className="h-4 w-4" />} terme="Créé par" valeur={info.creePar} />}
                {info.creeLe && (
                  <Ligne
                    icone={<CalendarDays className="h-4 w-4" />}
                    terme="Créé le"
                    valeur={new Date(info.creeLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  />
                )}
                {actif.type === "CANAL" && (
                  <Ligne
                    icone={<PenLine className="h-4 w-4" />}
                    terme="Publient"
                    valeur={info.membresPeuventPublier ? "Tous les membres" : "Direction et secrétariat"}
                  />
                )}
                {!famille && <Ligne icone={<Users className="h-4 w-4" />} terme="Parents" valeur={String(info.nbParents)} />}
                <Ligne icone={<Briefcase className="h-4 w-4" />} terme="Personnel" valeur={String(info.nbPersonnel)} />
              </dl>
              {info.personnes.length > 0 && (
                <>
                  <h3 className="mt-6 text-lg font-bold text-text">{actif.type === "CLASSE" ? "Enseignants" : "Membres"}</h3>
                  <ul className="mt-3 space-y-3">
                    {info.personnes.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <Avatar nom={p.nom} avatar={p.avatar} taille="lg" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-text">{p.nom}</span>
                          <span className="block truncate text-xs text-text-soft">{p.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <div className="mt-2">
              <h2 className="text-lg font-bold text-text">{vueSondages ? "Sondages" : "Fil d'actualité"}</h2>
              <p className="mt-1 text-sm leading-relaxed text-text-soft">
                {vueSondages
                  ? "Chaque sondage est publié dans un canal ou une classe : seules les personnes de cet espace le voient et votent, une fois chacune. Les parents ne voient jamais les noms des autres votants."
                  : "Toutes les publications de vos canaux et de vos classes, les plus récentes en premier. Choisissez un canal à gauche pour ne voir que lui."}
              </p>
            </div>
          ))}

        {onglet === "epingles" &&
          (epingles.length ? (
            <ul className="mt-1 space-y-2">
              {epingles.map((p) => (
                <li key={p.id}>
                  <a href={`#pub-${p.id}`} className="block rounded-xl border border-rule p-3 hover:bg-sunk/60">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-ink">
                      <Pin aria-hidden="true" className="h-3 w-3" /> {p.auteur}
                    </span>
                    <span className="mt-1 line-clamp-3 text-sm text-text">{p.body || "Photo"}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-text-soft">Rien d&apos;épinglé. La direction peut épingler une annonce importante en haut du fil.</p>
          ))}

        {onglet === "fichiers" &&
          (fichiers.length ? (
            <ul className="mt-1 space-y-1.5">
              {fichiers.map((m) => (
                <li key={m.id}>
                  <a
                    href={m.kind === "PDF" ? m.url : `#pub-${m.pub}`}
                    target={m.kind === "PDF" ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-sunk/60"
                  >
                    {m.kind === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="h-9 w-9 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sunk text-text-soft">
                        {m.kind === "PDF" ? <FileText aria-hidden="true" className="h-4 w-4" /> : <ImageIcon aria-hidden="true" className="h-4 w-4" />}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-sm text-text">{m.fileName ?? (m.kind === "IMAGE" ? "Photo" : m.kind === "VIDEO" ? "Vidéo" : "Document")}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-text-soft">Les photos, vidéos et PDF partagés ici apparaîtront dans cet onglet.</p>
          ))}
      </div>
    </>
  );
}

function Ligne({ icone, terme, valeur }: { icone: React.ReactNode; terme: string; valeur: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="text-text-faint">
        {icone}
      </span>
      <dt className="flex-1 text-text-soft">{terme}</dt>
      <dd className="max-w-[55%] truncate text-right font-semibold text-text">{valeur}</dd>
    </div>
  );
}

/* ═══════════════════════ Nouveau message direct ═══════════════════════ */

function NouvelleDiscussion({
  baseHref,
  famille,
  eleves,
  collegues,
  services,
  fermer,
}: {
  baseHref: string;
  famille: boolean;
  eleves: { id: string; nom: string; classe: string }[];
  collegues: { id: string; nom: string; role: string }[];
  services: { id: string; label: string }[];
  fermer: () => void;
}) {
  const [cible, setCible] = useState<"parent" | "collegue">(eleves.length > 0 ? "parent" : "collegue");
  const router = useRouter();
  const [eleve, setEleve] = useState(eleves[0]?.id ?? "");
  const [service, setService] = useState(services[0]?.id ?? "");
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const q = recherche.toLowerCase();
  const trouves = (recherche ? eleves.filter((e) => `${e.nom} ${e.classe}`.toLowerCase().includes(q)) : eleves).slice(0, 60);
  const collegesTrouves = (recherche ? collegues.filter((c) => `${c.nom} ${c.role}`.toLowerCase().includes(q)) : collegues).slice(0, 60);

  const ouvrirCollegue = (id: string) =>
    demarrer(async () => {
      setErreur(null);
      const r = await ouvrirDiscussion({ collegueId: id });
      if (r.ok) {
        fermer();
        router.push(`${baseHref}?c=${r.id}`);
      } else setErreur(r.error);
    });

  const ouvrir = (id = eleve) =>
    demarrer(async () => {
      setErreur(null);
      const r = await ouvrirDiscussion({ studentId: id, canal: famille ? service : undefined });
      if (r.ok) {
        fermer();
        router.push(`${baseHref}?c=${r.id}`);
      } else setErreur(r.error);
    });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-dm" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-overlay sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <h2 id="titre-dm" className="text-lg font-bold text-text">Nouveau message</h2>
            <p className="text-sm text-text-soft">
              {famille ? "Écrivez à un service de l'école." : "Écrivez à un parent ou à un collègue. Les élèves ne reçoivent pas de messages."}
            </p>
          </div>
          <button type="button" onClick={fermer} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full text-text-soft hover:bg-sunk">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {famille && eleves.length === 0 ? (
            <p className="rounded-xl bg-sunk px-4 py-3 text-sm text-text-soft">
              Aucun enfant n&apos;est encore rattaché à votre compte dans cette école. Demandez au secrétariat de relier votre compte au
              dossier de votre enfant : vous pourrez alors écrire à son enseignant, au secrétariat, à la comptabilité ou à la direction.
            </p>
          ) : famille ? (
            <>
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-text">À qui ?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${
                        service === s.id ? "border-primary-ink/50 bg-primary-ink/[0.06] text-primary-ink" : "border-rule text-text hover:bg-sunk/60"
                      }`}
                    >
                      <input type="radio" name="service" className="sr-only" checked={service === s.id} onChange={() => setService(s.id)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="dm-eleve" className="mb-1.5 block text-sm font-semibold text-text">
                  À propos de
                </label>
                <select id="dm-eleve" value={eleve} onChange={(e) => setEleve(e.target.value)} className="min-h-11 w-full rounded-xl border border-rule bg-surface px-3 text-sm">
                  {eleves.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                      {e.classe ? ` (${e.classe})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {eleves.length > 0 && collegues.length > 0 && (
                <div role="tablist" className="flex gap-1 rounded-xl bg-sunk p-1">
                  {(
                    [
                      ["parent", "Un parent"],
                      ["collegue", "Un collègue"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={cible === id}
                      onClick={() => setCible(id)}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${cible === id ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-rule px-3 focus-within:border-primary-ink/40">
                <Search aria-hidden="true" className="h-4 w-4 text-text-faint" />
                <span className="sr-only">Rechercher</span>
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder={cible === "parent" ? "Nom de l'élève ou classe…" : "Nom ou fonction…"}
                  autoFocus
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
                />
              </label>
              {cible === "parent" ? (
                <ul className="overflow-hidden rounded-xl border border-rule">
                  {trouves.length === 0 && <li className="px-3 py-3 text-sm text-text-soft">Aucun élève ne correspond.</li>}
                  {trouves.map((e) => (
                    <li key={e.id} className="border-b border-rule last:border-0">
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => ouvrir(e.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-sunk/70"
                      >
                        <Avatar nom={e.nom} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-text">Parent de {e.nom}</span>
                          {e.classe && <span className="block truncate text-xs text-text-soft">{e.classe}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className="text-xs text-text-soft">Conversation privée : seuls vous deux la voyez, direction comprise.</p>
                  <ul className="overflow-hidden rounded-xl border border-rule">
                    {collegesTrouves.length === 0 && <li className="px-3 py-3 text-sm text-text-soft">Personne ne correspond.</li>}
                    {collegesTrouves.map((c) => (
                      <li key={c.id} className="border-b border-rule last:border-0">
                        <button
                          type="button"
                          disabled={enCours}
                          onClick={() => ouvrirCollegue(c.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-sunk/70"
                        >
                          <Avatar nom={c.nom} avatar={(c as { avatar?: string | null }).avatar} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-text">{c.nom}</span>
                            <span className="block truncate text-xs text-text-soft">{c.role}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          {erreur && (
            <p role="alert" className="text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
        </div>
        {famille && eleves.length > 0 && (
          <footer className="flex justify-end gap-2 border-t border-rule px-5 py-3">
            <button type="button" onClick={fermer} className="min-h-10 rounded-lg px-4 text-sm font-semibold text-text-soft hover:bg-sunk">
              Annuler
            </button>
            <button
              type="button"
              onClick={() => ouvrir()}
              disabled={enCours || !eleve || !service}
              className="min-h-10 rounded-lg bg-primary-ink px-5 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
            >
              {enCours ? "Ouverture…" : "Écrire"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
