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

interface SidebarSlotContextType {
  rendu: RenduBarre | null;
  setRendu: (r: RenduBarre | null) => void;
  guideActif: boolean;
  setGuideActif: (actif: boolean | ((prev: boolean) => boolean)) => void;
  tourDeclenche: boolean;
  setTourDeclenche: (actif: boolean) => void;
}

const Contexte = createContext<SidebarSlotContextType>({
  rendu: null,
  setRendu: () => {},
  guideActif: false,
  setGuideActif: () => {},
  tourDeclenche: false,
  setTourDeclenche: () => {},
});

export function SidebarSlotProvider({ children }: { children: React.ReactNode }) {
  const [rendu, setEtat] = useState<RenduBarre | null>(null);
  const [guideActif, setGuideActif] = useState(false);
  const [tourDeclenche, setTourDeclenche] = useState(false);
  const setRendu = useCallback((r: RenduBarre | null) => setEtat(() => r), []);

  return (
    <Contexte.Provider
      value={{
        rendu,
        setRendu,
        guideActif,
        setGuideActif,
        tourDeclenche,
        setTourDeclenche,
      }}
    >
      {children}
    </Contexte.Provider>
  );
}

export const useSidebarSlot = () => useContext(Contexte);
