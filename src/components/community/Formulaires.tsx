"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Send,
  CheckCircle2,
  BellRing,
  Lock,
  Download,
  ArrowLeft,
  EyeOff,
  CalendarClock,
  Zap,
} from "lucide-react";
import type { PersonneVue } from "@/lib/community";
import type { FormulaireResume, FormulaireVue, Question, Reponses, TypeQuestion } from "@/lib/formulaires";
import { creerFormulaire, repondreFormulaire, relancerFormulaire, cloreFormulaire } from "@/app/dashboard/communications/communaute/formulaire-actions";
import SelecteurAudience from "./SelecteurAudience";
import { BoutonAnalyseIA } from "./IA";
import { lireFormulaire } from "@/lib/interpretation";
import { MODELES_ENQUETES, CATEGORIES, dureeEstimee, type ModeleEnquete, type Categorie } from "@/lib/modelesEnquetes";
import { Constats, Anneau, Classement, Echelle, Nps, NuageMots, RythmeJours } from "./Interpretation";
import { ilYa } from "./outils";

/**
 * Formulaires façon Google Form — 26 sept. 2026. Créés, envoyés, remplis et
 * analysés dans EduCom ; les destinataires sont prévenus (cloche + notification).
 */
export type VueFormulaires =
  | { type: "liste"; liste: FormulaireResume[]; peutCreer: boolean }
  | { type: "nouveau" }
  | { type: "detail"; form: FormulaireVue };

const TYPES: { type: TypeQuestion; label: string }[] = [
  { type: "choix", label: "Choix unique" },
  { type: "cases", label: "Cases à cocher" },
  { type: "court", label: "Réponse courte" },
  { type: "long", label: "Paragraphe" },
  { type: "echelle", label: "Note de 1 à 5" },
  { type: "nps", label: "Recommandation (0 à 10)" },
  { type: "date", label: "Date" },
];

type QEdit = { cle: number; type: TypeQuestion; titre: string; obligatoire: boolean; options: string[] };

export default function Formulaires({
  vue,
  baseHref,
  classes,
  personnes,
  sansGroupes,
  ia = false,
}: {
  vue: VueFormulaires;
  baseHref: string;
  classes: { id: string; nom: string }[];
  personnes: PersonneVue[];
  sansGroupes: boolean;
  ia?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      {vue.type === "liste" && <Liste liste={vue.liste} peutCreer={vue.peutCreer} baseHref={baseHref} />}
      {vue.type === "nouveau" && <Nouveau baseHref={baseHref} classes={classes} personnes={personnes} sansGroupes={sansGroupes} />}
      {vue.type === "detail" && <Detail form={vue.form} baseHref={baseHref} ia={ia} />}
    </div>
  );
}

/* ═══════════════════════ Liste ═══════════════════════ */

