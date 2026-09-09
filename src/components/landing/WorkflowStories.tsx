"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Receipt,
  CheckCircle2,
  Printer,
  GraduationCap,
  MessageCircle,
  AlertTriangle,
  UserPlus,
  Users,
} from "lucide-react";
import ScreenFrame from "./ScreenFrame";

/**
 * « Quatre parcours » — passe d'ajustement du 7 septembre 2026.
 *
 * Remplace `ConnectedSystem.tsx` (supprimé). Kory a demandé quatre récits de
 * bout en bout précis — facturation, notes/bulletins, présences, admission —
 * plutôt qu'une chaîne unique de onze étapes. Raconter Notes et Présences une
 * deuxième fois dans un mécanisme séparé aurait répété le même message sous
 * une autre forme (ce que le brief interdit explicitement) : les quatre
 * onglets ABSORBENT donc l'ancienne chaîne au lieu de s'y ajouter.
 *
 * ⚠️ « Admission » n'est PAS un formulaire self-service côté parent — ce
 * produit n'en a pas (vérifié : aucune route parent d'admission n'existe,
 * `students/new` est un écran staff). Reformulé honnêtement : le secrétariat
 * inscrit l'élève, le dossier existe, il rejoint l'annuaire.
 *
 * ═══ MÉCANIQUE ═══
 *
 * Quatre onglets en pilule (même langage que `RolesSection`). Chaque onglet
 * défile automatiquement ses étapes — barre de progression par étape,
 * fondu enchaîné du panneau (même technique `AnimatePresence` que le reste de
 * la page). Pause au survol/focus. Chaque étape est aussi cliquable
 * directement. `prefers-reduced-motion` coupe l'avance automatique — les
 * étapes restent navigables à la main.
 *
 * ═══ CE QUI EST RÉEL, CE QUI EST UN MOCKUP ═══
 *
 * `chaine-notes.png`, `chaine-presences.png`, `fiche-aissatou.png` sont de
 * vraies captures, déjà utilisées ailleurs sur la page (même dossier, preuve
 * répétée à dessein). La facturation n'a pas de capture — `/dashboard/payments/
 * invoice` est authentifié et aucune capture live n'a été prise cette passe ;
 * ses quatre écrans sont des mockups construits, jamais présentés comme réels.
 * Les étapes de validation/impression (notes, présences, admission) sont pour
 * la même raison des mockups courts plutôt que des captures dédiées.
 */
const STEP_MS = 4200;
const TICK_MS = 60;

type Etape = { titre: string; detail: string; visuel: React.ReactNode };
type Histoire = { id: string; nom: string; etapes: Etape[] };

