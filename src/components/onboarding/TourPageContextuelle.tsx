"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { SECTIONS_FORMATION, type SectionFormation, type EtapeFormationPage } from "@/lib/onboarding-metiers";

interface PositionBulle {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
  flecheOffset: number;
}

function resolveSection(pathname: string | null): SectionFormation | null {
  if (!pathname) return null;
  if (pathname === "/dashboard/students/new") return SECTIONS_FORMATION.students_new;
  if (pathname === "/dashboard/students/import") return SECTIONS_FORMATION.students_import;
  if (pathname === "/dashboard/students") return SECTIONS_FORMATION.students;
  if (pathname === "/dashboard/payments/new") return SECTIONS_FORMATION.payments_new;
  if (pathname === "/dashboard/payments") return SECTIONS_FORMATION.payments;
  if (pathname === "/dashboard/grades/report-card") return SECTIONS_FORMATION.grades_report_card;
  if (pathname === "/dashboard/grades") return SECTIONS_FORMATION.grades;
  if (pathname === "/dashboard/documents") return SECTIONS_FORMATION.documents;
  if (pathname === "/dashboard/team") return SECTIONS_FORMATION.team;
  if (pathname === "/dashboard/settings") return SECTIONS_FORMATION.settings;
  if (pathname.startsWith("/dashboard/communications")) return SECTIONS_FORMATION.comms;
  return null;
}

