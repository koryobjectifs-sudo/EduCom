"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ArrowRight, Check } from "lucide-react";
import { getOnboardingConfig, type EtapeTour } from "@/lib/onboarding-metiers";
import { marquerGuideVu } from "@/app/dashboard/aide/actions";
import { useSidebarSlot } from "@/components/layout/SidebarSlot";

interface WalkthroughInteractifProps {
  role: string;
  ouvert: boolean;
  onFermer: () => void;
}

interface PositionBulle {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
  flecheOffset: number;
}

export default function WalkthroughInteractif({
  role,
  ouvert,
  onFermer,
}: WalkthroughInteractifProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setGuideActif } = useSidebarSlot();
  const config = getOnboardingConfig(role);

  const [etapeIndex, setEtapeIndex] = useState(0);
  const [cibleRect, setCibleRect] = useState<DOMRect | null>(null);
  const [positionBulle, setPositionBulle] = useState<PositionBulle | null>(null);
  const [enTransition, setEnTransition] = useState(false);

  // Réinitialiser systématiquement à la première étape (1/N) dès l'ouverture du tour
  useEffect(() => {
    if (ouvert) {
      setEtapeIndex(0);
      setCibleRect(null);
      setPositionBulle(null);
      setEnTransition(false);
    }
  }, [ouvert]);

  const bulleRef = useRef<HTMLDivElement>(null);
  const tour = config.tour;
  const etapeCourante: EtapeTour | undefined = tour[etapeIndex];

  // Calcul du positionnement ancré
  const calculerPosition = useCallback(
    (el: Element, placementPrefere: "top" | "bottom" | "left" | "right" = "right"): PositionBulle => {
      const rect = el.getBoundingClientRect();
      const largeurBulle = Math.min(340, window.innerWidth - 32);
      const hauteurEstimee = 175;

      let placement = placementPrefere;

      // Auto-inversion si débordement d'écran
      if (placement === "right" && rect.right + largeurBulle + 20 > window.innerWidth) {
        placement = "left";
      } else if (placement === "left" && rect.left - largeurBulle - 20 < 0) {
        placement = "bottom";
      } else if (placement === "bottom" && rect.bottom + hauteurEstimee + 20 > window.innerHeight) {
        placement = "top";
      } else if (placement === "top" && rect.top - hauteurEstimee - 20 < 0) {
        placement = "bottom";
      }

      let top = 0;
      let left = 0;
      let flecheOffset = 0;

      if (placement === "right") {
        left = rect.right + 12;
        top = Math.max(16, Math.min(window.innerHeight - hauteurEstimee - 16, rect.top + rect.height / 2 - hauteurEstimee / 2));
        flecheOffset = Math.max(16, Math.min(hauteurEstimee - 16, rect.top + rect.height / 2 - top));
      } else if (placement === "left") {
        left = Math.max(16, rect.left - largeurBulle - 12);
        top = Math.max(16, Math.min(window.innerHeight - hauteurEstimee - 16, rect.top + rect.height / 2 - hauteurEstimee / 2));
        flecheOffset = Math.max(16, Math.min(hauteurEstimee - 16, rect.top + rect.height / 2 - top));
      } else if (placement === "bottom") {
        top = rect.bottom + 12;
        left = Math.max(16, Math.min(window.innerWidth - largeurBulle - 16, rect.left + rect.width / 2 - largeurBulle / 2));
        flecheOffset = Math.max(16, Math.min(largeurBulle - 16, rect.left + rect.width / 2 - left));
      } else if (placement === "top") {
        top = Math.max(16, rect.top - hauteurEstimee - 12);
        left = Math.max(16, Math.min(window.innerWidth - largeurBulle - 16, rect.left + rect.width / 2 - largeurBulle / 2));
        flecheOffset = Math.max(16, Math.min(largeurBulle - 16, rect.left + rect.width / 2 - left));
      }

      return { top, left, placement, flecheOffset };
    },
    []
  );

  // Recherche et ancrage sur l'élément de l'étape courante
  useEffect(() => {
    if (!ouvert || !etapeCourante) return;

    let actif = true;
    let timerId: NodeJS.Timeout;
    let tentatives = 0;

    // Si l'étape requiert une autre page, on navigue d'abord
    if (etapeCourante.pageCible && pathname !== etapeCourante.pageCible) {
      setEnTransition(true);
      router.push(etapeCourante.pageCible);
    }

    const chercherElement = () => {
      if (!actif) return;

      const el = document.querySelector(etapeCourante.selecteur);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const r = el.getBoundingClientRect();
        setCibleRect(r);
        setPositionBulle(calculerPosition(el, etapeCourante.placementPrefere));
        setEnTransition(false);
      } else {
        tentatives++;
        if (tentatives < 15) {
          timerId = setTimeout(chercherElement, 100);
        } else {
          // Élément introuvable sur cette vue : passer proprement à la suivante
          if (etapeIndex < tour.length - 1) {
            setEtapeIndex((prev) => prev + 1);
          } else {
            cloreTour();
          }
        }
      }
    };

    timerId = setTimeout(chercherElement, 120);

    // Recalcul sur redimensionnement ou scroll
    const onResizeOrScroll = () => {
      const el = document.querySelector(etapeCourante.selecteur);
      if (el) {
        const r = el.getBoundingClientRect();
        setCibleRect(r);
        setPositionBulle(calculerPosition(el, etapeCourante.placementPrefere));
      }
    };

    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    return () => {
      actif = false;
      clearTimeout(timerId);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [ouvert, etapeIndex, etapeCourante, pathname, router, calculerPosition, tour.length]);

  const cloreTour = async () => {
    onFermer();
    // Quand le tour est fini ou quitté, on ouvre la 2e sidebar sur la checklist de démarrage (Temps 3)
    setGuideActif(true);
    try {
      sessionStorage.setItem("educom_tour_dismissed", "true");
      await marquerGuideVu();
    } catch {
      // Ignorer
    }
  };

  const etapeSuivante = () => {
    if (etapeIndex < tour.length - 1) {
      setEtapeIndex((prev) => prev + 1);
    } else {
      cloreTour();
    }
  };

  const etapePrecedente = () => {
    if (etapeIndex > 0) {
      setEtapeIndex((prev) => prev - 1);
    }
  };

  // Raccourcis clavier : Échap (quitter), Entrée ou Flèche droite (suivant), Flèche gauche (précédent)
  useEffect(() => {
    if (!ouvert) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cloreTour();
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        etapeSuivante();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        etapePrecedente();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ouvert, etapeIndex, tour.length]);

  if (!ouvert || !etapeCourante || enTransition || !cibleRect || !positionBulle) {
    return null;
  }

  const estDerniereEtape = etapeIndex === tour.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visite guidée"
      className="fixed inset-0 z-50 pointer-events-none select-none print:hidden"
    >
      {/* Halo de découpe / Spotlight sur l'icône de navigation ciblée */}
      <div
        className="absolute pointer-events-auto transition-all duration-300 rounded-xl"
        style={{
          top: `${Math.max(0, cibleRect.top - 4)}px`,
          left: `${Math.max(0, cibleRect.left - 4)}px`,
          width: `${cibleRect.width + 8}px`,
          height: `${cibleRect.height + 8}px`,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
          outline: "3px solid #7C3AED",
        }}
      />

      {/* Bulle ancrée claire, harmonisée avec la 2e sidebar */}
      <div
        ref={bulleRef}
        style={{
          top: `${positionBulle.top}px`,
          left: `${positionBulle.left}px`,
          width: `${Math.min(340, window.innerWidth - 32)}px`,
        }}
        className="pointer-events-auto absolute z-50 rounded-2xl border border-purple-200/90 bg-white/98 p-4 text-slate-900 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Flèche triangulaire vers l'icône */}
        {positionBulle.placement === "right" && (
          <div
            aria-hidden="true"
            style={{ top: `${positionBulle.flecheOffset}px` }}
            className="absolute -left-2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-r-[8px] border-r-white drop-shadow-[-2px_0_1px_rgba(0,0,0,0.06)]"
          />
        )}
        {positionBulle.placement === "left" && (
          <div
            aria-hidden="true"
            style={{ top: `${positionBulle.flecheOffset}px` }}
            className="absolute -right-2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-white drop-shadow-[2px_0_1px_rgba(0,0,0,0.06)]"
          />
        )}
        {positionBulle.placement === "bottom" && (
          <div
            aria-hidden="true"
            style={{ left: `${positionBulle.flecheOffset}px` }}
            className="absolute -top-2 -translate-x-1/2 w-0 h-0 border-x-[8px] border-x-transparent border-b-[8px] border-b-white drop-shadow-[0_-2px_1px_rgba(0,0,0,0.06)]"
          />
        )}
        {positionBulle.placement === "top" && (
          <div
            aria-hidden="true"
            style={{ left: `${positionBulle.flecheOffset}px` }}
            className="absolute -bottom-2 -translate-x-1/2 w-0 h-0 border-x-[8px] border-x-transparent border-t-[8px] border-t-white drop-shadow-[0_2px_1px_rgba(0,0,0,0.06)]"
          />
        )}

        {/* En-tête : Progression discrète + bouton fermer */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-700">
            {etapeIndex + 1}/{tour.length}
          </span>
          <button
            type="button"
            onClick={cloreTour}
            aria-label="Quitter le tour"
            className="rounded p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Titre du module */}
        <h4 className="text-sm font-bold text-slate-900 leading-snug">
          {etapeCourante.titre}
        </h4>

        {/* En 1 phrase : à quoi ça sert */}
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
          {etapeCourante.description}
        </p>

        {/* En 1 phrase : l'action concrète */}
        {etapeCourante.actionConcrete && (
          <div className="mt-2 rounded-lg bg-purple-50/70 p-2 border border-purple-100 text-[11px] font-medium text-purple-950 leading-relaxed">
            {etapeCourante.actionConcrete}
          </div>
        )}

        {/* Barre de contrôles : Passer le tour à gauche, Suivant à droite */}
        <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={cloreTour}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Passer le tour
          </button>

          <button
            type="button"
            onClick={etapeSuivante}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-frame-bg,#581C87)] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <span>{estDerniereEtape ? "Terminer" : "Suivant"}</span>
            {estDerniereEtape ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
