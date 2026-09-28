"use client";

import React, {
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type ReactNode,
  type Ref,
  useState,
  isValidElement,
  cloneElement,
} from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Bouton universel du socle EduCom (Standard Slack / Linear / Stripe).
 *
 * ═══ DESIGN SYSTEM & TOKENS ═══
 * - Rayon fixe : 8px (rounded-lg) pour tous les boutons d'action.
 * - 4 hauteurs standardisées :
 *    • lg : 48px (h-12, px-6, text-sm sm:text-base font-semibold) — Action primaire de page / mobile
 *    • md : 40px (h-10, px-4, text-sm font-medium) — Standard desktop
 *    • sm : 32px (h-8, px-3, text-xs font-medium) — Tableaux, barres d'outils
 *    • xs : 28px (h-7, px-2.5, text-xs font-medium) — Actions denses, micro-boutons
 * - 4 variantes sémantiques :
 *    • primary : Action principale unique par écran (bg-primary-ink text-white)
 *    • secondary : Actions secondaires (fond surface, bordure règle discrète)
 *    • ghost : Actions tertiaires / annuler (fond transparent au repos)
 *    • danger : Actions destructives (rouge alerte certifié AA)
 *
 * ═══ ÉTATS & INTERACTION ═══
 * - Hover / Active : micro-interaction soignée, feedback haptique visuel (scale-[0.99])
 * - Double-click lock : protection native contre les doubles clics accidentels
 * - Loading : spinner Loader2, désactivation automatique, aria-busy
 * - Focus-visible : anneau accessible au clavier
 *
 * ═══ ACCESSIBILITÉ IMPOSÉE ═══
 * - Bouton sans libellé visible -> aria-label OBLIGATOIRE au typage TS.
 *
 * ═══ RÉTROCOMPATIBILITÉ & POLYMORPHISME ═══
 * - Si `href` est fourni -> rendu automatique en Next.js `<Link>` avec le style bouton.
 * - Si `asChild` est fourni -> injecte les classes dans le composant enfant unique.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export type Variant = ButtonVariant;
export type Size = ButtonSize;

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-ink text-white border border-transparent hover:bg-primary-ink-hover active:bg-primary-ink-active shadow-sm active:scale-[0.99]",
  secondary:
    "bg-surface text-text border border-rule hover:bg-sunk hover:border-slate-300 active:bg-slate-100 shadow-xs active:scale-[0.99]",
  ghost:
    "bg-transparent text-text-soft border border-transparent hover:bg-sunk hover:text-text active:scale-[0.99]",
  danger:
    "bg-danger text-white border border-transparent hover:brightness-110 active:brightness-95 shadow-sm active:scale-[0.99]",
};

export const BUTTON_SIZES: Record<ButtonSize, { base: string; icon: string; iconSize: string }> = {
  xs: { base: "h-7 px-2.5 gap-1.5 text-xs font-medium", icon: "h-7 w-7", iconSize: "h-3.5 w-3.5" },
  sm: { base: "h-8 px-3 gap-1.5 text-xs font-medium", icon: "h-8 w-8", iconSize: "h-3.5 w-3.5" },
  md: { base: "h-10 px-4 gap-2 text-sm font-medium", icon: "h-10 w-10", iconSize: "h-4 w-4" },
  lg: { base: "h-12 px-6 gap-2 text-sm sm:text-base font-semibold", icon: "h-12 w-12", iconSize: "h-4.5 w-4.5" },
};

type Common = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  className?: string;
  href?: string;
  asChild?: boolean;
  "aria-label"?: string;
};

type WithLabel = Common & { children: ReactNode; "aria-label"?: string };
type IconOnly = Common & { children?: never; "aria-label": string };

export type ButtonProps = WithLabel | IconOnly;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    icon,
    iconRight,
    block = false,
    className = "",
    children,
    disabled,
    type = "button",
    href,
    asChild = false,
    onClick,
    ref,
    "aria-label": ariaLabel,
    ...rest
  } = props as Common & { children?: ReactNode };

  const [clickLocked, setClickLocked] = useState(false);
  const iconOnly = children === undefined || children === null || children === false;
  const s = BUTTON_SIZES[size];
  const isInactive = Boolean(disabled || loading || clickLocked);

  const classes = [
    "inline-flex items-center justify-center font-medium rounded-lg select-none cursor-pointer",
    "transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:scale-100",
    BUTTON_VARIANTS[variant],
    iconOnly ? s.icon : s.base,
    block ? "w-full" : "",
    className,
  ].filter(Boolean).join(" ");

  const renderedContent = (
    <>
      {loading ? (
        <Loader2 aria-hidden="true" className={`${s.iconSize} animate-spin shrink-0`} />
      ) : (
        icon
      )}
      {loading ? (loadingText ?? children) : children}
      {!loading && iconRight}
    </>
  );

  // Support asChild pour composants tiers / wrappers
  if (asChild && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: [classes, (children.props as { className?: string }).className].filter(Boolean).join(" "),
      ...rest,
    });
  }

  // Rendu sous forme de Next Link si href est spécifié
  if (href) {
    if (disabled || loading) {
      return (
        <span
          role="link"
          aria-disabled="true"
          aria-busy={loading || undefined}
          aria-label={ariaLabel}
          className={`${classes} opacity-50 cursor-not-allowed pointer-events-none`}
        >
          {renderedContent}
        </span>
      );
    }
    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        ref={ref as unknown as Ref<HTMLAnchorElement>}
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {renderedContent}
      </Link>
    );
  }

  // Anti double-clic natif sur bouton standard
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isInactive) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      setClickLocked(true);
      try {
        const result = onClick(e) as unknown;
        if (Boolean(result) && typeof (result as { finally?: unknown }).finally === "function") {
          (result as Promise<unknown>).finally(() => setClickLocked(false));
          return;
        }
      } catch (err) {
        setClickLocked(false);
        throw err;
      }
      setTimeout(() => setClickLocked(false), 450);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isInactive}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={classes}
      {...rest}
    >
      {renderedContent}
    </button>
  );
}

export default Button;
