"use client";

import { LogOut, Globe, ChevronDown, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { changeTestRole } from "@/app/dashboard/actions";
import MobileNav from "./MobileNav";
import { type NavSpace } from "@/lib/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import GlobalSearch from "./GlobalSearch";

const ALL_TEST_ROLES = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

export interface AppTopBarProps {
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
  activeSpace?: NavSpace;
}

export default function AppTopBar({
  schoolName,
  schoolLogo,
  userRole = "OWNER",
  userName,
  activeSpace,
}: AppTopBarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [density, setDensity] = useState<string>("normal");
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read initial density from document or cookie
    const current = document.documentElement.getAttribute("data-density") || "normal";
    setDensity(current);
  }, []);

  const handleSetDensity = (newDensity: string) => {
    setDensity(newDensity);
    document.documentElement.setAttribute("data-density", newDensity);
    document.cookie = `educom_density=${newDensity}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayName = userName?.trim() || "Mon compte";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  const roleLabel = userRole.charAt(0) + userRole.slice(1).toLowerCase();

  return (
    <header
      style={{ backgroundColor: "var(--color-topbar-bg, #0E2541)" }}
      className="sticky top-0 z-30 flex h-10.5 shrink-0 items-center text-white print:hidden select-none transition-colors duration-200"
    >
      <div className="flex w-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Gauche : Nom d'école + Flèches historique + Fil d'Ariane */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 shrink-0">
          <MobileNav schoolName={schoolName} schoolLogo={schoolLogo} userRole={userRole} />

          {/* Nom de l'établissement au-dessus de la sidebar */}
          <span
            data-tronque-volontaire
            title={schoolName ?? "EduCom"}
            className="font-bold text-xs sm:text-sm text-white truncate max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]"
          >
            {schoolName ?? "EduCom"}
          </span>

          {/* Flèches Précédent / Suivant (Historique Navigateur) */}
          <div className="hidden sm:flex items-center gap-0.5 text-white/70">
            <button
              type="button"
              onClick={() => window.history.back()}
              title="Page précédente"
              aria-label="Page précédente"
              className="flex h-6 w-6 items-center justify-center rounded-control hover:bg-white/10 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.history.forward()}
              title="Page suivante"
              aria-label="Page suivante"
              className="flex h-6 w-6 items-center justify-center rounded-control hover:bg-white/10 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Fil d'Ariane compact */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-white/40">/</span>
            <span className="font-semibold text-white/90 truncate max-w-[140px] lg:max-w-[180px]">
              {activeSpace ? (activeSpace.fullLabel ?? activeSpace.label) : "Tableau de bord"}
            </span>
          </div>
        </div>

        {/* Centre : Recherche Globale Slack-style (Cmd+K) */}
        <GlobalSearch />

        {/* Droite : Avatar Profil Seul */}
        <div className="flex shrink-0 items-center">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label={`Compte de ${displayName}`}
              title={displayName}
              className="flex h-7.5 items-center gap-1.5 rounded-control p-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <div
                aria-hidden="true"
                className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white shadow-2xs border border-white/20"
              >
                {initials || "U"}
              </div>
              <ChevronDown
                aria-hidden="true"
                className={`h-3 w-3 text-white/60 transition-transform hidden sm:inline ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay animate-in fade-in zoom-in-95"
              >
                <div className="border-b border-rule px-3 py-2">
                  <p className="truncate text-xs font-semibold text-text">{displayName}</p>
                  <p className="text-[10px] text-text-faint">{roleLabel}</p>
                </div>

                {/* Liens utiles */}
                <div className="border-b border-rule px-1 py-1">
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ouvrir le site public"
                    className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-text-soft hover:bg-sunk hover:text-text transition-colors"
                  >
                    <Globe aria-hidden="true" className="h-3.5 w-3.5 text-text-faint" />
                    <span>Site public</span>
                  </Link>
                </div>

                {/* Densité */}
                <div className="border-b border-rule px-2 py-1.5">
                  <p className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                    Affichage
                  </p>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {[
                      { id: "compact", label: "Compact" },
                      { id: "normal", label: "Normal" },
                      { id: "comfort", label: "Confort" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSetDensity(d.id)}
                        className={`rounded-control py-1 text-center text-[10.5px] transition-colors ${
                          density === d.id
                            ? "bg-primary/10 font-bold text-primary border border-primary/20"
                            : "hover:bg-sunk text-text-soft"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Déconnexion */}
                <div className="p-1">
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10"
                    >
                      <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>Se déconnecter</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
