"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type NavSpace, type NavItem, isActive } from "@/lib/navigation";

export interface ContextualSidebarProps {
  space: NavSpace;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.name}
        aria-label={item.name}
        aria-current={active ? "page" : undefined}
        className={[
          "group flex h-9 w-9 items-center justify-center rounded-control transition-colors mx-auto",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-text-soft hover:bg-sunk hover:text-text",
        ].join(" ")}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={active ? 2.2 : 1.8}
          className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-text-faint group-hover:text-text-soft"}`}
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
          ? "bg-primary/8 font-semibold text-primary"
          : "font-medium text-text-soft hover:bg-sunk hover:text-text",
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={active ? 2.2 : 1.8}
        className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-text-faint group-hover:text-text-soft"}`}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export default function ContextualSidebar({
  space,
  collapsed,
  onToggleCollapse,
}: ContextualSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label={`Navigation ${space.label}`}
      className={[
        "hidden shrink-0 flex-col border-inline-end border-rule bg-surface transition-[width] duration-200 ease-in-out lg:flex print:hidden select-none z-20",
        collapsed ? "w-[52px]" : "w-[208px]",
      ].join(" ")}
    >
      {/* En-tête de la sidebar contextuelle */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-rule px-2.5">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0 px-1">
            <span className="truncate text-xs font-bold text-text uppercase tracking-wider">
              {space.label}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Développer le menu (Ctrl+B)" : "Réduire le menu (Ctrl+B)"}
          aria-label={collapsed ? "Développer le menu latéral" : "Réduire le menu latéral"}
          className={`flex h-7 w-7 items-center justify-center rounded-control text-text-faint transition-colors hover:bg-sunk hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Liste des sections et sous-destinations */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {space.sections.map((section, idx) => (
          <div key={section.title ?? `sec-${idx}`} className="space-y-1">
            {!collapsed && section.title && (
              <h3 className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.id}
                  item={item}
                  active={isActive(item.href, pathname)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
