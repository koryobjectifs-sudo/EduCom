"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Globe, Shield, ChevronDown, ChevronUp, LogOut, Sliders } from "lucide-react";
import { type NavSpace, type NavItem } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";
import SidebarResizeHandle from "./SidebarResizeHandle";
import { changeTestRole } from "@/app/dashboard/actions";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export interface ContextualSidebarProps {
  space: NavSpace;
  schoolName?: string;
  initialWidth?: number;
  currentPath?: string;
  userRole?: string;
  userName?: string;
}

const ALL_TEST_ROLES = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = getNavIcon(item.icon);

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.name}
        aria-label={item.name}
        aria-current={active ? "page" : undefined}
        className={[
          "group relative flex h-8.5 w-8.5 items-center justify-center rounded-control transition-colors mx-auto",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900",
        ].join(" ")}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={active ? 2.2 : 1.8}
          className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-slate-500 group-hover:text-slate-800"}`}
        />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900",
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={active ? 2.2 : 1.8}
        className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-slate-500 group-hover:text-slate-800"}`}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export default function ContextualSidebar({
  space,
  schoolName = "EduCom",
  initialWidth = 200,
  currentPath,
  userRole = "OWNER",
  userName,
}: ContextualSidebarProps) {
  const [currentWidth, setCurrentWidth] = useState(initialWidth);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [density, setDensity] = useState<string>("normal");
  const roleRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const collapsed = currentWidth <= 52;

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
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
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
      aria-label={`Navigation ${space.label}`}
      style={{ width: `${currentWidth}px` }}
      className="relative hidden shrink-0 flex-col border-r border-slate-200/90 bg-[#F4F6F8] transition-[width] duration-75 ease-out md:flex print:hidden select-none z-20 h-[calc(100vh-42px)]"
    >
      {/* 1. Liste des sections et sous-destinations (Directement en haut, pas de barre séparée) */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2.5 space-y-3">
        {space.sections.map((section, idx) => (
          <div key={section.title ?? `sec-${idx}`} className="space-y-0.5">
            {!collapsed && section.title && (
              <h3 className="px-2 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = currentPath ? (
                  item.href === "/dashboard"
                    ? currentPath === "/dashboard"
                    : currentPath === item.href || currentPath.startsWith(`${item.href}/`)
                ) : false;

                return (
                  <NavLink
                    key={item.id}
                    item={item}
                    active={active}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Pied de Sidebar Contextuelle (Séparé par un filet discret) */}
      <div className="border-t border-slate-200/90 p-1.5 space-y-1 bg-[#EEF2F6]">
        {/* Site Public */}
        {!collapsed ? (
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir le site public"
            className="flex items-center gap-2 rounded-control px-2 py-1 text-[11.5px] font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Site public</span>
          </Link>
        ) : (
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Site public"
            aria-label="Site public"
            className="flex h-8 w-8 items-center justify-center rounded-control text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 mx-auto transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
          </Link>
        )}

        {/* Sélecteur de rôle de test (Strictement restreint au développement) */}
        {process.env.NODE_ENV !== "production" && (
          <div className="relative" ref={roleRef}>
            {!collapsed ? (
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-expanded={roleMenuOpen}
                className="w-full flex items-center justify-between gap-1.5 rounded-control px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 hover:bg-amber-100/70 transition-colors"
                title="Changer de rôle (développement uniquement)"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Shield className="h-3 w-3 shrink-0" />
                  <span className="truncate">Rôle : {roleLabel}</span>
                </div>
                <ChevronUp className={`h-2.5 w-2.5 shrink-0 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-expanded={roleMenuOpen}
                title={`Rôle test : ${roleLabel}`}
                className="flex h-8 w-8 items-center justify-center rounded-control text-amber-700 bg-amber-50 border border-amber-200/60 hover:bg-amber-100 mx-auto transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
              </button>
            )}

            {roleMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-full left-0 mb-1 w-44 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay z-50 animate-in fade-in zoom-in-95"
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

        {/* Profil utilisateur & Déconnexion en bas de la sidebar */}
        <div className="pt-0.5 border-t border-slate-200/60">
          {!collapsed ? (
            <div className="flex items-center justify-between p-1 rounded-control bg-white/70 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {initials || "U"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 leading-tight">{displayName}</p>
                  <p className="truncate text-[10px] text-slate-500 leading-tight">{roleLabel}</p>
                </div>
              </div>

              <form action="/auth/signout" method="post" className="shrink-0">
                <button
                  type="submit"
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                  className="flex h-6 w-6 items-center justify-center rounded-control text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Se déconnecter"
                aria-label="Se déconnecter"
                className="flex h-8 w-8 items-center justify-center rounded-control text-slate-400 hover:text-danger hover:bg-danger/10 mx-auto transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 3. Poignée de redimensionnement Slack-style (accessible souris & clavier) */}
      <SidebarResizeHandle
        initialWidth={initialWidth}
        onWidthChange={setCurrentWidth}
      />
    </aside>
  );
}
