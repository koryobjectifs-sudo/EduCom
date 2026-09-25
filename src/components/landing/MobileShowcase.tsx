"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AppleGraduationCapIcon,
  AppleCalendarCheckIcon,
  AppleWifiIcon,
  AppleUsersIcon,
  AppleWalletIcon,
  AppleNotebookIcon,
  AppleFolderCheckIcon,
  AppleReceiptIcon,
} from "@/components/ui/apple-icons";
import EduComWordmark from "@/components/brand/EduComWordmark";

/**
 * Vitrine mobile — 25 septembre 2026 (demandes Kory).
 *
 * 1. **Défilement automatique** : les écrans s'enchaînent seuls (barre de
 *    progression), pause au survol, choix au clic ; pas de rotation si
 *    `prefers-reduced-motion`.
 * 2. **Les VRAIS écrans, rien d'inventé** (Kory : « être fidèle aux
 *    fonctionnalités déjà créées, importer ce qui existe ») : le téléphone
 *    affiche la route `/vitrine/[ecran]`, qui rend les composants du produit
 *    eux-mêmes — `SecondaireTable`, `TakeAttendanceClient`, `AvatarPhoto`
 *    (fiche élève), `ScanDialog`, `FamillesClient` — avec la vraie barre du
 *    bas `MobileTabBar`. Toute évolution du produit s'y reflète d'elle-même.
 *    ⚠️ Une première version dessinait des écrans « à la main » : rejetée.
 * 3. **Fond « cahier d'écolier »** : papier crème quadrillé, marge rouge,
 *    jaune crayon — à la place du bleu nuit.
 * 4. **Téléphone interactif** (25 sept.) : le visiteur touche les vrais
 *    boutons (barre du bas, onglets, « Plus », « Encaisser »…). Les garde-fous
 *    vivent dans `VitrineEcran` ; ici, un toucher suspend la rotation.
 * 5. **Facture signée** : le vrai formulaire « Nouvelle facture », signature
 *    tracée sur le vrai `SignaturePad`, puis l'aperçu A4 signé.
 */

const SCENES = [
  {
    id: "notes",
    nom: "Saisie des notes",
    metier: "Enseignant",
    court: "Notes",
    icon: AppleGraduationCapIcon,
    titre: "La grille de saisie des notes, sur le téléphone",
    texte:
      "Devoirs et composition par élève, trimestre et matière choisis en un geste, coefficient affiché. L'enseignant saisit en classe, puis soumet sa saisie.",
  },
  {
    id: "appel",
    nom: "Appel journalier",
    metier: "Enseignant",
    court: "Appel",
    icon: AppleCalendarCheckIcon,
    titre: "L'appel : présent, absent ou en retard, d'un geste",
    texte:
      "Chaque élève a ses trois boutons. « Tous présents » coche toute la classe en une fois : il ne reste qu'à marquer les absents.",
  },
  {
    id: "profil",
    nom: "Photo de l'élève",
    metier: "Secrétariat",
    court: "Photo",
    icon: AppleUsersIcon,
    titre: "La photo de l'élève, prise depuis sa fiche",
    texte:
      "Sur la fiche de l'élève, un appui sur l'avatar : « Prendre une photo » ouvre l'appareil du téléphone, ou « Importer une photo » depuis la galerie.",
  },
  {
    id: "scan",
    nom: "Scan de pièces",
    metier: "Secrétariat",
    court: "Scan",
    icon: AppleFolderCheckIcon,
    titre: "Les pièces du dossier, scannées avec le téléphone",
    texte:
      "« Ajouter une pièce au dossier » : scanner la pièce page après page avec l'appareil photo, ou importer un fichier (PDF, JPEG, PNG…). Les pièces restent privées à l'établissement.",
  },
  {
    id: "finances",
    nom: "Suivi des familles",
    metier: "Comptabilité",
    court: "Finances",
    icon: AppleWalletIcon,
    titre: "Qui a payé, qui est en retard, ce qui reste à recouvrer",
    texte:
      "Le suivi par famille : total dû, total encaissé, reliquat global, et les familles en retard ou en paiement partiel, d'un coup d'œil. « Encaisser » enregistre le versement.",
  },
  {
    id: "facture",
    nom: "Facture signée",
    metier: "Comptabilité",
    court: "Facture",
    icon: AppleReceiptIcon,
    titre: "Une facture émise et signée au doigt, sur le téléphone",
    texte:
      "« Nouvelle facture » : l'élève, les lignes, l'échéance, puis la signature tracée à l'écran. L'aperçu A4 montre la facture signée, prête à télécharger ou à envoyer par e-mail ou WhatsApp.",
  },
] as const;

type SceneId = (typeof SCENES)[number]["id"];
/** Durée d'affichage d'une scène ; la facture joue une saisie complète. */
const duree = (id: SceneId) => (id === "facture" ? 15000 : 6500);
/** Après un toucher dans le téléphone, la rotation attend ce délai. */
const PAUSE_EXPLORATION_MS = 20000;