function Liste({ liste, peutCreer, baseHref }: { liste: FormulaireResume[]; peutCreer: boolean; baseHref: string }) {
  const aRemplir = liste.filter((f) => f.aRepondre);
  const envoyes = liste.filter((f) => f.reponses !== null);
  const recus = liste.filter((f) => !f.aRepondre && f.reponses === null);
  const Carte = ({ f }: { f: FormulaireResume }) => (
    <Link href={`${baseHref}?form=${f.id}`} className="block rounded-2xl border border-rule bg-surface p-4 transition-colors hover:border-primary-ink/30">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-ink/10 text-primary-ink">
          <ClipboardList aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-text">{f.titre}</p>
          <p className="text-xs text-text-soft">
            {f.auteur} · {ilYa(f.createdAt)}
            {f.clos ? " · clos" : f.closesAt ? ` · avant le ${new Date(f.closesAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}
          </p>
          {f.reponses !== null && f.destinataires !== null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                <span className="block h-full rounded-full bg-primary-ink" style={{ width: `${f.destinataires ? Math.round((f.reponses / f.destinataires) * 100) : 0}%` }} />
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-text-soft">
                {f.reponses}/{f.destinataires} réponses
              </span>
            </div>
          )}
        </div>
        {f.aRepondre && <span className="shrink-0 rounded-full bg-primary-ink px-3 py-1 text-xs font-bold text-white">Remplir</span>}
        {f.dejaRepondu && f.reponses === null && <CheckCircle2 aria-label="Répondu" className="h-5 w-5 shrink-0 text-success" />}
      </div>
    </Link>
  );
  return (
    <div className="space-y-6">
      {peutCreer && (
        <Link
          href={`${baseHref}?form=nouveau`}
          className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary-ink/30 bg-surface p-4 text-primary-ink transition-colors hover:border-primary-ink/60"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
          <span>
            <span className="block text-[15px] font-bold">Nouveau formulaire</span>
            <span className="block text-xs text-text-soft">Autorisation de sortie, inscription, avis des familles… rempli dans EduCom.</span>
          </span>
        </Link>
      )}
      {liste.length === 0 && (
        <div className="rounded-2xl border border-dashed border-rule bg-surface px-6 py-10 text-center">
          <p className="text-[15px] font-bold text-text">Aucun formulaire pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-text-soft">Les formulaires de l&apos;école à remplir apparaîtront ici, avec une notification.</p>
        </div>
      )}
      {aRemplir.length > 0 && <Groupe titre={`À remplir (${aRemplir.length})`}>{aRemplir.map((f) => <Carte key={f.id} f={f} />)}</Groupe>}
      {envoyes.length > 0 && <Groupe titre="Envoyés">{envoyes.map((f) => <Carte key={f.id} f={f} />)}</Groupe>}
      {recus.length > 0 && <Groupe titre="Déjà traités">{recus.map((f) => <Carte key={f.id} f={f} />)}</Groupe>}
    </div>
  );
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">{titre}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/* ═══════════════════════ Éditeur ═══════════════════════ */

let compteur = 1;
const nouvelleQuestion = (type: TypeQuestion = "choix"): QEdit => ({
  cle: compteur++,
  type,
  titre: "",
  obligatoire: true,
  options: type === "choix" || type === "cases" ? ["", ""] : [],
});

type ProprietesEditeur = {
  baseHref: string;
  classes: { id: string; nom: string }[];
  personnes: PersonneVue[];
  sansGroupes: boolean;
};

/** Nouveau formulaire : d'abord la galerie de modèles, puis l'éditeur. */
function Nouveau(props: ProprietesEditeur) {
  const [modele, setModele] = useState<ModeleEnquete | "vide" | null>(null);
  if (!modele) return <Galerie baseHref={props.baseHref} choisir={setModele} />;
  return <Editeur key={modele === "vide" ? "vide" : modele.id} {...props} modele={modele === "vide" ? null : modele} revenir={() => setModele(null)} />;
}

function Galerie({ baseHref, choisir }: { baseHref: string; choisir: (m: ModeleEnquete | "vide") => void }) {
  const [categorie, setCategorie] = useState<Categorie | "Tous">("Tous");
  const [recherche, setRecherche] = useState("");
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const liste = MODELES_ENQUETES.filter(
    (m) =>
      (categorie === "Tous" || m.categorie === categorie) &&
      (!recherche.trim() || norm(`${m.titre} ${m.description} ${m.categorie}`).includes(norm(recherche.trim()))),
  );
  return (
    <div className="space-y-4">
      <Link href={`${baseHref}?espace=FORMULAIRES`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-soft hover:text-text">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Formulaires
      </Link>
      <div>
        <h2 className="text-2xl font-bold text-text">Choisissez un modèle</h2>
        <p className="mt-1 text-sm text-text-soft">{MODELES_ENQUETES.length} enquêtes prêtes pour une école. Tout reste modifiable avant l&apos;envoi.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher : cantine, sortie, satisfaction…"
          aria-label="Rechercher un modèle"
          className="min-h-10 w-full rounded-full border border-rule bg-surface px-4 text-sm focus:border-primary-ink/50 focus:outline-none sm:w-72"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["Tous", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={categorie === c}
              onClick={() => setCategorie(c)}
              className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold ${categorie === c ? "bg-primary-ink text-white" : "bg-surface text-text-soft ring-1 ring-rule hover:bg-sunk"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <button
            type="button"
            onClick={() => choisir("vide")}
            className="flex h-full w-full flex-col items-start rounded-2xl border-2 border-dashed border-primary-ink/30 bg-surface p-4 text-left transition-colors hover:border-primary-ink/60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-ink/10 text-primary-ink">
              <Plus aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="mt-3 text-[15px] font-bold text-text">Partir de zéro</span>
            <span className="mt-0.5 text-[13px] text-text-soft">Un formulaire vide, vos propres questions.</span>
          </button>
        </li>
        <li>
          <Link
            href={`${baseHref}?espace=SONDAGES`}
            className="flex h-full w-full flex-col items-start rounded-2xl border-2 border-dashed border-rule bg-surface p-4 text-left transition-colors hover:border-primary-ink/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunk text-primary-ink">
              <Zap aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="mt-3 text-[15px] font-bold text-text">Une seule question ?</span>
            <span className="mt-0.5 text-[13px] text-text-soft">Lancez plutôt un sondage rapide : on répond en un geste, depuis le fil.</span>
          </Link>
        </li>
        {liste.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => choisir(m)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-rule bg-surface text-left transition-[border-color,box-shadow] hover:border-primary-ink/40 hover:shadow-overlay"
            >
              <span className="flex items-center gap-3 bg-primary-ink/[0.06] px-4 py-3">
                <span className="text-2xl" aria-hidden="true">
                  {m.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-text">{m.titre}</span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">{m.categorie}</span>
                </span>
              </span>
              <span className="flex flex-1 flex-col px-4 py-3">
                <span className="text-[13px] text-text-soft">{m.description}</span>
                <span className="mt-2 space-y-0.5">
                  {m.questions.slice(0, 3).map((q) => (
                    <span key={q.titre} className="block truncate text-xs text-text-faint">
                      • {q.titre}
                    </span>
                  ))}
                  {m.questions.length > 3 && <span className="block text-xs text-text-faint">+ {m.questions.length - 3} autres</span>}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[11px] font-semibold text-text-soft">
                  <span className="rounded-full bg-sunk px-2 py-0.5">{m.questions.length} questions</span>
                  <span className="rounded-full bg-sunk px-2 py-0.5">≈ {dureeEstimee(m.questions)} min</span>
                  {m.anonyme && <span className="rounded-full bg-sunk px-2 py-0.5">Anonyme</span>}
                  <span className="rounded-full bg-sunk px-2 py-0.5">{m.pour}</span>
                  <span className="ml-auto text-primary-ink opacity-0 transition-opacity group-hover:opacity-100">Utiliser →</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {liste.length === 0 && <p className="text-sm text-text-soft">Aucun modèle ne correspond. Partez de zéro : l&apos;éditeur est simple.</p>}
    </div>
  );
}

function Editeur({
  baseHref,
  classes,
  personnes,
  sansGroupes,
  modele,
  revenir,
}: ProprietesEditeur & { modele: ModeleEnquete | null; revenir: () => void }) {
  const router = useRouter();
  const [titre, setTitre] = useState(modele?.titre ?? "");
  const [description, setDescription] = useState(modele?.description ?? "");
  const [questions, setQuestions] = useState<QEdit[]>(() =>
    modele ? modele.questions.map((q) => ({ ...q, options: [...q.options], cle: compteur++ })) : [nouvelleQuestion()],
  );
  const [regles, setRegles] = useState<string[]>([]);
  const [membres, setMembres] = useState<string[]>([]);
  const [anonyme, setAnonyme] = useState(Boolean(modele?.anonyme));
  const [inclureMoi, setInclureMoi] = useState(false);
  const [fin, setFin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [demain] = useState(() => new Date(Date.now() + 86400_000).toISOString().slice(0, 10));

  const maj = (cle: number, p: Partial<QEdit>) => setQuestions((qs) => qs.map((q) => (q.cle === cle ? { ...q, ...p } : q)));
  const deplacer = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const j = i + d;
      if (j < 0 || j >= qs.length) return qs;
      const copie = [...qs];
      [copie[i], copie[j]] = [copie[j], copie[i]];
      return copie;
    });

  const envoyer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await creerFormulaire({
        titre,
        description,
        questions: questions.map((q) => ({ ...q, options: q.options.filter((o) => o.trim()) })),
        regles,
        personnes: membres,
        anonyme,
        closesAt: fin ? new Date(`${fin}T23:59:00`).toISOString() : null,
        inclureMoi,
      });
      if (!r.ok) return setErreur(r.error);
      toast.success(
        `Formulaire envoyé à ${r.destinataires} personne${r.destinataires > 1 ? "s" : ""}${inclureMoi ? " (et à vous)" : ""}. Chacune a reçu une notification.`,
      );
      router.push(`${baseHref}?form=${r.id}`);
    });

  return (
    <div className="space-y-4">
      <Link href={`${baseHref}?espace=FORMULAIRES`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-soft hover:text-text">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Formulaires
      </Link>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary-ink/[0.06] px-4 py-2.5 text-sm text-text">
        <span>
          {modele ? (
            <>
              {modele.emoji} Modèle « <strong>{modele.titre}</strong> » : adaptez les questions, choisissez les destinataires ({modele.pour.toLowerCase()}), envoyez.
            </>
          ) : (
            "Formulaire vide : ajoutez vos questions."
          )}
        </span>
        <button type="button" onClick={revenir} className="ml-auto text-xs font-semibold text-primary-ink hover:underline">
          Changer de modèle
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-primary-ink/40 bg-surface">
        <div className="h-2 bg-primary-ink" aria-hidden="true" />
        <div className="space-y-2 p-4 sm:p-5">
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            maxLength={200}
            placeholder="Titre du formulaire"
            aria-label="Titre du formulaire"
            className="w-full border-0 border-b border-rule bg-transparent px-0 pb-2 text-2xl font-bold text-text placeholder:text-text-faint focus:border-primary-ink focus:outline-none focus:ring-0"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Description (facultatif)"
            aria-label="Description"
            className="w-full resize-none border-0 bg-transparent px-0 text-sm text-text-soft placeholder:text-text-faint focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={q.cle} className="rounded-2xl border border-rule bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-2">
            <input
              value={q.titre}
              onChange={(e) => maj(q.cle, { titre: e.target.value })}
              maxLength={300}
              placeholder={`Question ${i + 1}`}
              aria-label={`Intitulé de la question ${i + 1}`}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-rule bg-sunk/40 px-3 text-[15px] font-semibold text-text focus:border-primary-ink/50 focus:bg-surface focus:outline-none"
            />
            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as TypeQuestion;
                maj(q.cle, { type, options: type === "choix" || type === "cases" ? (q.options.length ? q.options : ["", ""]) : [] });
              }}
              aria-label="Type de question"
              className="min-h-11 rounded-lg border border-rule bg-surface px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {(q.type === "choix" || q.type === "cases") && (
            <ul className="mt-3 space-y-1.5">
              {q.options.map((o, j) => (
                <li key={j} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-4 w-4 shrink-0 border border-slate-300 ${q.type === "cases" ? "rounded" : "rounded-full"}`} />
                  <input
                    value={o}
                    onChange={(e) => maj(q.cle, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })}
                    maxLength={150}
                    placeholder={`Option ${j + 1}`}
                    aria-label={`Option ${j + 1}`}
                    className="min-h-9 min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 text-sm text-text hover:border-rule focus:border-primary-ink focus:outline-none focus:ring-0"
                  />
                  {q.options.length > 2 && (
                    <button type="button" aria-label="Retirer l'option" onClick={() => maj(q.cle, { options: q.options.filter((_, k) => k !== j) })} className="text-text-faint hover:text-danger">
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
              {q.options.length < 12 && (
                <li>
                  <button type="button" onClick={() => maj(q.cle, { options: [...q.options, ""] })} className="ml-6 text-sm font-semibold text-primary-ink hover:underline">
                    Ajouter une option
                  </button>
                </li>
              )}
            </ul>
          )}
          {q.type === "court" && <p className="mt-3 border-b border-dashed border-rule pb-1 text-sm text-text-faint">Réponse courte</p>}
          {q.type === "long" && <p className="mt-3 border-b border-dashed border-rule pb-1 text-sm text-text-faint">Réponse longue</p>}
          {q.type === "echelle" && <p className="mt-3 text-sm text-text-faint">1 · 2 · 3 · 4 · 5</p>}
          {q.type === "nps" && <p className="mt-3 text-sm text-text-faint">0 · 1 · 2 · … · 10 — « pas du tout » à « certainement »</p>}
          {q.type === "date" && <p className="mt-3 text-sm text-text-faint">jj/mm/aaaa</p>}

          <div className="mt-4 flex items-center justify-end gap-1 border-t border-rule pt-3">
            <IconeBouton titre="Monter" onClick={() => deplacer(i, -1)}>
              <ArrowUp className="h-4 w-4" />
            </IconeBouton>
            <IconeBouton titre="Descendre" onClick={() => deplacer(i, 1)}>
              <ArrowDown className="h-4 w-4" />
            </IconeBouton>
            <IconeBouton titre="Dupliquer" onClick={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...q, cle: compteur++ }, ...qs.slice(i + 1)])}>
              <Copy className="h-4 w-4" />
            </IconeBouton>
            {questions.length > 1 && (
              <IconeBouton titre="Supprimer" onClick={() => setQuestions((qs) => qs.filter((x) => x.cle !== q.cle))}>
                <Trash2 className="h-4 w-4" />
              </IconeBouton>
            )}
            <span className="mx-2 h-5 w-px bg-rule" aria-hidden="true" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-soft">
              Obligatoire
              <input type="checkbox" checked={q.obligatoire} onChange={(e) => maj(q.cle, { obligatoire: e.target.checked })} className="h-4 w-4 accent-[var(--color-primary-ink)]" />
            </label>
          </div>
        </div>
      ))}

      {questions.length < 30 && (
        <button
          type="button"
          onClick={() => setQuestions((qs) => [...qs, nouvelleQuestion()])}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-rule bg-surface py-3 text-sm font-semibold text-primary-ink hover:border-primary-ink/40"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Ajouter une question
        </button>
      )}

      <div className="space-y-3 rounded-2xl border border-rule bg-surface p-4 sm:p-5">
        <p className="text-[15px] font-bold text-text">Envoyer à</p>
        <SelecteurAudience
          classes={classes}
          personnes={personnes}
          regles={regles}
          setRegles={setRegles}
          membres={membres}
          setMembres={setMembres}
          sansGroupes={sansGroupes}
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            aria-pressed={anonyme}
            onClick={() => setAnonyme((v) => !v)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ${anonyme ? "bg-primary-ink/10 text-primary-ink ring-primary-ink/30" : "text-text-soft ring-rule hover:bg-sunk"}`}
          >
            <EyeOff aria-hidden="true" className="h-3.5 w-3.5" /> Réponses anonymes
          </button>
          <button
            type="button"
            aria-pressed={inclureMoi}
            onClick={() => setInclureMoi((v) => !v)}
            title="Vous recevez aussi le formulaire, comme un destinataire (pratique pour vérifier ce qu'ils voient)"
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ${inclureMoi ? "bg-primary-ink/10 text-primary-ink ring-primary-ink/30" : "text-text-soft ring-rule hover:bg-sunk"}`}
          >
            <Send aria-hidden="true" className="h-3.5 w-3.5" /> M&apos;envoyer une copie
          </button>
          <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-text-soft ring-1 ring-rule">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" /> Date limite
            <input type="date" min={demain} value={fin} onChange={(e) => setFin(e.target.value)} className="border-0 bg-transparent p-0 text-xs text-text focus:outline-none focus:ring-0" />
          </label>
          <button
            type="button"
            onClick={envoyer}
            disabled={enCours || !titre.trim() || regles.length + membres.length === 0}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-ink px-5 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {enCours ? "Envoi…" : "Envoyer le formulaire"}
          </button>
        </div>
        <p className="text-xs text-text-soft">Les destinataires reçoivent une notification et remplissent le formulaire dans EduCom.</p>
        {erreur && (
          <p role="alert" className="text-sm font-medium text-danger">
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}

function IconeBouton({ titre, onClick, children }: { titre: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={titre} aria-label={titre} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text">
      {children}
    </button>
  );
}

/* ═══════════════════════ Détail : remplir / résultats ═══════════════════════ */

function Detail({ form, baseHref, ia }: { form: FormulaireVue; baseHref: string; ia: boolean }) {
  const [onglet, setOnglet] = useState<"remplir" | "resultats" | "apercu">(form.resultats && !form.destinataire ? "resultats" : "remplir");
  const onglets = [
    ...(form.destinataire ? [["remplir", "Ma réponse"] as const] : []),
    ...(form.resultats ? [["resultats", "Résultats et suivi"] as const] : []),
    ...(form.resultats && !form.destinataire ? [["apercu", "Aperçu destinataire"] as const] : []),
  ];
  return (
    <div className="space-y-4">
      <Link href={`${baseHref}?espace=FORMULAIRES`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-soft hover:text-text">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Formulaires
      </Link>
      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="h-2 bg-primary-ink" aria-hidden="true" />
        <div className="p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-text">{form.titre}</h1>
          {form.description && <p className="mt-1 whitespace-pre-wrap text-sm text-text-soft">{form.description}</p>}
          <p className="mt-2 text-xs text-text-faint">
            Envoyé par {form.auteur} · {ilYa(form.createdAt)}
            {form.anonyme && " · réponses anonymes"}
            {form.clos ? " · clos" : form.closesAt ? ` · avant le ${new Date(form.closesAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}
          </p>
        </div>
      </div>
      {onglets.length > 1 && (
        <div role="tablist" className="flex gap-1 rounded-xl bg-sunk p-1">
          {onglets.map(([o, label]) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={onglet === o}
              onClick={() => setOnglet(o)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${onglet === o ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {onglet === "remplir" && form.destinataire && <Remplir form={form} />}
      {onglet === "apercu" && (
        <>
          <p className="rounded-xl bg-primary-ink/[0.06] px-4 py-3 text-sm text-text">
            <strong>Aperçu :</strong> voici exactement ce que voient les destinataires. Rien n&apos;est envoyé depuis cet aperçu.
          </p>
          <Remplir form={form} apercu />
        </>
      )}
      {onglet === "resultats" && form.resultats && <Resultats form={form} ia={ia} />}
      {!form.destinataire && !form.resultats && <p className="text-sm text-text-soft">Ce formulaire ne vous est pas destiné.</p>}
    </div>
  );
}

function Remplir({ form, apercu = false }: { form: FormulaireVue; apercu?: boolean }) {
  const router = useRouter();
  const [rep, setRep] = useState<Reponses>(form.maReponse ?? {});
  const [envoye, setEnvoye] = useState(Boolean(form.maReponse));
  const [modifier, setModifier] = useState(!form.maReponse);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (envoye && !modifier) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto h-10 w-10 text-success" />
        <p className="mt-2 text-[15px] font-bold text-text">Merci, votre réponse est enregistrée.</p>
        {!form.clos && (
          <button type="button" onClick={() => setModifier(true)} className="mt-3 text-sm font-semibold text-primary-ink hover:underline">
            Modifier ma réponse
          </button>
        )}
      </div>
    );
  }

  const envoyer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await repondreFormulaire(form.id, rep);
      if (!r.ok) return setErreur(r.error);
      setEnvoye(true);
      setModifier(false);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {form.questions.map((q) => (
        <ChampQuestion key={q.id} q={q} valeur={rep[q.id]} changer={(v) => setRep((r) => ({ ...r, [q.id]: v }))} desactive={form.clos} />
      ))}
      {apercu ? null : form.clos ? (
        <p className="flex items-center gap-2 text-sm text-text-soft">
          <Lock aria-hidden="true" className="h-4 w-4" /> Ce formulaire est clos.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={envoyer}
            disabled={enCours}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-ink px-6 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
          >
            <Send aria-hidden="true" className="h-4 w-4" /> {enCours ? "Envoi…" : "Envoyer"}
          </button>
          {erreur && (
            <p role="alert" className="text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChampQuestion({ q, valeur, changer, desactive }: { q: Question; valeur: string | string[] | undefined; changer: (v: string | string[]) => void; desactive: boolean }) {
  const s = typeof valeur === "string" ? valeur : "";
  const liste = Array.isArray(valeur) ? valeur : [];
  return (
    <fieldset className="rounded-2xl border border-rule bg-surface p-4 sm:p-5" disabled={desactive}>
      <legend className="sr-only">{q.titre}</legend>
      <p className="text-[15px] font-semibold text-text">
        {q.titre} {q.obligatoire && <span className="text-danger">*</span>}
      </p>
      <div className="mt-3">
        {q.type === "choix" &&
          q.options.map((o) => (
            <label key={o} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-text">
              <input type="radio" name={q.id} checked={s === o} onChange={() => changer(o)} className="h-4 w-4 accent-[var(--color-primary-ink)]" />
              {o}
            </label>
          ))}
        {q.type === "cases" &&
          q.options.map((o) => (
            <label key={o} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-text">
              <input
                type="checkbox"
                checked={liste.includes(o)}
                onChange={(e) => changer(e.target.checked ? [...liste, o] : liste.filter((x) => x !== o))}
                className="h-4 w-4 rounded accent-[var(--color-primary-ink)]"
              />
              {o}
            </label>
          ))}
        {q.type === "court" && (
          <input value={s} onChange={(e) => changer(e.target.value)} maxLength={300} aria-label={q.titre} className="min-h-11 w-full rounded-lg border border-rule px-3 text-sm focus:border-primary-ink/50 focus:outline-none" />
        )}
        {q.type === "long" && (
          <textarea value={s} onChange={(e) => changer(e.target.value)} maxLength={3000} rows={4} aria-label={q.titre} className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-primary-ink/50 focus:outline-none" />
        )}
        {q.type === "echelle" && (
          <div className="flex gap-2">
            {["1", "2", "3", "4", "5"].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={s === n}
                onClick={() => changer(n)}
                className={`h-11 w-11 rounded-full text-sm font-bold ring-1 ${s === n ? "bg-primary-ink text-white ring-primary-ink" : "text-text ring-rule hover:bg-sunk"}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        {q.type === "nps" && (
          <div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, k) => String(k)).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={s === n}
                  onClick={() => changer(n)}
                  className={`h-10 w-10 rounded-lg text-sm font-bold ring-1 ${s === n ? "bg-primary-ink text-white ring-primary-ink" : "text-text ring-rule hover:bg-sunk"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex max-w-[500px] justify-between text-[11px] text-text-faint">
              <span>Pas du tout probable</span>
              <span>Très probable</span>
            </div>
          </div>
        )}
        {q.type === "date" && (
          <input type="date" value={s} onChange={(e) => changer(e.target.value)} aria-label={q.titre} className="min-h-11 rounded-lg border border-rule px-3 text-sm" />
        )}
      </div>
    </fieldset>
  );
}

function Resultats({ form, ia }: { form: FormulaireVue; ia: boolean }) {
  const router = useRouter();
  const r = form.resultats!;
  const [vue, setVue] = useState<"retenir" | "resume" | "individuel" | "attente">("retenir");
  // Lecture automatique (sans IA) : `lib/interpretation.ts`.
  const lecture = useMemo(
    () =>
      lireFormulaire(
        form.questions,
        r.reponses.map((x) => ({ answers: x.answers, profil: x.detail, date: x.date })),
        r.destinataires,
        form.createdAt,
      ),
    [form, r],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const taux = r.destinataires ? Math.round((r.reponses.length / r.destinataires) * 100) : 0;

  const csv = useMemo(() => {
    const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const entete = [...(form.anonyme ? [] : ["Nom", "Fonction"]), "Date", ...form.questions.map((q) => q.titre)];
    const lignes = r.reponses.map((x) => [
      ...(form.anonyme ? [] : [x.nom ?? "", x.detail ?? ""]),
      new Date(x.date).toLocaleString("fr-FR"),
      ...form.questions.map((q) => {
        const v = x.answers[q.id];
        return Array.isArray(v) ? v.join(" ; ") : (v ?? "");
      }),
    ]);
    return [entete, ...lignes].map((l) => l.map((c) => echapper(String(c))).join(";")).join("\n");
  }, [form, r]);

  const telecharger = () => {
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.titre.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-rule bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-3xl font-bold tabular-nums text-text">
            {r.reponses.length}
            <span className="text-base font-semibold text-text-soft"> / {r.destinataires} réponses</span>
          </p>
          <span className="rounded-full bg-primary-ink/10 px-2.5 py-1 text-xs font-bold text-primary-ink">{taux} %</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {!form.clos && r.sansReponse.length > 0 && (
              <button
                type="button"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    const x = await relancerFormulaire(form.id);
                    setMessage(x.ok ? `${x.relances} personne${x.relances > 1 ? "s" : ""} relancée${x.relances > 1 ? "s" : ""}.` : x.error);
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-ink px-4 text-xs font-bold text-white"
              >
                <BellRing aria-hidden="true" className="h-3.5 w-3.5" /> Relancer ({r.sansReponse.length})
              </button>
            )}
            {r.reponses.length > 0 && (
              <button type="button" onClick={telecharger} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-text ring-1 ring-rule hover:bg-sunk">
                <Download aria-hidden="true" className="h-3.5 w-3.5" /> Excel (CSV)
              </button>
            )}
            {form.peutClore && (
              <button
                type="button"
                disabled={enCours}
                onClick={() => {
                  if (window.confirm("Clore le formulaire ? Plus personne ne pourra répondre."))
                    demarrer(async () => {
                      const x = await cloreFormulaire(form.id);
                      if (x.ok) router.refresh();
                      else setMessage(x.error);
                    });
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-text-soft ring-1 ring-rule hover:bg-sunk"
              >
                <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Clore
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunk">
          <div className="h-full rounded-full bg-primary-ink transition-[width]" style={{ width: `${taux}%` }} />
        </div>
        <p className="mt-3 text-sm text-text">
          📨 Envoyé à <strong>{r.destinataires}</strong> personne{r.destinataires > 1 ? "s" : ""}
          {r.parents > 0 && ` · ${r.parents} parent${r.parents > 1 ? "s" : ""}`}
          {r.personnel > 0 && ` · ${r.personnel} membre${r.personnel > 1 ? "s" : ""} de l'équipe`}
          {" · "}
          👁 ouvert par <strong>{r.ouverts}</strong>
          {" · "}✅ répondu par <strong>{r.reponses.length}</strong>
        </p>
        {r.audience.length > 0 && <p className="mt-1 text-xs text-text-soft">Groupes : {r.audience.join(", ")}</p>}
        {ia && r.reponses.length > 0 && (
          <div className="mt-3">
            <BoutonAnalyseIA type="formulaire" id={form.id} libelle="Analyser les réponses avec l'IA" />
          </div>
        )}
        {message && <p className="mt-2 text-sm font-medium text-text">{message}</p>}
      </div>

      <div role="tablist" className="flex gap-1 rounded-xl bg-sunk p-1">
        {(
          [
            ["retenir", "À retenir"],
            ["resume", "Par question"],
            ["individuel", "Réponses"],
            ["attente", `Suivi (${r.suivi.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={vue === id}
            onClick={() => setVue(id)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${vue === id ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {vue === "retenir" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rule bg-surface p-4">
              <Anneau valeur={lecture.participation.taux} libelle="Participation" sousLibelle={`${r.reponses.length} réponses sur ${r.destinataires}`} />
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-4">
              {lecture.indice !== null ? (
                <Anneau valeur={lecture.indice} libelle="Indice de satisfaction" sousLibelle="Moyenne des notes de 1 à 5, ramenée sur 100" />
              ) : (
                <RythmeJours r={lecture.rythme} />
              )}
            </div>
          </div>
          {r.reponses.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-rule bg-surface px-4 py-6 text-center text-sm text-text-soft">
              Les premières réponses feront apparaître ici les tendances, les points forts et les points à traiter.
            </p>
          ) : (
            <Constats constats={lecture.aRetenir} />
          )}
          {lecture.indice !== null && lecture.rythme.parJour.length >= 2 && (
            <div className="rounded-2xl border border-rule bg-surface p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">Réponses par jour</p>
              <RythmeJours r={lecture.rythme} />
            </div>
          )}
          <p className="text-[11px] text-text-faint">
            Lecture calculée automatiquement à partir des réponses : chaque phrase se vérifie dans l&apos;onglet « Par question ». Pas de conclusion sous 3 réponses.
          </p>
        </div>
      )}

      {vue === "resume" &&
        form.questions.map((q, i) => {
          const l = lecture.questions[q.id];
          return (
            <div key={q.id} className="rounded-2xl border border-rule bg-surface p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-faint">Question {i + 1}</p>
              <p className="text-[15px] font-semibold text-text">{q.titre}</p>
              <p className="mb-3 text-xs text-text-faint">
                {l?.n ?? 0} réponse{(l?.n ?? 0) > 1 ? "s" : ""}
              </p>
              {l?.type === "choix" || l?.type === "cases" ? <Classement choix={l.choix} /> : null}
              {l?.type === "echelle" && <Echelle e={l.echelle} parProfil={l.parProfil} />}
              {l?.type === "nps" && <Nps n={l.nps} />}
              {(l?.type === "court" || l?.type === "long") && (
                <div className="space-y-3">
                  {l.mots.length >= 3 && <NuageMots mots={l.mots} />}
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                    {r.reponses
                      .filter((x) => x.answers[q.id])
                      .map((x, k) => (
                        <li key={k} className="rounded-lg bg-sunk/60 px-3 py-2 text-sm text-text">
                          {String(x.answers[q.id])}
                          {x.nom && <span className="ml-2 text-xs text-text-faint">— {x.nom}</span>}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {l?.type === "date" && (
                <ul className="space-y-1.5">
                  {l.dates.map((d) => (
                    <li key={d.date} className="flex justify-between rounded-lg bg-sunk/60 px-3 py-2 text-sm text-text">
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      <span className="font-semibold tabular-nums">{d.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

      {vue === "individuel" &&
        (r.reponses.length ? (
          r.reponses.map((x, i) => (
            <div key={i} className="rounded-2xl border border-rule bg-surface p-4">
              <p className="text-sm font-bold text-text">
                {x.nom ?? `Réponse anonyme ${i + 1}`} {x.detail && <span className="font-normal text-text-soft">· {x.detail}</span>}
                <span className="ml-2 text-xs font-normal text-text-faint">{ilYa(x.date)}</span>
              </p>
              <dl className="mt-2 space-y-1.5 text-sm">
                {form.questions.map((q) => (
                  <div key={q.id}>
                    <dt className="text-xs text-text-soft">{q.titre}</dt>
                    <dd className="text-text">{Array.isArray(x.answers[q.id]) ? (x.answers[q.id] as string[]).join(", ") : String(x.answers[q.id] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-soft">Aucune réponse pour l&apos;instant.</p>
        ))}

      {vue === "attente" && (
        <ul className="overflow-hidden rounded-2xl border border-rule bg-surface">
          {r.suivi.length === 0 && <li className="px-4 py-4 text-sm text-text-soft">Aucun destinataire.</li>}
          {r.suivi.map((p, i) => (
            <li key={i} className="flex items-center gap-3 border-b border-rule px-4 py-2.5 text-sm last:border-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-text">{p.nom}</span>
                <span className="block truncate text-xs text-text-soft">{p.detail}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  p.statut === "repondu" ? "bg-success/12 text-success" : p.statut === "ouvert" ? "bg-primary-ink/10 text-primary-ink" : "bg-sunk text-text-soft"
                }`}
              >
                {p.statut === "repondu" ? "✅ Répondu" : p.statut === "ouvert" ? "👁 Ouvert" : "📨 Envoyé"}
              </span>
              {p.date && <span className="hidden w-24 shrink-0 text-right text-xs text-text-faint sm:block">{ilYa(p.date)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
