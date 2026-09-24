"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, Check, Layers, Loader2, TriangleAlert } from "lucide-react";

/**
 * Kit de saisie des notes — **une seule expérience visuelle** pour toutes les
 * grilles (secondaire, élémentaire, saisie rapide par évaluation).
 *
 * Référence UX : la saisie secondaire (`grades/secondaire/SecondaireTable.tsx`),
 * choisie par Kory le 23 septembre 2026.
 *
 * ⚠️ **Ce fichier ne contient AUCUNE règle métier.** Ni calcul, ni validation,
 * ni sauvegarde : chaque écran garde ses actions serveur et son moteur de calcul
 * (`lib/notes/secondaire.ts`, `lib/notes/elementaire.ts`). Le kit ne fait que
 * présenter. Si une règle doit changer, c'est dans le moteur, jamais ici.
 *
 * ⚠️ **Le texte de la règle de calcul vient de l'écran appelant** (`CalculationRule`
 * reçoit ses `children`). Ne jamais y coder en dur la règle d'un cycle : elle
 * s'afficherait sous une grille dont le calcul est différent.
 */

export type SaveState = "idle" | "saving" | "saved" | "error";

// ─────────────────────────────────────────────────────────────
// EN-TÊTE
// ─────────────────────────────────────────────────────────────

