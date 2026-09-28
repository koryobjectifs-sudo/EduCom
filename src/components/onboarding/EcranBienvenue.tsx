"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Compass, CheckCircle2 } from "lucide-react";
import { useSidebarSlot } from "@/components/layout/SidebarSlot";

interface EcranBienvenueProps {
  userRole?: string;
  userName?: string;
  schoolName?: string;
  onDecouvrir?: () => void;
  onPasser?: () => void;
}

export default function EcranBienvenue({
  userRole = "OWNER",
  userName,
  schoolName,
  onDecouvrir,
  onPasser,
}: EcranBienvenueProps) {
  const { setTourDeclenche } = useSidebarSlot();
  const [enSortie, setEnSortie] = useState(false);

  const prenom = userName?.trim().split(/\s+/)[0] || schoolName || "Bienvenue";

  let promesseMetier = "Tout votre établissement — élèves, notes, paiements — géré au même endroit, sans paperasse.";
  if (userRole === "TEACHER") {
    promesseMetier = "Saisissez vos notes en 3 clics et faites l'appel sans perdre de temps.";
  } else if (userRole === "ACCOUNTANT") {
    promesseMetier = "Encaissez les écolages, éditez des reçus officiels et suivez les impayés en direct.";
  } else if (userRole === "SECRETARY") {
    promesseMetier = "Gérez les inscriptions, l'annuaire des élèves et les registres en toute sérénité.";
  }

  const handleLancerTour = () => {
    setEnSortie(true);
    setTimeout(() => {
      if (onDecouvrir) {
        onDecouvrir();
      } else {
        setTourDeclenche(true);
      }
    }, 150);
  };

  const handlePasser = () => {
    setEnSortie(true);
    setTimeout(() => {
      if (onPasser) onPasser();
    }, 150);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[28px] border border-purple-200/80 bg-linear-to-b from-white via-purple-50/20 to-white p-7 sm:p-10 shadow-[0_12px_40px_-15px_rgba(88,28,135,0.08)] transition-all duration-300 ${
        enSortie ? "opacity-0 scale-98 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Halo d'ambiance d'arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl"
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Colonne Gauche : Salutation chaleureuse + Promesse claire */}
        <div className="max-w-2xl space-y-4 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-white/90 px-3.5 py-1 text-xs font-semibold text-[var(--color-frame-bg,#581C87)] shadow-2xs backdrop-blur-xs">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[11px]">
              ✨
            </span>
            <span>Première connexion sur EduCom</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              Bienvenue sur EduCom, {prenom}&nbsp;<span className="inline-block animate-bounce text-3xl sm:text-4xl">👋</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              {promesseMetier}
            </p>
          </div>

          {/* Micro-atouts rassurants */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Conforme aux normes sénégalaises</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
              <span>Données isolées et sécurisées</span>
            </div>
          </div>

          {/* Deux actions claires et bien hiérarchisées */}
          <div className="flex flex-wrap items-center gap-3.5 pt-3">
            <button
              type="button"
              onClick={handleLancerTour}
              className="inline-flex h-11.5 items-center justify-center gap-2 rounded-xl bg-[var(--color-frame-bg,#581C87)] px-6 text-sm font-bold text-white shadow-md hover:bg-purple-900 hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>Découvrir EduCom en 2 minutes</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={handlePasser}
              className="inline-flex h-11.5 items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-black/5 transition-colors cursor-pointer"
            >
              Plus tard, je regarde par moi-même
            </button>
          </div>
        </div>

        {/* Colonne Droite : Visuel léger et valorisant */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-3xl border border-purple-200/90 bg-linear-to-br from-white to-purple-50 p-6 shadow-xl">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-frame-bg,#581C87)] text-white shadow-md">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900">Visite Express</p>
                <p className="text-[10.5px] text-purple-700 font-semibold">6 clics · 1 min</p>
              </div>
            </div>

            {/* Badge flottant */}
            <span className="absolute -bottom-2.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[10px] font-bold text-emerald-800 shadow-xs">
              ⚡ Guidé pas-à-pas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
