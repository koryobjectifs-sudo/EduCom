"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, Check } from "lucide-react";

interface SpotlightData {
  selecteur: string;
  titre: string;
  description: string;
}

interface PositionBulle {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
  flecheOffset: number;
}

export default function SpotlightActionCible() {
  const pathname = usePathname();
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [cibleRect, setCibleRect] = useState<DOMRect | null>(null);
  const [positionBulle, setPositionBulle] = useState<PositionBulle | null>(null);
  const bulleRef = useRef<HTMLDivElement>(null);

  const verifierSpotlight = useCallback(() => {
    try {
      const dataStr = sessionStorage.getItem("educom_active_step_spotlight");
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        setSpotlight(parsed);
      } else {
        setSpotlight(null);
        setCibleRect(null);
        setPositionBulle(null);
      }
    } catch {
      setSpotlight(null);
    }
  }, []);

  useEffect(() => {
    verifierSpotlight();
    const handleEvent = () => verifierSpotlight();
    window.addEventListener("educom:step_spotlight_triggered", handleEvent);
    return () => window.removeEventListener("educom:step_spotlight_triggered", handleEvent);
  }, [pathname, verifierSpotlight]);

  const calculerPosition = useCallback((el: Element): PositionBulle => {
    const rect = el.getBoundingClientRect();
    const largeurBulle = Math.min(320, window.innerWidth - 32);
    const hauteurEstimee = 140;

    let placement: "top" | "bottom" | "left" | "right" = "bottom";
    if (rect.bottom + hauteurEstimee + 20 > window.innerHeight && rect.top - hauteurEstimee - 20 > 0) {
      placement = "top";
    }

    let top = 0;
    let left = Math.max(16, Math.min(window.innerWidth - largeurBulle - 16, rect.left + rect.width / 2 - largeurBulle / 2));
    let flecheOffset = Math.max(16, Math.min(largeurBulle - 16, rect.left + rect.width / 2 - left));

    if (placement === "bottom") {
      top = rect.bottom + 12;
    } else {
      top = Math.max(16, rect.top - hauteurEstimee - 12);
    }

    return { top, left, placement, flecheOffset };
  }, []);

  const fermer = useCallback(() => {
    try {
      sessionStorage.removeItem("educom_active_step_spotlight");
    } catch {
      // Ignorer
    }
    setSpotlight(null);
    setCibleRect(null);
    setPositionBulle(null);
  }, []);

  useEffect(() => {
    if (!spotlight) return;

    let actif = true;
    let timerId: NodeJS.Timeout;
    let tentatives = 0;

    const chercherElement = () => {
      if (!actif) return;
      const el = document.querySelector(spotlight.selecteur);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const r = el.getBoundingClientRect();
        setCibleRect(r);
        setPositionBulle(calculerPosition(el));
      } else {
        tentatives++;
        if (tentatives < 20) {
          timerId = setTimeout(chercherElement, 100);
        } else {
          fermer();
        }
      }
    };

    timerId = setTimeout(chercherElement, 200);

    const onResizeOrScroll = () => {
      const el = document.querySelector(spotlight.selecteur);
      if (el) {
        const r = el.getBoundingClientRect();
        setCibleRect(r);
        setPositionBulle(calculerPosition(el));
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
  }, [spotlight, calculerPosition, fermer]);

  // Échap pour fermer
  useEffect(() => {
    if (!spotlight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spotlight, fermer]);

  if (!spotlight || !cibleRect || !positionBulle) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={spotlight.titre}
      className="fixed inset-0 z-50 pointer-events-none select-none print:hidden"
    >
      {/* Halo découpé discret (allégé, clair et lumineux) */}
      <div
        className="absolute pointer-events-auto transition-all duration-300 rounded-xl"
        style={{
          top: `${Math.max(0, cibleRect.top - 4)}px`,
          left: `${Math.max(0, cibleRect.left - 4)}px`,
          width: `${cibleRect.width + 8}px`,
          height: `${cibleRect.height + 8}px`,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.22), 0 0 15px rgba(139, 92, 246, 0.3)",
          outline: "2.5px solid #8B5CF6",
        }}
        onClick={fermer}
      />

      {/* Bulle ancrée pointant l'action */}
      <div
        ref={bulleRef}
        style={{
          top: `${positionBulle.top}px`,
          left: `${positionBulle.left}px`,
          width: `${Math.min(320, window.innerWidth - 32)}px`,
        }}
        className="pointer-events-auto absolute z-50 rounded-2xl border border-purple-200/90 bg-white/98 p-4 text-slate-900 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
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

        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
            Action recommandée
          </span>
          <button
            type="button"
            onClick={fermer}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <h4 className="text-xs font-bold text-slate-900 leading-snug">
          {spotlight.titre}
        </h4>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          {spotlight.description}
        </p>

        <div className="mt-3 flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={fermer}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-frame-bg,#581C87)] px-3 py-1 text-xs font-bold text-white shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <span>J&apos;ai compris</span>
            <Check className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
