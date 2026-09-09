"use client";

import Link from "next/link";
import { useState } from "react";
import { type NavSpace, type NavItem } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";
import SidebarResizeHandle from "./SidebarResizeHandle";

export interface ContextualSidebarProps {
  space: NavSpace;
  schoolName?: string;
  initialWidth?: number;
  currentPath?: string;
}

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
          "group relative flex h-9 w-9 items-center justify-center rounded-control transition-colors mx-auto",
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
        "group flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900",
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={active ? 2.2 : 1.8}
        className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-slate-500 group-hover:text-slate-800"}`}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export default function ContextualSidebar({
  space,
  schoolName = "EduCom",
  initialWidth = 220,
  currentPath,
}: ContextualSidebarProps) {
  const [currentWidth, setCurrentWidth] = useState(initialWidth);
  const collapsed = currentWidth <= 52;

  return (
    <aside
      aria-label={`Navigation ${space.label}`}
      style={{ width: `${currentWidth}px` }}
      className="relative hidden shrink-0 flex-col border-r border-slate-200/90 bg-[#F4F6F8] transition-[width] duration-75 ease-out md:flex print:hidden select-none z-20"
    >
      {/* 1. En-tête : Nom de l'établissement & Espace actif (Aligné sur la TopBar à 48px / h-12) */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-rule px-3">
        {!collapsed ? (
          <div className="flex flex-col min-w-0 pr-1">
            <h2
              title={schoolName}
              className="line-clamp-2 text-xs font-bold text-slate-800 leading-tight tracking-tight"
            >
              {schoolName}
            </h2>
            <span className="mt-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {space.fullLabel ?? space.label}
            </span>
          </div>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-control bg-slate-200/80 text-[11px] font-bold text-slate-700">
            {schoolName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 2. Liste des sections et sous-destinations */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {space.sections.map((section, idx) => (
          <div key={section.title ?? `sec-${idx}`} className="space-y-1">
            {!collapsed && section.title && (
              <h3 className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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

      {/* 3. Poignée de redimensionnement Slack-style (accessible souris & clavier) */}
      <SidebarResizeHandle
        initialWidth={initialWidth}
        onWidthChange={setCurrentWidth}
      />
    </aside>
  );
}
