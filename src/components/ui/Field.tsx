"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Champs de formulaire du socle EduCom.
 *
 * ═══ LE LABEL EST LIÉ PAR CONSTRUCTION ═══
 *
 * Le dépôt comptait **49 `htmlFor` pour 141 champs** : environ deux tiers des
 * champs n'avaient aucun label programmatiquement associé. Un lecteur d'écran
 * annonçait « zone de texte » sans dire laquelle, et cliquer le libellé ne
 * donnait pas le focus.
 *
 * Ici l'`id` est généré par `useId()` quand il n'est pas fourni, et le `label`
 * y est relié systématiquement. Il n'y a pas de chemin de code qui produise un
 * champ sans label lié — sauf à passer explicitement `label={undefined}`, ce
 * qui exige alors un `aria-label`.
 *
 * ═══ L'ERREUR EST ANNONCÉE, PAS SEULEMENT COLORÉE ═══
 *
 * `error` pose `aria-invalid` et relie le message par `aria-describedby`. Le
 * message est du texte : la bordure rouge ne fait que le renforcer, exactement
 * comme les pastilles d'état du lot 03.
 */

/* ──────────────────────────── enveloppe commune ──────────────────────────── */

type FieldShellProps = {
  id: string;
  label?: ReactNode;
  /** Texte d'aide affiché sous le champ, avant toute erreur. */
  hint?: ReactNode;
  /** Message d'erreur. Sa présence bascule le champ en état invalide. */
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

function FieldShell({ id, label, hint, error, required, className = "", children }: FieldShellProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-role-label font-medium text-text-soft mb-1.5">
          {label}
          {required && (
            <>
              <span aria-hidden="true" className="text-danger ml-0.5">*</span>
              <span className="sr-only"> (obligatoire)</span>
            </>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-role-meta text-text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-role-meta text-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

/** Classes partagées par les trois contrôles, pour qu'ils ne divergent pas. */
function controlClasses(error?: string | null, extra = "") {
  return [
    "block w-full rounded-control bg-surface px-3 py-2 text-role-body text-text",
    "placeholder:text-text-faint shadow-card transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    "disabled:bg-sunk disabled:text-text-faint disabled:cursor-not-allowed",
    error
      ? "border border-danger focus:border-danger focus-visible:ring-danger/30"
      : "border border-rule focus:border-primary",
    extra,
  ].join(" ");
}

/** Attributs d'accessibilité communs, dérivés de l'état du champ. */
function a11y(id: string, error?: string | null, hint?: ReactNode) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": described,
  };
}

/* ─────────────────────────────────── Input ─────────────────────────────────── */

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Classe appliquée au conteneur, pas au champ. */
  className?: string;
  inputClassName?: string;
};

export function Input({ label, hint, error, className, inputClassName = "", id, required, ...rest }: InputProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={fieldId}
        required={required}
        className={controlClasses(error, inputClassName)}
        {...a11y(fieldId, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}

/* ─────────────────────────────────── Select ────────────────────────────────── */

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  selectClassName?: string;
  children: ReactNode;
};

export function Select({ label, hint, error, className, selectClassName = "", id, required, children, ...rest }: SelectProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={fieldId}
        required={required}
        className={controlClasses(error, `appearance-none pr-9 ${selectClassName}`)}
        {...a11y(fieldId, error, hint)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/* ────────────────────────────────── Textarea ───────────────────────────────── */

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  textareaClassName?: string;
};

export function Textarea({ label, hint, error, className, textareaClassName = "", id, required, ...rest }: TextareaProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={fieldId}
        required={required}
        className={controlClasses(error, textareaClassName)}
        {...a11y(fieldId, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}
