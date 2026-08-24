"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SidebarNav, SchoolIdentity } from "./Sidebar";

/**
 * Navigation mobile — tiroir latéral.
 *
 * ═══ CE QU'ELLE REMPLACE ═══
 *
 * `BottomNav` était **cassé**. Ses cinq liens pointaient vers `/`,
 * `/admissions`, `/students`, `/payments`, `/reports` — **sans le préfixe
 * `/dashboard`**. Résultat : quatre liens sur cinq menaient à une 404, et le
 * cinquième faisait sortir de l'application vers la vitrine. La navigation
 * mobile était donc inutilisable. Elle ignorait de surcroît les permissions, et
 * n'affichait le libellé que de l'entrée active (`opacity-0 h-0 w-0` pour les
 * autres) — les quatre autres onglets n'étaient que des icônes muettes.
 *
 * Le tiroir lit `visibleSections()`, exactement comme la sidebar desktop :
 * les deux navigations ne peuvent plus diverger, et aucune entrée interdite
 * n'apparaît.
 *
 * ═══ POURQUOI UN TIROIR ET NON UNE BARRE D'ONGLETS ═══
 *
 * Une barre inférieure ne tient que 4 à 5 destinations. EduCom en a jusqu'à dix
 * selon le rôle : il faudrait en cacher la moitié, ou les réduire à des icônes —
 * ce que faisait l'ancienne version, avec le résultat décrit plus haut. Un
 * tiroir affiche la liste complète, groupée et libellée, comme sur desktop.
 *
 * Accessibilité : `role="dialog"`, `aria-modal`, fermeture par `Escape`, focus
 * porté sur le panneau à l'ouverture et rendu au déclencheur à la fermeture,
 * défilement d'arrière-plan bloqué. Même contrat que la primitive `Modal` du
 * lot 04 — non réutilisée telle quelle car un tiroir latéral pleine hauteur n'a
 * ni la géométrie ni l'en-tête d'une boîte de dialogue centrée.
 */
export default function MobileNav({
  schoolName = "EduCom",
  schoolLogo,
  userRole = "PARENT",
}: {
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Naviguer ferme le tiroir : sans cela il reste ouvert par-dessus la page
  // qu'on vient de demander.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Le focus revient au bouton d'ouverture, pas en haut du document.
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la navigation"
        aria-expanded={open}
        icon={<Menu aria-hidden="true" className="h-6 w-6 text-text" />}
        className="lg:hidden h-12 w-12 flex items-center justify-center p-0"
      />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div
            aria-hidden="true"
            onMouseDown={() => setOpen(false)}
            className="absolute inset-0 bg-text/40"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            tabIndex={-1}
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-rule bg-surface shadow-overlay focus:outline-none"
          >
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-rule px-4">
              <SchoolIdentity schoolName={schoolName} schoolLogo={schoolLogo} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Fermer la navigation"
                icon={<X aria-hidden="true" className="h-4 w-4" />}
                className="shrink-0"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav userRole={userRole} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
