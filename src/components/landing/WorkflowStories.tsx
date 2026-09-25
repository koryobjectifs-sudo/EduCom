"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AppleReceiptIcon,
  AppleCheckIcon,
  AppleGraduationCapIcon,
  AppleUserPlusIcon,
  AppleUsersIcon,
  AppleFileTextIcon,
  AppleFolderCheckIcon,
} from "@/components/ui/apple-icons";
import ScreenFrame from "./ScreenFrame";
import EduComWordmark from "@/components/brand/EduComWordmark";

/**
 * « Quatre parcours majeurs » — Repositionnement marketing.
 * 
 * Aligné sur les 4 leviers de valeur immédiate du produit actuel :
 * 1. Admissions & Dossiers élèves
 * 2. Notes & Bulletins officiels Sénégal
 * 3. Facturation & Reçus de paiement
 * 4. Documents administratifs automatiques
 */
const STEP_MS = 4200;
const TICK_MS = 60;

type Etape = { titre: string; detail: string; visuel: React.ReactNode };
type Histoire = { id: string; nom: string; etapes: Etape[] };

const HISTOIRES: Histoire[] = [
  {
    id: "admission",
    nom: "Inscriptions & Dossiers",
    etapes: [
      {
        titre: "Le secrétariat inscrit l'élève",
        detail: "Nom, classe, date de naissance, tuteur — une seule saisie initiale rapide.",
        visuel: (
          <ScreenFrame label="Nouvelle admission — Secrétariat">
            <div className="flex items-start gap-3">
              <AppleUserPlusIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <div className="space-y-2 text-[13px]">
                <p className="text-m-ink-soft">Élève · <span className="font-medium text-m-ink">Aïssatou Ndiaye</span></p>
                <p className="text-m-ink-soft">Niveau & Classe · <span className="font-medium text-m-ink">CM2 A (Élémentaire)</span></p>
                <p className="text-m-ink-soft">Parent référent · <span className="font-medium text-m-ink">Mme Ndiaye (+221 77 ...)</span></p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Le dossier numérique est créé",
        detail: "Matricule attribué automatiquement, pièces d'état civil rattachées sans paperasse égarée.",
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
        titre: "Intégration directe à l'annuaire",
        detail: "L'élève apparaît instantanément dans la classe : prêt pour les notes, les présences et la scolarité.",
        visuel: (
          <ScreenFrame label="Annuaire officiel — CM2 A">
            <div className="flex items-start gap-3">
              <AppleUsersIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <ul className="space-y-1.5 text-[13.5px] text-m-ink-soft w-full">
                <li className="font-semibold text-m-ink flex items-center justify-between">
                  <span>Aïssatou Ndiaye</span>
                  <span className="text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Inscrite</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Moussa Diop</span>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Inscrit</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Fatou Sarr</span>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Inscrite</span>
                </li>
              </ul>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: "notes",
    nom: "Notes & Bulletins",
    etapes: [
      {
        titre: "L'enseignant saisit les notes",
        detail: "Grille claire et fluide adaptée au système sénégalais, avec ou sans sous-matières.",
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
        titre: "Calculs automatiques",
        detail: "Moyennes, coefficients, totaux et rangs sont calculés sans aucune erreur de calculatrice.",
        visuel: (
          <ScreenFrame label="Calculs & Moyennes — Automatique">
            <div className="flex items-center gap-4">
              <AppleGraduationCapIcon aria-hidden="true" className="h-8 w-8 shrink-0 text-m-accent-deep" />
              <div>
                <p className="font-display text-[1.75rem] font-semibold tabular-nums text-m-ink">14,85 / 20</p>
                <p className="mt-1 text-[13px] text-m-ink-soft">Moyenne générale calculée · Rang : 3e / 38 élèves</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Le bulletin officiel est prêt",
        detail: "Mise en page conforme primaire ou secondaire, visas, prêt à imprimer ou remettre aux parents.",
        visuel: (
          <ScreenFrame label="Bulletin officiel Sénégal — PDF">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AppleFileTextIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-m-accent-deep" />
                <div>
                  <p className="text-[14px] font-semibold text-m-ink">Bulletin-T1-CM2.pdf</p>
                  <p className="text-[12px] text-m-ink-soft">En-tête officiel, tableau des disciplines & visa direction</p>
                </div>
              </div>
              <span className="rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">Conforme</span>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: "facturation",
    nom: "Facturation & Reçus",
    etapes: [
      {
        titre: "Gestion des frais scolaires",
        detail: "Inscriptions et mensualités configurées par niveau, avec vision claire des échéances.",
        visuel: (
          <ScreenFrame label="Frais de scolarité — Aïssatou Ndiaye">
            <div className="flex items-center justify-between border-b border-m-line-soft pb-3">
              <p className="text-[13.5px] font-medium text-m-ink">Mensualité Novembre 2026</p>
              <p className="text-[13.5px] font-semibold tabular-nums text-m-ink-soft">45 000 FCFA</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-m-ink-soft">Statut : En attente</span>
              <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-m-accent-deep">
                <AppleReceiptIcon aria-hidden="true" className="h-4 w-4" />
                Générer la facture
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Facture numérotée générée",
        detail: "Numérotation séquentielle officielle, mention de la classe et du payeur.",
        visuel: (
          <ScreenFrame label="Facture N°FAC-2026-0142">
            <div className="flex items-start gap-3">
              <AppleReceiptIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-m-accent-deep" />
              <div>
                <p className="text-[15px] font-semibold text-m-ink">Facture N°FAC-2026-0142</p>
                <p className="mt-1 text-[13px] text-m-ink-soft">Aïssatou Ndiaye · CM2 A · 45 000 FCFA</p>
                <p className="mt-2 text-[12px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">Enregistrée en comptabilité</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Reçu officiel délivré",
        detail: "Format A4 standard ou Demi-A4 économique, avec logo et cachet de l'école prêts pour la famille.",
        visuel: (
          <ScreenFrame label="Reçu officiel — Paiement validé">
            <div className="flex items-center gap-3">
              <AppleCheckIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-m-signal" />
              <div>
                <p className="text-[14px] font-semibold text-m-ink">Reçu N°REC-2026-0142</p>
                <p className="text-[12px] text-m-ink-soft">Format A4 ou Demi-A4 · Tampon et visa intégrés</p>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: "documents",
    nom: "Documents scolaires",
    etapes: [
      {
        titre: "Sélectionnez le document demandé",
        detail: "Certificat de scolarité, attestation d'inscription, convocation ou fiche de radiation.",
        visuel: (
          <ScreenFrame label="Générateur de pièces officielles">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-m-line bg-white p-2.5">
                <div className="flex items-center gap-2 text-[13px] font-medium text-m-ink">
                  <AppleFileTextIcon className="h-4 w-4 text-m-accent-deep" />
                  Certificat de scolarité
                </div>
                <span className="text-[11px] font-semibold text-m-accent-deep">1 clic</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-m-line/50 bg-white/60 p-2.5 text-m-ink-soft text-[13px]">
                <div className="flex items-center gap-2">
                  <AppleFolderCheckIcon className="h-4 w-4 text-m-ink-faint" />
                  Attestation d&apos;inscription
                </div>
              </div>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Données injectées sans retaper",
        detail: "Identité de l'élève, classe, année scolaire et coordonnées sont remplies automatiquement.",
        visuel: (
          <ScreenFrame label="Prévisualisation officielle">
            <div className="border border-m-line bg-white p-3 rounded text-[12px] space-y-1.5 text-m-ink">
              <p className="font-bold text-center border-b pb-1 text-m-ink">CERTIFICAT DE SCOLARITÉ</p>
              <p className="text-m-ink-soft">« Le Directeur certifie que l&apos;élève <strong className="text-m-ink">Aïssatou Ndiaye</strong> est régulièrement inscrit(e) en classe de <strong className="text-m-ink">CM2 A</strong> pour l&apos;année scolaire en cours. »</p>
            </div>
          </ScreenFrame>
        ),
      },
      {
        titre: "Prêt à remettre au parent",
        detail: "En-tête officiel de l'école, cachet et signature : le parent repart avec son document en 30 secondes.",
        visuel: (
          <ScreenFrame label="Document finalisé">
            <div className="flex items-center gap-3">
              <AppleFileTextIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-m-accent-deep" />
              <div>
                <p className="text-[14px] font-semibold text-m-ink">Certificat-Scolarite-Aissatou.pdf</p>
                <p className="text-[12px] text-m-ink-soft">Cachet officiel et signature de la direction appliqués</p>
              </div>
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
    <section id="parcours" className="scroll-mt-20 bg-m-card relative">
      <div id="systeme" className="absolute -top-20" />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-blue"><EduComWordmark /> en action</p>
          <h2 className="mt-4 font-display text-[1.7rem] font-bold leading-[1.15] text-m-navy sm:text-[2.15rem]">
            De l&apos;inscription au bulletin, une seule saisie.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            De l&apos;admission d&apos;un élève à l&apos;édition de ses bulletins et reçus :
            l&apos;information circule sans double saisie et sans calculatrice.
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
                h.id === histoireId ? "bg-m-navy text-white shadow-m-lift" : "text-m-ink-soft hover:text-m-ink"
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

        {/* Opérations de soutien (Tier 3) — ex-`SupportingOperations`, ramenées à une ligne. */}
        <div id="operations" className="mx-auto mt-14 flex max-w-4xl scroll-mt-24 flex-col items-center gap-4 border-t border-m-line-soft pt-10 sm:flex-row sm:justify-center">
          <span className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.12em] text-m-ink-faint">Et aussi</span>
          <ul className="flex flex-wrap justify-center gap-2">
            {["Import Excel de l'annuaire", "Présences élèves et enseignants", "Liaison famille par WhatsApp", "Sondages en ligne"].map((t) => (
              <li key={t} className="rounded-pill bg-m-paper px-3.5 py-2 text-[13px] font-medium text-m-ink-soft ring-1 ring-m-line-soft">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-[12.5px] leading-relaxed text-m-ink-faint">
          Notes et présences sont des écrans réels. La facturation et l&apos;admission illustrent
          le fonctionnement du produit — données d&apos;exemple.
        </p>
      </div>
    </section>
  );
}
