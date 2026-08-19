import type { ReactNode } from "react";
import { describeStatus, type StatusDomain, type StatusVariant } from "@/lib/status";

/**
 * Pastille d'état.
 *
 * ⚠️ RÈGLE NON NÉGOCIABLE : **le texte porte l'information, la couleur la
 * renforce.** `children` est requis par le typage — il n'existe aucun moyen de
 * rendre une pastille colorée sans libellé. Un utilisateur daltonien, une
 * impression en noir et blanc et un lecteur d'écran doivent tous obtenir
 * l'état.
 *
 * La puce colorée facultative (`dot`) est purement décorative : elle est
 * marquée `aria-hidden` et ne remplace jamais le mot.
 *
 * Les couleurs viennent des tokens sémantiques du socle (lot 02) : changer la
 * charte ne demande de toucher que `globals.css`.
 */

const VARIANT: Record<StatusVariant, { pill: string; dot: string }> = {
  success: { pill: "bg-success/10 text-success", dot: "bg-success" },
  warning: { pill: "bg-warning/10 text-warning", dot: "bg-warning" },
  danger:  { pill: "bg-danger/10 text-danger",   dot: "bg-danger" },
  info:    { pill: "bg-accent/10 text-accent",   dot: "bg-accent" },
  neutral: { pill: "bg-sunk text-text-soft",     dot: "bg-text-faint" },
};

const SIZE = {
  sm: "px-2 py-0.5 text-role-meta gap-1",
  md: "px-3 py-1 text-role-meta gap-1.5",
} as const;

export type BadgeProps = {
  /** Libellé. Requis : une pastille sans texte n'est pas rendue. */
  children: ReactNode;
  variant?: StatusVariant;
  size?: keyof typeof SIZE;
  /** Ajoute une puce colorée devant le texte. Décorative uniquement. */
  dot?: boolean;
  /** Infobulle native, pour les états dont le libellé mérite une précision. */
  title?: string;
  className?: string;
};

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  title,
  className = "",
}: BadgeProps) {
  const v = VARIANT[variant];
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-pill font-medium whitespace-nowrap ${v.pill} ${SIZE[size]} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-pill ${v.dot}`} />}
      {children}
    </span>
  );
}

export type StatusBadgeProps = Omit<BadgeProps, "children" | "variant" | "title"> & {
  domain: StatusDomain;
  status: string | null | undefined;
  /** Affiche la précision du statut en infobulle quand elle existe. */
  showHint?: boolean;
};

/**
 * Pastille dérivée du vocabulaire d'état — la forme à préférer partout.
 *
 * Libellé et couleur viennent tous deux de `src/lib/status.ts` : aucun écran ne
 * décide plus lui-même qu'un « payé » est vert ni comment il se traduit.
 */
export function StatusBadge({ domain, status, showHint = true, ...rest }: StatusBadgeProps) {
  const { label, variant, hint } = describeStatus(domain, status);
  return (
    <Badge variant={variant} title={showHint ? hint : undefined} {...rest}>
      {label}
    </Badge>
  );
}

export default Badge;
