"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

/**
 * Modale accessible du socle EduCom.
 *
 * Remplace les **20 calques `fixed inset-0` répartis dans 9 fichiers**, tous
 * écrits à la main, aucun n'annonçant sa nature au lecteur d'écran (le dépôt
 * comptait **0 `role=`**) ni ne gérant le focus.
 *
 * ═══ CE QUE LA MODALE GARANTIT ═══
 *
 * 1. `role="dialog"` + `aria-modal` + `aria-labelledby` : le lecteur d'écran
 *    annonce qu'une boîte de dialogue s'est ouverte, et laquelle.
 *
 * 2. **Piège de focus.** `Tab` et `Maj+Tab` bouclent à l'intérieur. Sans cela,
 *    la tabulation part derrière le calque — l'utilisateur clavier se retrouve
 *    à parcourir une page qu'il ne voit pas, sur des contrôles qu'un calque
 *    opaque recouvre.
 *
 * 3. **`Escape` ferme.** Attendu de toute boîte de dialogue.
 *
 * 4. **Focus initial et restitution.** À l'ouverture, le focus va sur le
 *    premier élément focusable (ou sur la boîte). À la fermeture, il **revient
 *    sur l'élément qui l'avait avant** : sans cela, le focus retombe en haut du
 *    document et l'utilisateur clavier perd sa place.
 *
 * 5. **Défilement de l'arrière-plan bloqué** pendant l'ouverture.
 *
 * Le clic sur le fond ferme par défaut ; `dismissible={false}` l'empêche pour
 * une action destructive qui exige un choix explicite.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Titre de la boîte. Relié par `aria-labelledby`. */
  title: ReactNode;
  /** Texte secondaire sous le titre. */
  description?: ReactNode;
  children?: ReactNode;
  /** Zone d'actions en pied, alignée à droite. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** `false` : ni clic sur le fond ni `Escape` ne ferment. */
  dismissible?: boolean;
};

const SIZE = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const focusables = useCallback(() => {
    const root = panelRef.current;
    if (!root) return [] as HTMLElement[];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  // Mémorise l'élément actif, donne le focus à la boîte, le restitue en sortant.
  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    const first = focusables()[0];
    (first ?? panelRef.current)?.focus();

    return () => {
      // `isConnected` : l'élément d'origine peut avoir disparu du DOM entre-temps
      // (ligne de tableau supprimée par l'action même que la modale confirmait).
      const target = restoreTo.current;
      if (target && target.isConnected) target.focus();
    };
  }, [open, focusables]);

  // Escape + piège de focus.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Le focus sort par le bas → retour au premier ; par le haut → au dernier.
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, dismissible, onClose, focusables]);

  // Bloque le défilement de l'arrière-plan.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
      // Le fond est décoratif : la fermeture au clic est un raccourci, doublé
      // par Escape et par le bouton de fermeture, tous deux accessibles clavier.
      onMouseDown={dismissible ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-text/40" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full ${SIZE[size]} rounded-surface border border-rule bg-surface shadow-overlay focus:outline-none`}
      >
        <div className="flex items-start gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-role-card font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-role-meta text-text-soft">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Fermer"
              onClick={onClose}
              icon={<X aria-hidden="true" className="h-4 w-4" />}
              className="-mr-1 -mt-1 shrink-0"
            />
          )}
        </div>

        {children && <div className="px-5 py-4 text-role-body text-text-soft">{children}</div>}

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-rule px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