/** Fond papier quadrillé (cahier) : lignes bleu pâle tous les 24 px + marge rouge. */
const CAHIER: React.CSSProperties = {
  backgroundColor: "#FFFBF2",
  backgroundImage:
    "linear-gradient(rgba(31,78,140,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(31,78,140,0.07) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};

export default function MobileShowcase() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<SceneId>("notes");
  const [survol, setSurvol] = useState(false);
  const [explore, setExplore] = useState(false);
  const paused = survol || explore;
  const [cycle, setCycle] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Un toucher dans le téléphone (message de l'iframe) suspend la rotation.
  useEffect(() => {
    let reprise: ReturnType<typeof setTimeout> | null = null;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "vitrine:interaction") return;
      setExplore(true);
      if (reprise) clearTimeout(reprise);
      reprise = setTimeout(() => setExplore(false), PAUSE_EXPLORATION_MS);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (reprise) clearTimeout(reprise);
    };
  }, []);

  useEffect(() => {
    if (reduce || paused) return;
    timer.current = setTimeout(() => {
      setActive((cur) => {
        const i = SCENES.findIndex((s) => s.id === cur);
        return SCENES[(i + 1) % SCENES.length].id;
      });
      setCycle((c) => c + 1);
    }, duree(active));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, paused, reduce, cycle]);

  const choisir = (id: SceneId) => {
    setActive(id);
    setCycle((c) => c + 1);
  };

  const scene = SCENES.find((s) => s.id === active)!;

  return (
    <section id="mobile" className="relative overflow-hidden py-20 lg:py-28" style={CAHIER}>
      {/* Marge rouge du cahier */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-6 w-px bg-[#E0525A]/35 sm:left-12" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[27px] w-px bg-[#E0525A]/20 sm:left-[51px]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#FFE7A3] px-3.5 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7A5200]">
            <AppleNotebookIcon aria-hidden="true" className="h-3.5 w-3.5" /> Sur le téléphone
          </p>
          <h2 className="mt-5 font-display text-[1.7rem] font-bold leading-[1.15] text-m-navy sm:text-[2.15rem]">
            Toute l&apos;école dans la poche.
            <br />
            <span className="text-m-blue">Pour chaque métier de l&apos;établissement.</span>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-m-ink-soft">
            Enseignants, secrétariat, comptabilité, direction&nbsp;: chacun retrouve ses écrans <EduComWordmark /> sur
            son téléphone — notes, appel, dossiers des élèves, encaissements. Dans le navigateur, sans application à installer.
          </p>
        </div>

        {/* Sélecteur mobile : pastilles défilantes (masqué sur ordinateur, où la liste de droite sert de sélecteur) */}
        <div className="mt-8 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            {SCENES.map((s) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => choisir(s.id)}
                  aria-pressed={on}
                  className={`relative min-h-11 overflow-hidden rounded-full px-4 text-[13.5px] font-semibold ring-1 transition-colors ${
                    on ? "bg-m-navy text-white ring-m-navy" : "bg-white text-m-ink-soft ring-m-sky-deep"
                  }`}
                >
                  {s.court}
                  {on && !reduce && !paused && (
                    <motion.span
                      key={`${s.id}-${cycle}`}
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 h-[3px] bg-[#F5B82E]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: duree(s.id) / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="mt-10 grid grid-cols-1 items-center gap-12 lg:mt-14 lg:grid-cols-12"
          onMouseEnter={() => setSurvol(true)}
          onMouseLeave={() => setSurvol(false)}
        >
          {/* Téléphone */}
          <div className="flex justify-center lg:col-span-6">
            <div className="flex flex-col items-center gap-4">
              <Telephone>
                <EcransReels active={active} />
              </Telephone>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-m-ink-soft ring-1 ring-m-sky-deep">
                <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-[#F5B82E]" />
                Touchez l&apos;écran pour explorer <EduComWordmark />
              </p>
            </div>
          </div>

          {/* Description — mobile : la scène en cours */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl bg-white/85 p-5 ring-1 ring-m-sky-deep backdrop-blur-sm"
              >
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-m-blue">
                  {scene.nom} <span className="text-m-ink-faint">· {scene.metier}</span>
                </p>
                <h3 className="mt-1 font-display text-[1.1rem] font-bold text-m-navy">{scene.titre}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-m-ink-soft">{scene.texte}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Description — ordinateur : la liste des scènes sert de sélecteur */}
          <ul className="hidden space-y-2 lg:col-span-6 lg:block">
            {SCENES.map((s) => {
              const on = s.id === active;
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => choisir(s.id)}
                    aria-pressed={on}
                    className={`relative w-full overflow-hidden rounded-2xl px-4 py-3 text-left transition-all ${
                      on
                        ? "bg-white shadow-[0_18px_40px_-24px_rgba(10,35,66,0.45)] ring-1 ring-m-sky-deep"
                        : "bg-white/50 ring-1 ring-transparent hover:bg-white/80"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          on ? "bg-[#FFE7A3] text-[#7A5200]" : "bg-m-sky text-m-blue"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-m-blue">
                          {s.nom} <span className="text-m-ink-faint">· {s.metier}</span>
                        </p>
                        <h3 className="mt-0.5 font-display text-[15px] font-bold leading-snug text-m-navy">{s.titre}</h3>
                        <AnimatePresence initial={false}>
                          {on && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-1.5 overflow-hidden text-[13.5px] leading-[1.55] text-m-ink-soft"
                            >
                              {s.texte}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {on && !reduce && !paused && (
                      <motion.span
                        key={`${s.id}-${cycle}`}
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 h-[3px] bg-[#F5B82E]"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: duree(s.id) / 1000, ease: "linear" }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ Châssis du téléphone ═══════════════════════ */

/** Téléphone dessiné : 320 × 680 px. L'écran utile fait 292 px de large. */
const TEL = { w: 320, h: 680 };
/** Largeur CSS d'un iPhone : l'écran réel est rendu à 390 px puis réduit. */
const IPHONE_W = 390;
const ECHELLE = (TEL.w - 2 * 5 - 2 * 9) / IPHONE_W; // 292 / 390

function Telephone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute -left-[8px] top-[120px] h-[28px] w-[4px] rounded-l bg-[#2E333D]" />
      <div aria-hidden="true" className="absolute -left-[8px] top-[165px] h-[48px] w-[4px] rounded-l bg-[#2E333D]" />
      <div aria-hidden="true" className="absolute -right-[8px] top-[180px] h-[70px] w-[4px] rounded-r bg-[#2E333D]" />
      {/* ⚠️ Dimensions en style inline, pas en classes arbitraires Tailwind :
          sur le poste de Kory (Safari, serveur de dev), les classes h-[…]/w-[…]
          n'avaient pas été générées et le téléphone s'effondrait en un petit
          rectangle. Le style inline ne dépend d'aucune compilation CSS. */}
      <div
        className="relative border-[#2E333D] bg-[#121316]"
        style={{
          width: TEL.w, height: TEL.h, borderRadius: 50, borderWidth: 5, borderStyle: "solid", padding: 9,
          boxShadow: "0 40px 80px -30px rgba(10,35,66,0.55)",
        }}
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden bg-[#0E2541] select-none"
          style={{ borderRadius: 40 }}
        >
          {/* Barre de statut du téléphone */}
          <div className="relative z-30 flex h-10 shrink-0 items-center justify-between bg-[#0E2541] px-6 pt-1 text-[12px] font-semibold text-white">
            <span className="tabular-nums">9:41</span>
            <div aria-hidden="true" className="absolute left-1/2 top-2 h-[26px] w-[105px] -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center gap-1">
              <AppleWifiIcon className="h-3.5 w-3.5" />
              <div className="h-2.5 w-5 rounded-[3px] border-[1.5px] border-white p-[1px]">
                <div className="h-full w-4/5 rounded-[1px] bg-white" />
              </div>
            </div>
          </div>
          <div className="relative flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Écrans réels ═══════════════════════ */

/**
 * Les VRAIS écrans d'EduCom (route `/vitrine/[ecran]`), dans un <iframe> de
 * 390 px — la largeur d'un iPhone — réduit à la taille du téléphone dessiné.
 * Rien n'est redessiné ici : c'est le produit, avec des données d'exemple.
 *
 * Chargés seulement quand la section approche de l'écran, puis gardés montés
 * (masqués) pour que la rotation ne recharge rien.
 *
 * Seul l'écran affiché reçoit les touchers. À chaque changement de scène, il
 * reçoit `vitrine:activer` : il revient sur son écran s'il avait été quitté,
 * et rejoue sa démonstration (menu photo, signature de la facture…).
 */
function EcransReels({ active }: { active: SceneId }) {
  const zone = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const iframes = useRef<Partial<Record<SceneId, HTMLIFrameElement | null>>>({});

  useEffect(() => {
    iframes.current[active]?.contentWindow?.postMessage(
      { type: "vitrine:activer", ecran: active },
      window.location.origin,
    );
  }, [active]);

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Les 5 écrans partagent les mêmes fichiers JavaScript (mis en cache après
  // le premier) : les monter ensemble évite tout rechargement pendant la rotation.
  const charges = visible ? SCENES.map((s) => s.id) : [];

  return (
    <div ref={zone} className="absolute inset-0 overflow-hidden bg-[#0E2541]">
      {charges.map((id) => (
        <iframe
          key={id}
          ref={(el) => {
            iframes.current[id] = el;
          }}
          src={`/vitrine/${id}`}
          title={`Écran EduCom : ${SCENES.find((s) => s.id === id)?.nom}`}
          tabIndex={id === active ? 0 : -1}
          aria-hidden={id !== active}
          loading="lazy"
          className={`absolute left-0 top-0 border-0 transition-opacity duration-300 ${
            id === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{
            width: IPHONE_W,
            height: Math.ceil((TEL.h - 2 * 5 - 2 * 9 - 40) / ECHELLE),
            transform: `scale(${ECHELLE})`,
            transformOrigin: "0 0",
          }}
        />
      ))}
    </div>
  );
}
