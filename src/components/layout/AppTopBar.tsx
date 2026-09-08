"use client";

import { LogOut, Globe, ChevronDown, Shield } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { changeTestRole } from "@/app/dashboard/actions";
import MobileNav from "./MobileNav";
import { type NavSpace } from "@/lib/navigation";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center border-b border-rule bg-surface print:hidden select-none">
      <div className="flex w-full items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
        {/* Gauche : Tiroir mobile + Fil d'Ariane contextuel */}
        <div className="flex min-w-0 items-center gap-2.5">
          <MobileNav schoolName={schoolName} schoolLogo={schoolLogo} userRole={userRole} />

          <span
            data-tronque-volontaire
            title={schoolName ?? "EduCom"}
            className="truncate text-xs font-semibold text-text lg:hidden"
          >
            {schoolName ?? "EduCom"}
          </span>

          <div className="hidden lg:flex items-center gap-2 text-xs">
            {activeSpace && (
              <span className="font-semibold text-text">
                {activeSpace.label}
              </span>
            )}
            <span className="text-text-faint">·</span>
            <span className="text-role-meta capitalize text-text-soft">
              {today}
            </span>
          </div>
        </div>

        {/* Droite : Rôle Dev + Site public + Menu Profil */}
        <div className="flex shrink-0 items-center gap-1.5">
          {process.env.NODE_ENV !== "production" && (
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-expanded={roleMenuOpen}
                aria-haspopup="menu"
                title="Changer de rôle (développement)"
                className="inline-flex h-7.5 items-center gap-1.5 rounded-control border border-warning/30 bg-warning/10 px-2 text-role-meta font-medium text-warning transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Shield aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{roleLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-3 w-3 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {roleMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay"
                >
                  <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
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
                      className={`flex w-full items-center justify-between rounded-control px-2.5 py-1.5 text-xs transition-colors hover:bg-sunk ${
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

          <Link
            href="/public"
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir le site public de l'établissement"
            className="hidden sm:inline-flex h-7.5 items-center gap-1.5 rounded-control border border-rule px-2 text-role-meta font-medium text-text-soft transition-colors hover:bg-sunk hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Globe aria-hidden="true" className="h-3.5 w-3.5 text-text-faint" />
            <span>Site public</span>
          </Link>

          {/* Menu Profil / Déconnexion */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label={`Menu de ${displayName}`}
              className="flex h-7.5 items-center gap-2 rounded-control p-1 transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
              >
                {initials || "U"}
              </div>
              <span className="hidden text-xs font-medium text-text sm:inline">
                {displayName}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`hidden h-3 w-3 text-text-faint transition-transform sm:inline ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay"
              >
                <div className="border-b border-rule px-3 py-2">
                  <p className="truncate text-xs font-semibold text-text">{displayName}</p>
                  <p className="text-[10px] text-text-faint">{roleLabel}</p>
                </div>
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
