"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Check, FileSpreadsheet, FileText, GraduationCap, MessageCircle, Receipt, Search } from "lucide-react";

/**
 * Démo produit animée du hero — 23 septembre 2026.
 *
 * ═══ POURQUOI UNE DÉMO CODÉE ET PAS UNE VIDÉO NI UNE PHOTO ═══
 *
 * La photo d'illustration (directrice + tablette) ne montrait pas le produit :
 * un visiteur venu d'un e-mail de prospection ne voyait pas CE QUE fait EduCom.
 * Slack et Leapsome montrent l'interface qui travaille. Une vidéo pèserait
 * plusieurs mégaoctets sur une connexion mobile à Dakar et deviendrait floue ;
 * cette démo est du HTML animé : nette à toute taille, quelques kilo-octets.
 *
 * Ordre des scènes = la promesse de Kory : on IMPORTE la liste, puis
 * bulletins, factures, certificats et présences suivent.
 *
 * ⚠️ Données d'exemple, écran construit — jamais présenté comme une capture
 * réelle (même règle que `ScreenFrame`). La légende le dit.
 *
 * ⚠️ Animation FONCTIONNELLE, pas décorative (principe 4 de la constitution) :
 * chaque mouvement montre une étape réelle du produit — une note saisie, une
 * moyenne calculée, un document produit. `prefers-reduced-motion` : aucune
 * rotation automatique, scènes affichées à leur état final. Survol ou focus :
 * pause.
 */

const SCENES = [
  { id: "import", label: "Import", icon: FileSpreadsheet },
  { id: "bulletin", label: "Bulletins", icon: GraduationCap },
  { id: "facture", label: "Factures", icon: Receipt },
  { id: "certificat", label: "Certificats", icon: FileText },
  { id: "presences", label: "Présences", icon: CalendarCheck },
] as const;

type SceneId = (typeof SCENES)[number]["id"];
const DUREE_MS = 5200;

export default function HeroDemo() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<SceneId>("import");
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduce || paused) return;
    timer.current = setTimeout(() => {
      setActive((cur) => {
        const i = SCENES.findIndex((s) => s.id === cur);
        return SCENES[(i + 1) % SCENES.length].id;
      });
      setCycle((c) => c + 1);
    }, DUREE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, paused, reduce, cycle]);

  const choose = (id: SceneId) => {
    setActive(id);
    setCycle((c) => c + 1);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Halo discret derrière la fenêtre — donne la profondeur sans dégradé criard */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(44,108,184,0.16),transparent_70%)]"
      />

      <div className="overflow-hidden rounded-[18px] bg-m-card shadow-[0_1px_2px_rgba(11,18,32,0.06),0_30px_60px_-24px_rgba(11,18,32,0.35)] ring-1 ring-m-line">
        {/* Barre de fenêtre */}
        <div className="flex items-center gap-2 border-b border-m-line-soft bg-m-paper px-4 py-2.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-m-line" />
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-m-line" />
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-m-line" />
          <span className="ml-2 truncate text-[11px] font-medium text-m-ink-faint">
            EduCom · Collège Les Baobabs
          </span>
        </div>

        {/* Onglets de scène */}
        <div role="tablist" aria-label="Ce que produit EduCom" className="flex gap-0 overflow-x-auto border-b border-m-line-soft px-1.5 pt-2 [scrollbar-width:none] sm:gap-1 sm:px-3">
          {SCENES.map((s) => {
            const on = s.id === active;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`scene-${s.id}`}
                onClick={() => choose(s.id)}
                className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-t-lg px-2 text-[12.5px] sm:gap-2 sm:px-3 sm:text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-accent/40 ${
                  on ? "text-m-ink" : "text-m-ink-faint hover:text-m-ink-soft"
                }`}
              >
                <Icon aria-hidden="true" className="hidden h-4 w-4 sm:block" />
                <span className="whitespace-nowrap">{s.label}</span>
                <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[2px] overflow-hidden rounded-full bg-m-line-soft">
                  {on && (
                    <motion.span
                      key={`${s.id}-${cycle}`}
                      className="block h-full bg-m-accent"
                      initial={{ width: reduce || paused ? "100%" : "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: reduce || paused ? 0 : DUREE_MS / 1000, ease: "linear" }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scène */}
        <div className="relative h-[420px] bg-gradient-to-b from-m-card to-m-paper/60 sm:h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active}-${cycle}`}
              id={`scene-${active}`}
              role="tabpanel"
              className="absolute inset-0 p-5 sm:p-6"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {active === "import" && <SceneImport reduce={!!reduce} />}
              {active === "bulletin" && <SceneBulletin reduce={!!reduce} />}
              {active === "facture" && <SceneFacture reduce={!!reduce} />}
              {active === "certificat" && <SceneCertificat reduce={!!reduce} />}
              {active === "presences" && <ScenePresences reduce={!!reduce} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 text-center text-[12px] text-m-ink-faint lg:text-right">
        Illustration animée · élèves et montants d&apos;exemple
      </p>
    </div>
  );
}

