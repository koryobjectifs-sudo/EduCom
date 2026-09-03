import type { ReactNode } from "react";

/**
 * Carte du socle EduCom — **le seul traitement de surface du produit**.
 *
 * Le dépôt faisait cohabiter trois traitements concurrents : la carte blanche
 * opaque (402 `bg-white`), la carte en verre dépoli (66 `backdrop-blur`,
 * 69 `bg-white/NN`) et la carte en dégradé (23 `bg-gradient-to-*`), sans règle
 * d'emploi. Le socle du lot 02 n'en retient qu'un : blanc opaque, bordure 1px,
 * ombre discrète.
 *
 * Ce n'est pas un appauvrissement mais un choix argumenté : le verre dépoli
 * dégrade le contraste du texte, coûte en performance sur les machines d'école,
 * et **ne survit pas à l'impression** — or ce produit imprime beaucoup.
 *
 * Rayon, bordure et ombre viennent des tokens (`rounded-surface`,
 * `border-rule`, `shadow-card`) : une école qui change sa charte n'a rien à
 * modifier ici.
 */

export type CardProps = {
  children?: ReactNode;
  /** Titre de la carte. Rend l'en-tête et son filet séparateur. */
  title?: ReactNode;
  /** Texte secondaire sous le titre. */
  description?: ReactNode;
  /** Actions alignées à droite de l'en-tête. */
  actions?: ReactNode;
  /** Pied de carte, séparé par un filet. */
  footer?: ReactNode;
  /**
   * Retire le rembourrage du corps. Nécessaire quand le contenu gère le sien —
   * un tableau pleine largeur, par exemple, dont les cellules portent déjà leur
   * espacement et qui doit toucher les bords de la carte.
   */
  flush?: boolean;
  className?: string;
  /** Classe appliquée au corps uniquement. */
  bodyClassName?: string;
  onClick?: () => void;
  onKeyDown?: (e: any) => void;
  role?: string;
  tabIndex?: number;
};

export function Card({
  children,
  title,
  description,
  actions,
  footer,
  flush = false,
  className = "",
  bodyClassName = "",
  onClick,
  onKeyDown,
  role,
  tabIndex,
}: CardProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <div 
      className={`overflow-hidden rounded-surface border border-rule bg-surface shadow-card ${className}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
    >
      {/*
        ⚠️ Lot 16.1 — l'en-tête s'EMPILE sous 640 px. En ligne, `shrink-0` sur les
        actions écrasait le titre : mesuré au pilote Chrome à 390 px, la colonne
        de titre tombait à ~90 px et la description se brisait sur dix caractères
        de large. Sur un téléphone, ce n'est plus une description, c'est une
        colonne de lettres.
      */}
      {hasHeader && (
        <div className="flex flex-col gap-2 border-b border-rule px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-role-card font-semibold text-text">{title}</h2>}
            {description && <p className="mt-0.5 text-role-meta text-text-soft">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
        </div>
      )}

      {children && (
        <div className={`${flush ? "" : "px-5 py-4"} ${bodyClassName}`}>{children}</div>
      )}

      {footer && <div className="border-t border-rule px-5 py-3">{footer}</div>}
    </div>
  );
}

export default Card;