function TourPageContenu({ sectionCourante }: { sectionCourante: SectionFormation }) {
  const [etapeIndex, setEtapeIndex] = useState(0);
  const [tourActif, setTourActif] = useState(false);
  const [cibleRect, setCibleRect] = useState<DOMRect | null>(null);
  const [positionBulle, setPositionBulle] = useState<PositionBulle | null>(null);
  const bulleRef = useRef<HTMLDivElement>(null);

  // Activation conditionnelle au montage de la section
  useEffect(() => {
    try {
      // Enregistrement de la date de 1ère visite si absente
      let firstVisit = localStorage.getItem("educom_first_connection_time");
      if (!firstVisit) {
        firstVisit = Date.now().toString();
        localStorage.setItem("educom_first_connection_time", firstVisit);
      }
      const joursDepuisPremierAcces = (Date.now() - parseInt(firstVisit, 10)) / (1000 * 60 * 60 * 24);
      const estDansLes3PremiersJours = joursDepuisPremierAcces <= 3;

      // Session courante déjà vue pour éviter le spam sur un même rechargement de page
      const vuDansCetteSession = sessionStorage.getItem(`educom_session_vue_${sectionCourante.cle}`);
      const spotlightActif = sessionStorage.getItem("educom_active_step_spotlight");

      // Si l'utilisateur est dans ses 3 premiers jours, on l'accompagne activement à chaque nouvelle session de navigation
      if (estDansLes3PremiersJours && !vuDansCetteSession && !spotlightActif) {
        const timer = setTimeout(() => setTourActif(true), 600);
        return () => clearTimeout(timer);
      } else if (!estDansLes3PremiersJours) {
        const dejaVuDefinitif = localStorage.getItem(`educom_formation_page_${sectionCourante.cle}`);
        if (!dejaVuDefinitif && !spotlightActif) {
          const timer = setTimeout(() => setTourActif(true), 600);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // localStorage / sessionStorage indisponibles
    }
  }, [sectionCourante]);

  // Écouter les relances manuelles de formation depuis le Guide sidebar
  useEffect(() => {
    const handleRelance = (e: Event) => {
      const customEvent = e as CustomEvent<{ sectionCle?: string }>;
      if (!customEvent.detail?.sectionCle || customEvent.detail.sectionCle === sectionCourante.cle) {
        setEtapeIndex(0);
        setTourActif(true);
      }
    };
    window.addEventListener("educom:relancer_formation_page", handleRelance);
    return () => window.removeEventListener("educom:relancer_formation_page", handleRelance);
  }, [sectionCourante]);

  const etapes = sectionCourante.etapes || [];
  const etapeCourante: EtapeFormationPage | undefined = etapes[etapeIndex];

  // Calcul du positionnement ancré
  const calculerPosition = useCallback(
    (el: Element, placementPrefere: "top" | "bottom" | "left" | "right" = "bottom"): PositionBulle => {
      const rect = el.getBoundingClientRect();
      const largeurBulle = Math.min(340, window.innerWidth - 32);
      const hauteurEstimee = 160;

      let placement = placementPrefere;

      // Auto-inversion
      if (placement === "bottom" && rect.bottom + hauteurEstimee + 20 > window.innerHeight) {
        placement = "top";
      } else if (placement === "top" && rect.top - hauteurEstimee - 20 < 0) {
        placement = "bottom";
      }

      let top = 0;
      const left = Math.max(16, Math.min(window.innerWidth - largeurBulle - 16, rect.left + rect.width / 2 - largeurBulle / 2));
      const flecheOffset = Math.max(16, Math.min(largeurBulle - 16, rect.left + rect.width / 2 - left));

      if (placement === "bottom") {
        top = rect.bottom + 12;
      } else {
        top = Math.max(16, rect.top - hauteurEstimee - 12);
      }

      return { top, left, placement, flecheOffset };
    },
    []
  );

  const cloreTour = useCallback(() => {
    setTourActif(false);
    try {
      sessionStorage.setItem(`educom_session_vue_${sectionCourante.cle}`, "true");
      localStorage.setItem(`educom_formation_page_${sectionCourante.cle}`, "true");
    } catch {
      // Ignorer
    }
  }, [sectionCourante]);

  const etapeSuivante = useCallback(() => {
    if (etapeIndex < etapes.length - 1) {
      setEtapeIndex((prev) => prev + 1);
    } else {
      cloreTour();
    }
  }, [etapeIndex, etapes.length, cloreTour]);

  const etapePrecedente = useCallback(() => {
    if (etapeIndex > 0) {
      setEtapeIndex((prev) => prev - 1);
    }
  }, [etapeIndex]);

  // Clavier
  useEffect(() => {
    if (!tourActif) return;
    const handleKey = (e: KeyboardEvent) => {
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
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tourActif, cloreTour, etapeSuivante, etapePrecedente]);

  // Recherche de l'élément cible
  useEffect(() => {
    if (!tourActif || !etapeCourante) return;

    let actif = true;
    let timerId: NodeJS.Timeout;
    let tentatives = 0;

    const chercher = () => {
      if (!actif) return;
      const el = document.querySelector(etapeCourante.selecteur);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const r = el.getBoundingClientRect();
        setCibleRect(r);
        setPositionBulle(calculerPosition(el, etapeCourante.placementPrefere));
      } else {
        tentatives++;
        if (tentatives < 15) {
          timerId = setTimeout(chercher, 100);
        } else {
          if (etapeIndex < etapes.length - 1) {
            setEtapeIndex((prev) => prev + 1);
          } else {
            cloreTour();
          }
        }
      }
    };

    const initialTimer = setTimeout(chercher, 50);

    const handleResize = () => {
      if (!actif) return;
      const el = document.querySelector(etapeCourante.selecteur);
      if (el) {
        setCibleRect(el.getBoundingClientRect());
        setPositionBulle(calculerPosition(el, etapeCourante.placementPrefere));
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, { passive: true });

    return () => {
      actif = false;
      clearTimeout(timerId);
      clearTimeout(initialTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [tourActif, etapeCourante, etapeIndex, etapes.length, calculerPosition, cloreTour]);

  if (!tourActif || !etapeCourante || !cibleRect || !positionBulle) {
    return null;
  }

  const estDerniereEtape = etapeIndex === etapes.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Formation ${sectionCourante.titreModule}`}
      className="fixed inset-0 z-50 pointer-events-none select-none print:hidden"
    >
      {/* Halo de découpe / Spotlight sur l'action ciblée (allégé, doux et clair) */}
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
        onClick={cloreTour}
      />

      {/* Bulle d'explication façon Capture 2 */}
      <div
        ref={bulleRef}
        style={{
          top: `${positionBulle.top}px`,
          left: `${positionBulle.left}px`,
          width: `${Math.min(340, window.innerWidth - 32)}px`,
        }}
        className="pointer-events-auto absolute z-50 rounded-2xl border border-purple-200/90 bg-white/98 p-4 text-slate-900 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Flèche triangulaire vers l'élément */}
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

        {/* En-tête : Badge Formation + Compteur (sans bouton de fermeture) */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Formation · {sectionCourante.titreModule}
            </span>
            <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-800">
              {etapeIndex + 1}/{etapes.length}
            </span>
          </div>
          <span className="text-[9.5px] font-medium text-slate-400">
            Guide pas-à-pas
          </span>
        </div>

        {/* Titre */}
        <h4 className="text-sm font-bold text-slate-900 leading-snug">
          {etapeCourante.titre}
        </h4>

        {/* Description */}
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
          {etapeCourante.description}
        </p>

        {/* Action concrète */}
        {etapeCourante.actionConcrete && (
          <div className="mt-2 rounded-lg bg-purple-50/70 p-2 border border-purple-100 text-[11px] font-medium text-purple-950 leading-relaxed">
            {etapeCourante.actionConcrete}
          </div>
        )}

        {/* Barre de contrôles : Précédent et Suivant/Terminer forcé */}
        <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-100">
          {etapeIndex > 0 ? (
            <button
              type="button"
              onClick={() => setEtapeIndex((prev) => prev - 1)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              ← Précédent
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">
              Étape {etapeIndex + 1}
            </span>
          )}

          <button
            type="button"
            onClick={etapeSuivante}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
          >
            <span>{estDerniereEtape ? "Terminer la formation" : "Suivant"}</span>
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

export default function TourPageContextuelle() {
  const pathname = usePathname();
  const sectionCourante = useMemo(() => resolveSection(pathname), [pathname]);

  if (!sectionCourante) return null;

  return <TourPageContenu key={sectionCourante.cle} sectionCourante={sectionCourante} />;
}
