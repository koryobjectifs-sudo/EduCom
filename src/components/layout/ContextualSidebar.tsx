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
  userRole?: string;
  userName?: string;
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
  initialWidth = 200,
  currentPath,
}: ContextualSidebarProps) {
  const [currentWidth, setCurrentWidth] = useState(initialWidth);
  const collapsed = currentWidth <= 52;

  return (
    <aside
      aria-label={`Navigation ${space.label}`}
      style={{ width: `${currentWidth}px` }}
      className="relative hidden shrink-0 flex-col border-r border-slate-200/90 bg-[#F4F6F8] transition-[width] duration-75 ease-out md:flex print:hidden select-none z-20 h-[calc(100vh-42px)]"
    >
      {/* Liste des sections et sous-destinations */}
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

      {/* Poignée de redimensionnement Slack-style (accessible souris & clavier) */}
      <SidebarResizeHandle
        initialWidth={initialWidth}
        onWidthChange={setCurrentWidth}
      />
    </aside>
  );
}