/* ───────────────────────── Scène 1 : notes → bulletin ───────────────────────── */

const ELEVES = [
  { nom: "Awa Diop", note: "15,5" },
  { nom: "Moussa Ndiaye", note: "14" },
  { nom: "Aminata Fall", note: "16,25" },
  { nom: "Ibrahima Sarr", note: "12,5" },
];

function SceneBulletin({ reduce }: { reduce: boolean }) {
  const d = (i: number) => (reduce ? 0 : 0.35 + i * 0.45);
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-m-ink-faint">Saisie · 1er trimestre</p>
          <p className="text-[15px] font-semibold text-m-ink">5e A · Mathématiques</p>
        </div>
        <span className="rounded-full bg-m-accent-wash px-2.5 py-1 text-[11px] font-semibold text-m-accent-deep">Coef. 4</span>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-m-line">
        {ELEVES.map((e, i) => (
          <div key={e.nom} className={`flex items-center justify-between bg-m-card px-4 py-2.5 text-[13px] ${i > 0 ? "border-t border-m-line-soft" : ""}`}>
            <span className="text-m-ink-soft">{e.nom}</span>
            <motion.span
              className="min-w-14 rounded-md bg-m-paper px-2 py-0.5 text-right font-semibold tabular-nums text-m-ink"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: d(i), duration: 0.25 }}
            >
              {e.note}
            </motion.span>
          </div>
        ))}
      </div>

      <motion.div
        className="mt-auto flex items-center gap-3 rounded-xl bg-m-ink px-4 py-3.5 text-white shadow-lg"
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 2.4, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <GraduationCap aria-hidden="true" className="h-5 w-5 text-m-accent-bright" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">Bulletins du 1er trimestre générés</p>
          <p className="text-[12px] text-white/60">Moyennes calculées · 5e A · prêts à imprimer</p>
        </div>
        <Check aria-hidden="true" className="h-5 w-5 text-emerald-400" />
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Scène 2 : facture et reçu ───────────────────────── */