const HISTOIRES: Histoire[] = [
  {
    id: "facturation",
    nom: "Facturation",
    etapes: [
      {
        titre: "Le gestionnaire ouvre les paiements",
        detail: "Un élève, un trimestre, un montant à régler — pas une feuille à retrouver.",
        visuel: (
          <ScreenFrame label="Paiements — Aïssatou Ndiaye">
            <div className="flex items-center justify-between border-b border-m-line-soft pb-3">
              <p className="text-[13.5px] font-medium text-m-ink">Frais de scolarité — Trimestre 2</p>
              <p className="text-[13.5px] font-semibold tabular-nums text-m-ink-soft">45 000 FCFA</p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12.5px] font-semibold text-m-accent-deep">
              <Receipt aria-hidden="true" className="h-4 w-4" />
              Générer la facture
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "La facture est générée",
        detail: "Numérotée, calculée, datée — automatiquement.",
        visuel: (
          <ScreenFrame label="Facture N°2026-0142">
            <div className="flex items-start gap-3">
              <Receipt aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <div>
                <p className="text-[15px] font-semibold text-m-ink">Facture N°2026-0142</p>
                <p className="mt-1 text-[13px] text-m-ink-soft">Aïssatou Ndiaye · CM2 · 7 septembre 2026</p>
                <p className="mt-2 font-display text-[1.5rem] font-semibold tabular-nums text-m-ink">45 000 FCFA</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Elle est validée",
        detail: "Un contrôle avant l'impression, pas après.",
        visuel: (
          <ScreenFrame label="Facture N°2026-0142">
            <div className="flex items-center gap-3">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 text-m-signal" />
              <div>
                <p className="text-[15px] font-semibold text-m-ink">Validée</p>
                <p className="mt-1 text-[13px] text-m-ink-soft">Par la direction, avant remise à la famille.</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Prête à imprimer",
        detail: "Le même document, prêt pour la famille — rien à retaper.",
        visuel: (
          <ScreenFrame label="Facture N°2026-0142">
            <div className="flex items-center gap-3">
              <Printer aria-hidden="true" className="h-6 w-6 shrink-0 text-m-accent-deep" />
              <p className="text-[14px] font-medium text-m-ink-soft">Facture-2026-0142.pdf</p>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: "notes",
    nom: "Notes & bulletins",
    etapes: [
      {
        titre: "L'enseignant saisit les notes",
        detail: "Trimestre par trimestre, matière par matière.",
        visuel: (
          <ScreenFrame
            label="Notes — Mathématiques"
            src="/marketing/chaine-notes.png"
            alt="Écran réel de saisie des notes en CM2, Mathématiques"
            width={2400}
            height={1000}
            sizes="(min-width: 1024px) 620px, 90vw"
          />
        ),
      },
      {
        titre: "Le directeur valide",
        detail: "Un contrôle avant publication aux familles — le cachet de l'école, pas juste une case cochée.",
        visuel: (
          <ScreenFrame label="Notes — Mathématiques">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 -rotate-6 items-center justify-center rounded-full border-[2.5px] border-m-signal">
                <span className="text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-m-signal">
                  Approuvé
                </span>
              </div>
              <p className="text-[14px] font-medium text-m-ink-soft">Validées par la direction, avant publication aux familles.</p>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Le bulletin est généré",
        detail: "Moyenne calculée, mise en page automatique.",
        visuel: (
          <ScreenFrame label="Bulletin — CM2, Trimestre 2">
            <div className="flex items-center gap-4">
              <GraduationCap aria-hidden="true" className="h-8 w-8 shrink-0 text-m-accent-deep" />
              <div>
                <p className="font-display text-[1.75rem] font-semibold tabular-nums text-m-ink">12,8/20</p>
                <p className="mt-1 text-[13px] text-m-ink-soft">moyenne générale, calculée automatiquement</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Le secrétariat imprime",
        detail: "Le même document, sans le retaper.",
        visuel: (
          <ScreenFrame label="Bulletin — CM2, Trimestre 2">
            <div className="flex items-center gap-3">
              <Printer aria-hidden="true" className="h-6 w-6 shrink-0 text-m-accent-deep" />
              <p className="text-[14px] font-medium text-m-ink-soft">Bulletin-CM2-T2.pdf</p>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: "presences",
    nom: "Présences",
    etapes: [
      {
        titre: "L'enseignant ouvre sa classe",
        detail: "Présente ou absente, en un geste.",
        visuel: (
          <ScreenFrame
            label="Présences — CM2"
            src="/marketing/chaine-presences.png"
            alt="Écran réel de saisie des présences en CM2, Aïssatou Ndiaye marquée absente"
            width={2400}
            height={950}
            sizes="(min-width: 1024px) 620px, 90vw"
          />
        ),
      },
      {
        titre: "Une absence est enregistrée",
        detail: "Immédiatement — pas reconstituée depuis un cahier le soir.",
        visuel: (
          <ScreenFrame label="Présences — aujourd'hui">
            <div className="flex items-center gap-4">
              <AlertTriangle aria-hidden="true" className="h-7 w-7 shrink-0 text-m-alert" />
              <div>
                <p className="font-display text-[1.5rem] font-semibold tabular-nums text-m-ink">1 absence</p>
                <p className="mt-1 text-[13px] text-m-ink-soft">Aïssatou Ndiaye, CM2</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Sa famille est prévenue",
        detail: "Un message part vers le bon contact, depuis son dossier.",
        visuel: (
          <ScreenFrame label="Message WhatsApp">
            <div className="flex items-start gap-3">
              <MessageCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-m-ink-faint">À : Mme Ndiaye</p>
                <p className="mt-1.5 text-[14px] leading-[1.5] text-m-ink">« Aïssatou est absente ce matin. »</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Le directeur le voit",
        detail: "Sans appeler le secrétariat ni consulter un cahier.",
        visuel: (
          <ScreenFrame label="Pilotage — aujourd'hui">
            <div className="flex items-center gap-3">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 text-m-signal" />
              <p className="text-[14px] font-medium text-m-ink-soft">Absence signalée et déjà répondue</p>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: "admission",
    nom: "Admission",
    etapes: [
      {
        titre: "Le secrétariat inscrit l'élève",
        detail: "Une seule fois — tout le reste s'appuie dessus.",
        visuel: (
          <ScreenFrame label="Nouvel élève">
            <div className="flex items-start gap-3">
              <UserPlus aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <div className="space-y-2 text-[13px]">
                <p className="text-m-ink-soft">Nom · <span className="font-medium text-m-ink">Aïssatou Ndiaye</span></p>
                <p className="text-m-ink-soft">Classe · <span className="font-medium text-m-ink">CM2</span></p>
                <p className="text-m-ink-soft">Parent · <span className="font-medium text-m-ink">Mme Ndiaye</span></p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Son dossier existe",
        detail: "Identité, classe, famille : déjà réunis, rien à ressaisir.",
        visuel: (
          <ScreenFrame
            label="Dossier — Aïssatou Ndiaye"
            src="/marketing/fiche-aissatou.png"
            alt="Fiche élève EduCom : identité, classe et dossier d'Aïssatou Ndiaye"
            width={2277}
            height={521}
            sizes="(min-width: 1024px) 620px, 90vw"
          />
        ),
      },
      {
        titre: "Il rejoint l'annuaire",
        detail: "Visible par son enseignant, sans ressaisie.",
        visuel: (
          <ScreenFrame label="Annuaire — CM2">
            <div className="flex items-start gap-3">
              <Users aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <ul className="space-y-1.5 text-[13.5px] text-m-ink-soft">
                <li className="font-semibold text-m-ink">Aïssatou Ndiaye</li>
                <li>Moussa Diop</li>
                <li>Fatou Sarr</li>
              </ul>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
];

export default function WorkflowStories() {
  const [histoireId, setHistoireId] = useState(HISTOIRES[0].id);
  const [etapeIndex, setEtapeIndex] = useState(0);
  const [progres, setProgres] = useState(0);
  const [pause, setPause] = useState(false);
  const reduitMotion = useReducedMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const histoire = HISTOIRES.find((h) => h.id === histoireId) ?? HISTOIRES[0];

  function choisirHistoire(id: string) {
    setHistoireId(id);
    setEtapeIndex(0);
    setProgres(0);
  }

  function choisirEtape(i: number) {
    setEtapeIndex(i);
    setProgres(0);
  }

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pause || reduitMotion) return;

    intervalRef.current = setInterval(() => {
      setProgres((p) => {
        if (p + (TICK_MS / STEP_MS) * 100 >= 100) {
          setEtapeIndex((i) => (i + 1) % histoire.etapes.length);
          return 0;
        }
        return p + (TICK_MS / STEP_MS) * 100;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [histoireId, etapeIndex, pause, reduitMotion, histoire.etapes.length]);

  return (
    <section id="systeme" className="scroll-mt-20 bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">Le système</p>
          <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
            Quatre parcours réels, montrés en train de se dérouler.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            Ce qu&apos;une seule fiche élève déclenche automatiquement, dans le produit tel
            qu&apos;il existe aujourd&apos;hui.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2 rounded-pill bg-m-paper p-1.5 sm:mx-auto sm:w-fit">
          {HISTOIRES.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => choisirHistoire(h.id)}
              aria-pressed={h.id === histoireId}
              className={`shrink-0 rounded-pill px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                h.id === histoireId ? "bg-m-ink text-white shadow-m-lift" : "text-m-ink-soft hover:text-m-ink"
              }`}
            >
              {h.nom}
            </button>
          ))}
        </div>

        <div
          className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[5fr_7fr] lg:gap-12"
          onMouseEnter={() => setPause(true)}
          onMouseLeave={() => setPause(false)}
          onFocus={() => setPause(true)}
          onBlur={() => setPause(false)}
        >
          <ol className="flex flex-col gap-1">
            {histoire.etapes.map((e, i) => {
              const actif = i === etapeIndex;
              return (
                <li key={e.titre}>
                  <button
                    type="button"
                    onClick={() => choisirEtape(i)}
                    aria-current={actif}
                    className="w-full py-2.5 text-left"
                  >
                    <p className={`text-[15px] font-semibold transition-colors ${actif ? "text-m-ink" : "text-m-ink-faint"}`}>
                      {e.titre}
                    </p>
                    {actif && (
                      <p className="mt-1 text-[13.5px] leading-[1.55] text-m-ink-soft">{e.detail}</p>
                    )}
                    <div className="mt-2 h-[3px] w-full overflow-hidden rounded-pill bg-m-line-soft">
                      <div
                        className="h-full rounded-pill bg-m-accent-deep"
                        style={{ width: `${actif ? progres : i < etapeIndex ? 100 : 0}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${histoireId}-${etapeIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reduitMotion ? 0 : 0.35 }}
              >
                {histoire.etapes[etapeIndex].visuel}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-[12.5px] leading-relaxed text-m-ink-faint">
          Notes et présences sont des écrans réels. La facturation et l&apos;admission illustrent
          le fonctionnement du produit — données d&apos;exemple.
        </p>
      </div>
    </section>
  );
}
