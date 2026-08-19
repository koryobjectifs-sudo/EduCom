import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * En-tête de page du socle EduCom.
 *
 * Les 30 pages du tableau de bord répétaient chacune leur propre en-tête, avec
 * des titres allant de `text-2xl` à `text-3xl` et des dispositions divergentes.
 * Cette primitive fixe la structure : fil d'Ariane, titre, sous-titre, actions.
 *
 * Le titre est un `<h1>` unique par écran — c'est le point d'entrée de la
 * navigation par titres d'un lecteur d'écran, et le dépôt n'avait aucune
 * hiérarchie fiable jusqu'ici.
 *
 * Le fil d'Ariane est un vrai `<nav aria-label="Fil d'Ariane">` avec une liste
 * ordonnée : la position dans l'arborescence est une information, pas une
 * décoration. Il est facultatif — une page de premier niveau n'en a pas besoin.
 */

export type Crumb = { label: string; href?: string };

export type PageHeaderProps = {
  title: ReactNode;
  /** Texte explicatif sous le titre. */
  description?: ReactNode;
  /** Fil d'Ariane. Le dernier élément est la page courante et n'est pas un lien. */
  breadcrumb?: Crumb[];
  /** Boutons alignés à droite. */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-role-meta text-text-faint">
              {breadcrumb.map((c, i) => {
                const last = i === breadcrumb.length - 1;
                return (
                  <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0" />}
                    {c.href && !last ? (
                      <Link href={c.href} className="hover:text-text-soft transition-colors">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={last ? "page" : undefined} className={last ? "text-text-soft" : ""}>
                        {c.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <h1 className="text-role-page font-semibold tracking-tight text-text">{title}</h1>

        {description && (
          <p className="mt-1 text-role-body text-text-soft max-w-2xl">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
