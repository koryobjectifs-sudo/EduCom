"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import WalkthroughInteractif from "./WalkthroughInteractif";
import { getOnboardingConfig } from "@/lib/onboarding-metiers";

interface IncitationPremiereConnexionProps {
  role: string;
  guideVuAt: Date | null;
}

export default function IncitationPremiereConnexion({
  role,
  guideVuAt,
}: IncitationPremiereConnexionProps) {
  const [visible, setVisible] = useState(false);
  const [tourOuvert, setTourOuvert] = useState(false);
  const config = getOnboardingConfig(role);

  useEffect(() => {
    // Si l'utilisateur n'a jamais vu le guide en base et n'a pas fermé le toast dans sa session
    if (!guideVuAt) {
      const dismiss = sessionStorage.getItem("educom_tour_dismissed");
      if (!dismiss) {
        // Apparition progressive après 1.2s de navigation
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [guideVuAt]);

  const fermer = () => {
    setVisible(false);
    sessionStorage.setItem("educom_tour_dismissed", "true");
  };

  const lancer = () => {
    setVisible(false);
    setTourOuvert(true);
  };

  if (!visible && !tourOuvert) return null;

  return (
    <>
      {visible && (
        <aside
          aria-label="Invitation à la prise en main"
          className="fixed bottom-6 left-4 md:left-20 z-40 max-w-sm rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 select-none print:hidden"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-xs font-bold text-slate-900">
                Bienvenue sur EduCom !
              </p>
            </div>

            <button
              type="button"
              onClick={fermer}
              aria-label="Plus tard"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Prenez 2 minutes pour découvrir votre espace{" "}
            <strong className="text-slate-900">{config.nomMetier}</strong> et vos
            outils essentiels.
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={fermer}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Plus tard
            </button>

            <button
              type="button"
              onClick={lancer}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all"
            >
              <span>Faire le tour (2 min)</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </aside>
      )}

      {/* Tour guidé interactif */}
      <WalkthroughInteractif
        role={role}
        ouvert={tourOuvert}
        onFermer={() => setTourOuvert(false)}
      />
    </>
  );
}
