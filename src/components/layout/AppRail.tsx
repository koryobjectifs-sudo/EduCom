"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Globe, Shield, LogOut, ChevronUp } from "lucide-react";
import { type NavSpace } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";
import { changeTestRole } from "@/app/dashboard/actions";

export interface AppRailProps {
  spaces: NavSpace[];
  schoolName: string;
  schoolLogo?: string | null;
  activeSpaceId?: string | null;
  userRole?: string;
  userName?: string;
}

const ALL_TEST_ROLES = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

export default function AppRail({
  spaces,
  schoolName,
  schoolLogo,
  activeSpaceId,
  userRole = "OWNER",
  userName,
}: AppRailProps) {
  const initial = schoolName?.trim() ? schoolName.trim().charAt(0).toUpperCase() : "E";
  const isDashboardActive = !activeSpaceId;

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [density, setDensity] = useState<string>("normal");

  const roleRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-density") || "normal";
    setDensity(current);
  }, []);

  const handleSetDensity = (newDensity: string) => {
    setDensity(newDensity);
    document.documentElement.setAttribute("data-density", newDensity);
    document.cookie = `educom_density=${newDensity}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = userName?.trim() || "Mon compte";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  const roleLabel = userRole.charAt(0) + userRole.slice(1).toLowerCase();

  return (
    <aside
      aria-label="Espaces de travail"
      className="hidden w-[54px] shrink-0 flex-col items-center justify-between border-inline-end border-[#1E3A5F] bg-[#0E2541] py-2 text-white md:flex print:hidden select-none z-30"
    >
      {/* Haut : Identité & Logo Établissement + Navigation */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Logo Établissement (Identité visuelle neutre) */}
        <div
          title={schoolName}
          aria-label={schoolName}
          className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-control bg-white p-0.5 shadow-2xs select-none"
        >
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center rounded bg-[#0E2541] text-[10px] font-bold text-white"
            >
              {initial}
            </div>
          )}
        </div>

        {/* Séparateur discret */}
        <div className="h-[1px] w-6 bg-white/10" aria-hidden="true" />

        {/* Navigation : Tableau de bord en première position + Espaces métier */}
        <nav aria-label="Espaces de travail" className="flex flex-col items-center gap-0.5 w-full px-0.5">
          {/* 1. Tuile permanente Tableau de bord */}
          <Link
            href="/dashboard"
            aria-current={isDashboardActive ? "page" : undefined}
            title="Tableau de bord"
            className={[
              "relative group flex w-full min-h-[40px] flex-col items-center justify-center rounded-control py-1 px-0.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              isDashboardActive
                ? "bg-[#1E4676] text-white shadow-sm"
                : "text-slate-400 hover:bg-[#18365D] hover:text-white",
            ].join(" ")}
          >
            {isDashboardActive && (
              <span
                aria-hidden="true"
                data-testid="rail-active-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[22px] w-[3px] rounded-r-full bg-[var(--color-rail-accent,#9C0F15)]"
              />
            )}

            <LayoutDashboard
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                isDashboardActive ? "text-white" : "text-slate-400 group-hover:text-white"
              }`}
              strokeWidth={isDashboardActive ? 2.2 : 1.8}
            />

            <span
              className={`mt-0.5 text-[10px] font-medium leading-none truncate max-w-[48px] text-center ${
                isDashboardActive ? "text-white font-bold" : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              Accueil
            </span>
          </Link>

          {/* Filet séparateur entre Tableau de bord et les espaces métier */}
          <div className="h-[1px] w-6 bg-white/10 my-0.5" aria-hidden="true" />

          {/* 2. Les 5 Espaces Métier */}
          {spaces.map((space) => {
            const Icon = getNavIcon(space.icon);
            const isActive = space.id === activeSpaceId;

            return (
              <Link
                key={space.id}
                href={space.defaultHref}
                aria-current={isActive ? "page" : undefined}
                title={space.fullLabel ?? space.label}
                className={[
                  "relative group flex w-full min-h-[40px] flex-col items-center justify-center rounded-control py-1 px-0.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  isActive
                    ? "bg-[#1E4676] text-white shadow-sm"
                    : "text-slate-400 hover:bg-[#18365D] hover:text-white",
                ].join(" ")}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    data-testid="rail-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[22px] w-[3px] rounded-r-full bg-[var(--color-rail-accent,#9C0F15)]"
                  />
                )}

                <Icon
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                <span
                  className={`mt-0.5 text-[10px] font-medium leading-none truncate max-w-[48px] text-center ${
                    isActive ? "text-white font-bold" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {space.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bas du rail : Site Public, Rôle test (dev) & Profil utilisateur */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1 pt-2 border-t border-white/10">
        {/* Site Public */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="Site public"
          aria-label="Site public"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-control text-slate-400 hover:bg-[#18365D] hover:text-white transition-colors"
        >
          <Globe className="h-4 w-4" />
        </Link>

        {/* Sélecteur de rôle test (développement uniquement) */}
        {process.env.NODE_ENV !== "production" && (
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              aria-expanded={roleMenuOpen}
              title={`Rôle test : ${roleLabel}`}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-control text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
            </button>

            {roleMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-0 left-full ml-2 w-48 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay z-50 text-slate-800 animate-in fade-in zoom-in-95"
              >
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Tester en tant que
                </p>
                {ALL_TEST_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setRoleMenuOpen(false);
                      await changeTestRole(r);
                      window.location.reload();
                    }}
                    className={`flex w-full items-center justify-between rounded-control px-2 py-1 text-xs transition-colors hover:bg-sunk ${
                      userRole === r ? "font-semibold text-primary" : "text-text"
                    }`}
                  >
                    <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                    {userRole === r && <span className="text-[10px] text-primary">Actif</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avatar Profil utilisateur & Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-expanded={profileMenuOpen}
            title={displayName}
            aria-label={displayName}
            className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] transition-colors border border-white/20"
          >
            {initials || "U"}
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-0 left-full ml-2 w-56 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay z-50 text-slate-800 animate-in fade-in zoom-in-95"
            >
              <div className="border-b border-rule px-3 py-2">
                <p className="truncate text-xs font-semibold text-text">{displayName}</p>
                <p className="text-[10px] text-text-faint">{roleLabel}</p>
              </div>

              {/* Densité d'affichage */}
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
    </aside>
  );
}
