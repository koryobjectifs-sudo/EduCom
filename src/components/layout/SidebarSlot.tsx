"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Contenu sur mesure pour la barre contextuelle (26 sept. 2026).
 *
 * Kory : la Communauté doit garder LA barre habituelle du logiciel (même
 * largeur, même style, même poignée) et y afficher ses propres entrées :
 * fil, sondages, canaux, classes, messages directs. Ces entrées dépendent de
 * données chargées par la page ; la page les « dépose » ici, et
 * `ContextualSidebar` les affiche à la place de ses liens fixes.
 */
export type RenduBarre = (replie: boolean) => React.ReactNode;

const Contexte = createContext<{ rendu: RenduBarre | null; setRendu: (r: RenduBarre | null) => void }>({
  rendu: null,
  setRendu: () => {},
});

export function SidebarSlotProvider({ children }: { children: React.ReactNode }) {
  const [rendu, setEtat] = useState<RenduBarre | null>(null);
  // Une fonction passée à setState serait exécutée comme « updater » : on l'emballe.
  const setRendu = useCallback((r: RenduBarre | null) => setEtat(() => r), []);
  return <Contexte.Provider value={{ rendu, setRendu }}>{children}</Contexte.Provider>;
}

export const useSidebarSlot = () => useContext(Contexte);
