import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

/**
 * État vide du socle EduCom.
 *
 * ⚠️ **API rétro-compatible.** Cinq générateurs de documents — zone réservée au
 * lot 09 — importent déjà ce composant avec la signature
 * `{ icon, title, description, action: { label, onClick } }`. Les ajouts
 * ci-dessous sont strictement additifs : `description` et `icon` deviennent
 * facultatifs, et `action` accepte désormais un `href` en plus d'un `onClick`.
 * Rien ne casse chez les appelants existants.
 *
 * Deux changements visuels, alignés sur le socle du lot 02 :
 *   - le halo décoratif en `blur-3xl` est retiré — le socle n'admet qu'un seul
 *     traitement de surface, sans flou ni lueur ;
 *   - le bouton passe par la primitive `Button`, donc par les tokens.
 *
 * Un état vide dit **ce qui manque** et **quoi faire ensuite**. Sans action
 * proposée, il ne fait que constater — c'est pour cela que `action` existe.
 */

type Action =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  /** `sm` pour un état vide à l'intérieur d'une carte ou d'un tableau. */
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className = "",
}: EmptyStateProps) {
  const compact = size === "sm";

  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-surface",
        "border border-dashed border-rule bg-ground text-center",
        compact ? "px-4 py-8" : "px-4 py-12",
        className,
      ].join(" ")}
    >
      {Icon && (
        <div
          className={[
            "flex items-center justify-center rounded-surface border border-rule bg-surface text-text-faint shadow-card",
            compact ? "mb-3 h-10 w-10" : "mb-4 h-14 w-14",
          ].join(" ")}
        >
          <Icon aria-hidden="true" className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
      )}

      <h3 className={`font-semibold text-text ${compact ? "text-role-body" : "text-role-card"}`}>
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-role-body leading-relaxed text-text-soft">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              {action.label}
            </Link>
          ) : (
            <Button onClick={action.onClick} size={compact ? "sm" : "md"}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