export function EntryHeader({
  title,
  classLabel,
  tag,
  coefficient,
  notesCount,
  meta,
  terms,
  activeTermId,
  termHref,
  children,
}: {
  title: ReactNode;
  /** Classe, en pastille bleue à côté du titre. */
  classLabel?: string;
  /** Pastille neutre supplémentaire (ex. cycle). */
  tag?: string;
  /** Coefficient de la matière — omis quand l'écran n'en a pas (élémentaire). */
  coefficient?: number | null;
  notesCount: number;
  /** Ligne secondaire : trimestre · effectif · … */
  meta: ReactNode;
  terms: { id: string; name: string }[];
  activeTermId: string;
  termHref: (termId: string) => string;
  /** Barre de contexte (classe, matière, filtres) sous le titre. */
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {classLabel && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Layers aria-hidden="true" className="h-3 w-3" /> {classLabel}
              </span>
            )}
            {tag && (
              <span className="inline-flex items-center rounded-pill bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                {tag}
              </span>
            )}
            {coefficient != null && (
              <span className="inline-flex items-center rounded-pill bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                Coefficient {coefficient}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                notesCount > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500"
              }`}
            >
              {notesCount} note{notesCount > 1 ? "s" : ""} enregistrée{notesCount > 1 ? "s" : ""} pour cette évaluation
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{meta}</p>
        </div>

        {terms.length > 0 && (
          <nav
            aria-label="Trimestre"
            className="inline-flex max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 self-start sm:self-auto shrink-0"
          >
            {terms.map((t) => {
              const active = t.id === activeTermId;
              return (
                <Link
                  key={t.id}
                  href={termHref(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    active ? "bg-white text-primary shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t.name}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {children && (
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

/** Un champ de la barre de contexte : « Classe : [sélecteur] ». */
export function ContextField({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-x-auto pb-1 sm:pb-0">
      <span className="text-xs font-medium text-gray-500 shrink-0 inline-flex items-center gap-1">
        {icon}
        {label} :
      </span>
      {children}
    </div>
  );
}

/** Valeur fixe de la barre de contexte (une seule option possible). */
export function ContextValue({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
      {children}
    </span>
  );
}

export function ContextSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8.5 max-w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Pastilles de choix (matières). */
export function ContextChips({
  options,
  activeId,
  href,
}: {
  options: { id: string; label: string }[];
  activeId: string;
  href: (id: string) => string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((o) => {
        const active = o.id === activeId;
        return (
          <Link
            key={o.id}
            href={href(o.id)}
            aria-current={active ? "page" : undefined}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              active ? "bg-primary text-white font-semibold shadow-2xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLEAU
// ─────────────────────────────────────────────────────────────

/**
 * Conteneur de la grille. Sur petit écran, le tableau garde sa logique et
 * défile horizontalement ; la colonne « Élève » reste collée à gauche et
 * l'en-tête en haut.
 */
export function EntryTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-auto overscroll-x-contain max-h-[72vh] shadow-2xs">
      <table data-grade-grid className="min-w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function EntryHead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-20 bg-white">{children}</thead>;
}

type ThKind = "student" | "note" | "key" | "computed" | "text" | "group";

const TH_CLASS: Record<ThKind, string> = {
  student:
    "sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2.5 text-left font-bold text-gray-700 min-w-[140px] sm:min-w-[180px]",
  note: "border-b border-l border-gray-200 bg-gray-50/80 px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[76px]",
  key: "border-b border-l border-gray-200 bg-amber-50/30 px-2 py-2 text-center text-xs font-bold text-gray-800 min-w-[110px]",
  computed: "border-b border-l border-gray-200 bg-primary/5 px-2 py-2 text-center text-xs font-bold text-primary min-w-[76px]",
  text: "border-b border-l border-gray-200 bg-gray-50/80 px-2 py-2 text-left text-xs font-semibold text-gray-600 min-w-[220px]",
  group: "border-b border-l border-gray-200 bg-gray-50/80 px-3 py-2 text-center text-xs font-bold tracking-wide text-gray-800",
};

/**
 * En-tête de colonne.
 *   · `note`     — une évaluation saisie (Devoir, sous-discipline…)
 *   · `key`      — l'évaluation déterminante (Composition)
 *   · `computed` — une moyenne calculée, jamais saisie
 *   · `text`     — l'appréciation
 */
export function Th({
  kind,
  children,
  colSpan,
  rowSpan,
  sub,
  title,
}: {
  kind: ThKind;
  children: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  /** Petite mention sous le libellé (barème). */
  sub?: ReactNode;
  title?: string;
}) {
  return (
    <th scope="col" colSpan={colSpan} rowSpan={rowSpan} title={title} className={TH_CLASS[kind]}>
      {children}
      {sub != null && <span className="block text-[10px] font-normal text-gray-400">{sub}</span>}
    </th>
  );
}

export function EntryRow({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-gray-50/60 transition-colors">{children}</tr>;
}

export function StudentCell({ lastName, firstName }: { lastName: string; firstName: string }) {
  return (
    <th
      scope="row"
      className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-3 py-2 text-left font-medium text-gray-900 whitespace-nowrap shadow-xs"
    >
      {lastName} {firstName}
    </th>
  );
}

// ─────────────────────────────────────────────────────────────
// CHAMPS DE SAISIE
// ─────────────────────────────────────────────────────────────

/** Icône d'état en coin de cellule. Le libellé accessible double l'icône. */
export function SaveIndicator({ state, error }: { state: SaveState; error?: string }) {
  if (state === "saving")
    return <Loader2 aria-label="Enregistrement…" className="h-3 w-3 animate-spin text-gray-400" />;
  if (state === "saved") return <Check aria-label="Enregistré" className="h-3 w-3 text-emerald-500" />;
  if (state === "error")
    return <TriangleAlert aria-label={error ?? "Erreur"} className="h-3 w-3 text-red-500" />;
  return null;
}

/**
 * Déplacement clavier dans une colonne : `Entrée`/`↓` → élève suivant,
 * `Maj+Entrée`/`↑` → élève précédent. La sortie du champ déclenche la
 * sauvegarde de l'écran appelant (via son `onBlur`), comme un clic ailleurs.
 */
function moveInColumn(e: React.KeyboardEvent<HTMLInputElement>) {
  const down = (e.key === "Enter" && !e.shiftKey) || e.key === "ArrowDown";
  const up = (e.key === "Enter" && e.shiftKey) || e.key === "ArrowUp";
  if (!down && !up) return;
  const el = e.currentTarget;
  const row = Number(el.dataset.row);
  const col = el.dataset.col;
  const grid = el.closest("[data-grade-grid]");
  if (!grid || col === undefined || !Number.isFinite(row)) return;
  e.preventDefault();
  const next = grid.querySelector<HTMLInputElement>(`input[data-col="${col}"][data-row="${down ? row + 1 : row - 1}"]`);
  if (next) {
    next.focus();
    next.select();
  } else if (e.key === "Enter") {
    el.blur();
  }
}

/**
 * Cellule de note. États explicites, identiques sur toutes les grilles :
 *   vide (« — ») · saisie · invalide (rouge + message) · enregistrement (⟳)
 *   · enregistrée (✓) · manquante mais requise (`warning`, ambre).
 */
export function NoteCell({
  value,
  onChange,
  onBlur,
  state = "idle",
  error,
  emphasis = "normal",
  warning,
  hint,
  ariaLabel,
  row,
  col,
  readOnly = false,
}: {
  value: string;
  onChange: (raw: string) => void;
  onBlur: (raw: string) => void;
  state?: SaveState;
  error?: string;
  /** `key` = évaluation déterminante (Composition) : champ plus large, en gras. */
  emphasis?: "normal" | "key";
  /** Note requise mais absente (ex. composition manquante). */
  warning?: boolean;
  /** Mention sous le champ quand `warning` est actif. */
  hint?: string;
  ariaLabel: string;
  /** Position pour la navigation clavier. */
  row: number;
  col: string;
  readOnly?: boolean;
}) {
  const invalid = state === "error";
  const tone = readOnly
    ? "border-transparent bg-gray-50/70 text-gray-800 cursor-default select-none shadow-none font-semibold"
    : invalid
    ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-300"
    : warning
    ? "border-amber-400 bg-amber-50/60 text-amber-950 focus:ring-amber-400"
    : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 focus:ring-primary/40";

  return (
    <td
      className={`border-l border-b border-gray-100 p-1.5 relative text-center align-top ${
        emphasis === "key" ? (warning ? "bg-amber-50/40" : "bg-amber-50/20") : ""
      }`}
    >
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        data-row={row}
        data-col={col}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        title={error}
        placeholder="—"
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        onBlur={(e) => !readOnly && onBlur(e.target.value)}
        onFocus={(e) => !readOnly && e.currentTarget.select()}
        onKeyDown={readOnly ? undefined : moveInColumn}
        className={`${emphasis === "key" ? "w-16 font-bold" : "w-14 font-medium"} h-9 rounded-lg border text-center text-sm tabular-nums transition-colors focus:outline-none ${!readOnly ? "focus:ring-2" : ""} ${tone}`}
      />
      {!readOnly && (
        <span className="absolute top-1.5 right-1.5 pointer-events-none">
          <SaveIndicator state={state} error={error} />
        </span>
      )}
      {invalid && error ? (
        <span role="alert" className="block text-[10px] font-semibold text-red-600 leading-tight mt-0.5">
          {error}
        </span>
      ) : (
        warning &&
        hint && <span className="block text-[10px] font-semibold text-amber-700 leading-tight mt-0.5">{hint}</span>
      )}
    </td>
  );
}

/** Moyenne calculée — lecture seule, fond bleuté pour la distinguer d'un champ. */
export function ComputedCell({
  value,
  hint,
  strong,
}: {
  value: number | null | undefined;
  /** Mention quand la moyenne n'est pas calculable (ex. « Non comptée »). */
  hint?: string;
  /** Moyenne générale : fond plus marqué. */
  strong?: boolean;
}) {
  return (
    <td
      className={`border-l border-b border-gray-100 px-2 py-2 text-center text-sm tabular-nums ${
        strong ? "bg-primary/10" : "bg-primary/5"
      }`}
    >
      {value != null ? (
        <span className={`text-primary ${strong ? "font-extrabold" : "font-bold"}`}>{value.toFixed(2)}</span>
      ) : (
        <div className="flex flex-col items-center">
          <span className="text-gray-400 font-medium">—</span>
          {hint && <span className="text-[9.5px] font-medium text-amber-600">{hint}</span>}
        </div>
      )}
    </td>
  );
}

export function AppreciationCell({
  value,
  onChange,
  onBlur,
  state = "idle",
  error,
  placeholder = "Appréciation de l'élève…",
  ariaLabel,
  readOnly = false,
}: {
  value: string;
  onChange: (text: string) => void;
  onBlur: (text: string) => void;
  state?: SaveState;
  error?: string;
  placeholder?: string;
  ariaLabel: string;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <td className="border-l border-b border-gray-100 p-2 text-xs text-gray-700 align-middle">
        {value.trim() ? (
          <span className="italic">« {value.trim()} »</span>
        ) : (
          <span className="text-gray-400 font-light">—</span>
        )}
      </td>
    );
  }

  return (
    <td className="border-l border-b border-gray-100 p-1.5 relative align-top">
      <input
        type="text"
        aria-label={ariaLabel}
        aria-invalid={state === "error" || undefined}
        className={`w-full min-w-[200px] h-9 rounded-lg border px-2.5 pr-6 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${
          state === "error" ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-200 focus:ring-primary/40"
        }`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
      />
      <span className="absolute top-1.5 right-2 pointer-events-none">
        <SaveIndicator state={state} error={error} />
      </span>
      {state === "error" && error && (
        <span role="alert" className="block text-[10px] font-semibold text-red-600 leading-tight mt-0.5">
          {error}
        </span>
      )}
    </td>
  );
}

// ─────────────────────────────────────────────────────────────
// PIED DE GRILLE
// ─────────────────────────────────────────────────────────────

/** Règle de calcul applicable — le texte est fourni par l'écran, jamais figé ici. */
export function CalculationRule({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-200/80">
      <AlertCircle aria-hidden="true" className="h-4 w-4 text-amber-500 shrink-0 mt-px" />
      <p>
        <strong>Règle de calcul :</strong> {children}
      </p>
    </div>
  );
}

/** Rappel commun : sauvegarde automatique et raccourcis clavier. */
export function EntryHelp() {
  const kbd = "rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-sans";
  return (
    <p className="text-xs text-gray-500 px-1">
      <strong>Enregistrement automatique</strong> à la sortie du champ. Une case vide n&apos;est pas un zéro : elle
      n&apos;est pas comptée.
      <span className="hidden sm:inline text-gray-400">
        {" "}
        · <kbd className={kbd}>Entrée</kbd> ou <kbd className={kbd}>↓</kbd> élève suivant ·{" "}
        <kbd className={kbd}>↑</kbd> élève précédent
      </span>
    </p>
  );
}
