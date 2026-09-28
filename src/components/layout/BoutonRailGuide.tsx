"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { useSidebarSlot } from "./SidebarSlot";
import { getOnboardingConfig } from "@/lib/onboarding-metiers";

interface BoutonRailGuideProps {
  userRole: string;
  guideVuAt?: Date | null;
}

export default function BoutonRailGuide({
  userRole,
  guideVuAt,
}: BoutonRailGuideProps) {
  const { guideActif, setGuideActif, setTourDeclenche } = useSidebarSlot();
  const [bulleVisible, setBulleVisible] = useState(false);
  const config = getOnboardingConfig(userRole);

  useEffect(() => {
    // Si l'utilisateur n'a jamais vu le guide et n'a pas fermé la bulle cette session
    if (!guideVuAt) {
      const dismiss = sessionStorage.getItem("educom_guide_bubble_dismissed");
      if (!dismiss) {
        const timer = setTimeout(() => setBulleVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [guideVuAt]);

  const fermerBulle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBulleVisible(false);
    sessionStorage.setItem("educom_guide_bubble_dismissed", "true");
  };

  const handleClicGuide = () => {
    fermerBulle();
    setGuideActif((prev) => !prev);
  };

  const lancerTourDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    fermerBulle();
    setGuideActif(true);
    setTourDeclenche(true);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        id="rail-bouton-guide"
        data-tour="rail-guide"
        onClick={handleClicGuide}
        title="Guide & Premiers pas"
        aria-label="Guide & Premiers pas"
        aria-pressed={guideActif}
        className={[
          "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-0 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
          guideActif
            ? "bg-white/20 text-white shadow-sm font-bold"
            : "text-white/80 hover:bg-white/15 hover:text-white",
        ].join(" ")}
      >
        {guideActif && (
          <span
            aria-hidden="true"
            data-testid="rail-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[22px] w-[3px] rounded-r-full bg-[var(--color-rail-accent,#9C0F15)]"
          />
        )}

        {/* Pastille pulsante verte si le tour n'a pas encore été vu */}
        {!guideVuAt && (
          <span className="absolute top-1 right-2 flex h-2 w-2 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        )}

        <Sparkles
          aria-hidden="true"
          className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${
            guideActif ? "text-amber-300" : "text-amber-300/90"
          }`}
        />

        <span className="mt-0.5 text-[10.5px] font-semibold leading-tight truncate max-w-[62px] text-center text-white">
          Guide
        </span>
      </button>

      {/* Bulle d'incitation ancrée au bouton Guide avec flèche pointée vers le bouton */}
      {bulleVisible && (
        <div
          role="tooltip"
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 w-72 rounded-2xl border border-purple-200/90 bg-white/95 p-3.5 text-slate-900 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 select-none hidden md:block"
        >
          {/* Flèche pointant vers le bouton Guide à gauche */}
          <div
            aria-hidden="true"
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[7px] border-y-transparent border-r-[8px] border-r-white drop-shadow-[-2px_0_1px_rgba(0,0,0,0.06)]"
          />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs font-bold shadow-2xs border border-amber-200">
                ⚡
              </span>
              <p className="text-xs font-bold text-slate-900">
                Faites le tour en 2 minutes
              </p>
            </div>

            <button
              type="button"
              onClick={fermerBulle}
              aria-label="Fermer la bulle"
              className="rounded p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">
            C&apos;est ici ! Cliquez sur <strong className="text-slate-900 font-semibold">Guide</strong> pour découvrir vos outils essentiels ({config.nomMetier}).
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={fermerBulle}
              className="text-[10.5px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Plus tard
            </button>

            <button
              type="button"
              onClick={lancerTourDirect}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-frame-bg,#581C87)] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:opacity-90 active:scale-95 transition-all"
            >
              <span>Découvrir</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
