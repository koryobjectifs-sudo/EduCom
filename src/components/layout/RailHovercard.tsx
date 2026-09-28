"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export interface QuickLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface RailHovercardProps {
  id: string;
  title: string;
  description: string;
  quickLinks?: QuickLink[];
  isAdminTools?: boolean;
  currentPlan?: string;
  onOpenGuide?: () => void;
  children: React.ReactNode;
}

export default function RailHovercard({
  id,
  title,
  description,
  quickLinks = [],
  isAdminTools = false,
  currentPlan = "Établissement Pro",
  onOpenGuide,
  children,
}: RailHovercardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    openTimerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const isTop = id === "accueil";
  const isBottom = id === "admin";

  const positionClasses = isTop
    ? "top-0 ml-2.5"
    : isBottom
    ? "bottom-0 ml-2.5"
    : "top-1/2 -translate-y-1/2 ml-2.5";

  const arrowClasses = isTop
    ? "top-5 -translate-y-1/2"
    : isBottom
    ? "bottom-5 translate-y-1/2"
    : "top-1/2 -translate-y-1/2";

  return (
    <div
      className="relative w-full flex justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Clic sur la tuile ferme immédiatement tout hovercard */}
      <div className="w-full flex justify-center" onClick={() => setIsOpen(false)}>
        {children}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          onClickCapture={() => setIsOpen(false)}
          className={`absolute left-full ${positionClasses} z-50 w-72 select-auto animate-in fade-in zoom-in-95 duration-150`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Pont invisible pour éviter toute perte de hover */}
          <div className="absolute -left-3 top-0 bottom-0 w-3 bg-transparent" />

          {/* Carte sombre Slack-style OPAQUE 100% (Contraste certifié AA) */}
          <div
            style={{ backgroundColor: "#1A1D21", opacity: 1 }}
            className="relative rounded-2xl border border-white/20 p-3.5 shadow-2xl text-left text-white bg-[#1A1D21]"
          >
            {/* Flèche d'ancrage */}
            <div
              style={{ borderRightColor: "#1A1D21" }}
              className={`absolute left-[-6px] ${arrowClasses} w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-[#1A1D21]`}
              aria-hidden="true"
            />

            {/* En-tête : Titre & Guidance */}
            <div className="pb-2.5 border-b border-white/15">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="text-[13px] font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>{title}</span>
                </h4>
                <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/20">
                  Accès direct
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-200 leading-relaxed font-normal">
                {description}
              </p>
            </div>

            {/* Si Admin Tools : Bloc Abonnement / Facturation façon Slack (Capture 3) */}
            {isAdminTools && (
              <div className="my-2 p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-300">Formule active</p>
                  <p className="text-xs font-bold text-white truncate">{currentPlan}</p>
                </div>
                <Link
                  href="/dashboard/abonnement"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline transition-colors"
                >
                  Gérer l&apos;abonnement
                </Link>
              </div>
            )}

            {/* Liste des raccourcis rapides */}
            {quickLinks.length > 0 && (
              <div className="pt-2 space-y-1">
                {quickLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/15 transition-all"
                  >
                    <span className="flex items-center gap-2 truncate">
                      {link.icon && (
                        <span className="text-slate-200 group-hover:text-white transition-colors">
                          {link.icon}
                        </span>
                      )}
                      <span className="truncate text-white font-medium group-hover:font-semibold">
                        {link.label}
                      </span>
                    </span>
                    {link.badge ? (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-semibold border border-purple-400/40">
                        {link.badge}
                      </span>
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Action spéciale Guide si disponible */}
            {onOpenGuide && (
              <div className="mt-2.5 pt-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenGuide();
                  }}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 text-white text-xs font-bold transition-colors cursor-pointer border border-purple-400/30"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                    <span>Lancer le guide & checklist</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-purple-200" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