function SceneFacture({ reduce }: { reduce: boolean }) {
  const [paye, setPaye] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setPaye(true), 2600);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-m-ink-faint">Facture n° 2026-0142</p>
          <p className="text-[15px] font-semibold text-m-ink">Famille Diop · Awa, CM2</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={paye ? "paye" : "emise"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              paye ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-m-alert-wash text-m-alert"
            }`}
          >
            {paye ? "Payée" : "En attente"}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="rounded-xl bg-m-card ring-1 ring-m-line">
        {[
          ["Scolarité · octobre", "35 000"],
          ["Cantine · octobre", "12 000"],
          ["Tenue scolaire", "8 500"],
        ].map(([l, m], i) => (
          <motion.div
            key={l}
            className={`flex justify-between px-4 py-2.5 text-[13px] ${i > 0 ? "border-t border-m-line-soft" : ""}`}
            initial={{ opacity: 0, x: reduce ? 0 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : 0.3 + i * 0.3 }}
          >
            <span className="text-m-ink-soft">{l}</span>
            <span className="font-medium tabular-nums text-m-ink">{m} F</span>
          </motion.div>
        ))}
        <div className="flex justify-between border-t border-m-line bg-m-paper px-4 py-3 text-[14px]">
          <span className="font-semibold text-m-ink">Total</span>
          <span className="font-display font-bold tabular-nums text-m-ink">55 500 F CFA</span>
        </div>
      </div>

      <AnimatePresence>
        {paye && (
          <motion.div
            className="mt-auto flex items-center gap-3 rounded-xl bg-m-ink px-4 py-3.5 text-white shadow-lg"
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Receipt aria-hidden="true" className="h-5 w-5 text-m-accent-bright" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">Paiement enregistré · reçu généré</p>
              <p className="text-[12px] text-white/60">Numérotation automatique · A4 ou demi-A4</p>
            </div>
            <Check aria-hidden="true" className="h-5 w-5 text-emerald-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Scène 3 : certificat ───────────────────────── */

const RECHERCHE = "Aminata Fall";

function SceneCertificat({ reduce }: { reduce: boolean }) {
  const [typed, setTyped] = useState(reduce ? RECHERCHE.length : 0);
  useEffect(() => {
    if (reduce) return;
    if (typed >= RECHERCHE.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 400 : 70);
    return () => clearTimeout(t);
  }, [typed, reduce]);
  const done = typed >= RECHERCHE.length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2.5 rounded-xl bg-m-card px-3.5 py-2.5 ring-1 ring-m-line">
        <Search aria-hidden="true" className="h-4 w-4 text-m-ink-faint" />
        <span className="text-[13px] text-m-ink">
          {RECHERCHE.slice(0, typed)}
          {!done && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-m-ink" />}
        </span>
        <span className="ml-auto text-[11px] text-m-ink-faint">2nde S</span>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            className="relative flex-1 overflow-hidden rounded-xl bg-m-card px-6 py-5 ring-1 ring-m-line"
            initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">République du Sénégal</p>
            <p className="mt-2 text-center font-display text-[17px] font-bold tracking-tight text-m-ink">Certificat de scolarité</p>
            <div className="mx-auto mt-4 space-y-2">
              <p className="text-[12px] leading-relaxed text-m-ink-soft">
                Le chef d&apos;établissement certifie que <span className="font-semibold text-m-ink">Aminata Fall</span>, née le
                <span className="font-semibold text-m-ink"> 14/03/2010</span>, est régulièrement inscrite en classe de
                <span className="font-semibold text-m-ink"> 2nde S</span> pour l&apos;année 2026-2027.
              </p>
              <div className="h-1.5 w-4/5 rounded bg-m-line-soft" />
              <div className="h-1.5 w-3/5 rounded bg-m-line-soft" />
            </div>
            <motion.div
              aria-hidden="true"
              className="absolute bottom-4 right-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-m-accent/60 text-center text-[8px] font-bold uppercase leading-tight text-m-accent/80"
              initial={{ opacity: 0, scale: reduce ? 1 : 1.6, rotate: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              transition={{ delay: reduce ? 0 : 1.1, duration: 0.3, ease: "easeOut" }}
            >
              Cachet de l&apos;école
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Scène 0 : import de la liste ───────────────────────── */

const LIGNES_EXCEL = [
  ["Diop", "Awa", "CM2", "77 412 …"],
  ["Ndiaye", "Moussa", "5e A", "76 108 …"],
  ["Fall", "Aminata", "2nde S", "78 330 …"],
  ["Sarr", "Ibrahima", "Tle L", "77 905 …"],
];

function SceneImport({ reduce }: { reduce: boolean }) {
  const [fini, setFini] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setFini(true), 2300);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1D6F42] text-[12px] font-bold text-white">X</span>
        <div>
          <p className="text-[13px] font-semibold text-m-ink">liste_eleves_2026.xlsx</p>
          <p className="text-[11px] text-m-ink-faint">Votre fichier, tel quel</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-m-line">
        <div className="grid grid-cols-4 bg-m-paper px-3 py-2 text-[11px] font-semibold text-m-ink-faint">
          <span>Nom</span><span>Prénom</span><span>Classe</span><span>Tél. parent</span>
        </div>
        {LIGNES_EXCEL.map((l, i) => (
          <motion.div
            key={l[0]}
            className="grid grid-cols-4 border-t border-m-line-soft bg-m-card px-3 py-2 text-[12px] text-m-ink-soft"
            initial={{ opacity: 1, backgroundColor: "#FFFFFF" }}
            animate={reduce ? {} : { backgroundColor: ["#FFFFFF", "#EAF2FC", "#FFFFFF"] }}
            transition={{ delay: 0.4 + i * 0.35, duration: 0.6 }}
          >
            {l.map((c) => (
              <span key={c} className="truncate">{c}</span>
            ))}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {fini && (
          <motion.div
            className="mt-auto grid grid-cols-3 gap-2"
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {[
              ["Élèves", "créés"],
              ["Classes", "rattachées"],
              ["Parents", "joignables"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-m-ink px-3 py-3 text-white">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Check aria-hidden="true" className="h-4 w-4 text-emerald-400" />
                  {a}
                </div>
                <p className="mt-0.5 text-[11px] text-white/60">{b}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Scène 4 : présences ───────────────────────── */

const APPEL = [
  { nom: "Awa Diop", present: true },
  { nom: "Moussa Ndiaye", present: false },
  { nom: "Aminata Fall", present: true },
  { nom: "Ibrahima Sarr", present: true },
];

function ScenePresences({ reduce }: { reduce: boolean }) {
  const [prevenu, setPrevenu] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setPrevenu(true), 2500);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-m-ink-faint">Appel · 8 h 05</p>
          <p className="text-[15px] font-semibold text-m-ink">5e A · depuis le téléphone de l&apos;enseignant</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-m-line">
        {APPEL.map((e, i) => (
          <div key={e.nom} className={`flex items-center justify-between bg-m-card px-4 py-2.5 text-[13px] ${i > 0 ? "border-t border-m-line-soft" : ""}`}>
            <span className="text-m-ink-soft">{e.nom}</span>
            <motion.span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                e.present ? "bg-emerald-50 text-emerald-700" : "bg-m-alert-wash text-m-alert"
              }`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduce ? 0 : 0.3 + i * 0.3, duration: 0.2 }}
            >
              {e.present ? "Présent" : "Absent"}
            </motion.span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {prevenu && (
          <motion.div
            className="mt-auto flex items-center gap-3 rounded-xl bg-m-ink px-4 py-3.5 text-white shadow-lg"
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <MessageCircle aria-hidden="true" className="h-5 w-5 text-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">Famille Ndiaye prévenue sur WhatsApp</p>
              <p className="text-[12px] text-white/60">En un clic · lien pour justifier l&apos;absence</p>
            </div>
            <Check aria-hidden="true" className="h-5 w-5 text-emerald-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
