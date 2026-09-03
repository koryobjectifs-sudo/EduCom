"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2 } from "lucide-react";

/**
 * Bouton du socle EduCom.
 *
 * Remplace les **247 `<button>`** écrits à la main dans le dépôt, dont un
 * bouton primaire déclinait une vingtaine de variantes différentes.
 *
 * ═══ L'ACCESSIBILITÉ EST IMPOSÉE PAR LE TYPAGE ═══
 *
 * Le dépôt comptait **0 `aria-label` pour 247 boutons**, alors que beaucoup
 * n'affichent qu'une icône : ils étaient muets au lecteur d'écran. Ici, le type
 * est une union discriminée — un bouton sans `children` **exige** un
 * `aria-label`, et le compilateur refuse l'oubli. Ce n'est pas une convention
 * qu'on peut contourner par distraction.
 *
 *   <Button>Enregistrer</Button>                          ✅
 *   <Button aria-label="Fermer"><X /></Button>             ✅
 *   <Button><X /></Button>                                 ❌ erreur TS
 *
 * ═══ ÉTAT DE CHARGEMENT ═══
 *
 * `loading` désactive le bouton, échange l'icône de gauche contre un
 * indicateur, et pose `aria-busy` : le lecteur d'écran annonce l'attente au
 * lieu de laisser croire à un bouton inerte.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  /* ⚠️ `bg-primary` PORTAIT du texte blanc à 2,89:1 — sous le seuil AA de
     4,5:1, et même sous les 3:1 du grand texte. Le bouton le plus utilisé du
     produit était illisible. `--color-primary-ink` est la même couleur de
     marque assombrie juste ce qu'il faut : la teinte de l'école est conservée,
     le texte redevient lisible, et AUCUNE classe d'appel ne change. */
  primary:
    "bg-primary-ink text-white border border-transparent hover:bg-primary-ink-hover active:bg-primary-ink-active shadow-card",
  secondary:
    "bg-surface text-text border border-rule hover:bg-sunk active:bg-sunk shadow-card",
  ghost:
    "bg-transparent text-text-soft border border-transparent hover:bg-sunk hover:text-text",
  danger:
    "bg-danger text-white border border-transparent hover:brightness-110 active:brightness-95 shadow-card",
};

/** Trois tailles. `iconOnly` passe en carré pour rester une cible de clic correcte. */
const SIZE: Record<Size, { base: string; icon: string }> = {
  sm: { base: "h-8 px-3 gap-1.5 text-role-label", icon: "h-8 w-8" },
  md: { base: "h-10 px-4 gap-2 text-role-body", icon: "h-10 w-10" },
  lg: { base: "h-12 px-6 gap-2 text-role-body", icon: "h-12 w-12" },
};

type Common = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
  /**
   * Référence vers l'élément natif.
   *
   * React 19 traite `ref` comme une prop ordinaire des composants fonction :
   * pas besoin de `forwardRef`. Nécessaire pour rendre le focus au déclencheur
   * après fermeture d'un tiroir ou d'une modale.
   */
  ref?: Ref<HTMLButtonElement>;
  variant?: Variant;
  size?: Size;
  /** Désactive, affiche un indicateur et pose `aria-busy`. */
  loading?: boolean;
  /** Icône avant le libellé. Remplacée par l'indicateur pendant le chargement. */
  icon?: ReactNode;
  /** Occupe toute la largeur disponible. */
  block?: boolean;
  className?: string;
};

/** Bouton avec libellé : `aria-label` facultatif. */
type WithLabel = Common & { children: ReactNode; "aria-label"?: string };

/** Bouton sans libellé visible : `aria-label` OBLIGATOIRE. */
type IconOnly = Common & { children?: never; "aria-label": string };

export type ButtonProps = WithLabel | IconOnly;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    block = false,
    className = "",
    children,
    disabled,
    type = "button",
    ...rest
  } = props as Common & { children?: ReactNode };

  const iconOnly = children === undefined || children === null;
  const s = SIZE[size];

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center font-semibold rounded-control",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        VARIANT[variant],
        iconOnly ? s.icon : s.base,
        block ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export default Button;
