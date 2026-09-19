"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleType } from "@/lib/permissions";
import { visibleSections, getActiveNavItemHref, type NavItem } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = getNavIcon(item.icon);
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

export function SidebarNav({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const sections = visibleSections(userRole as RoleType);
  const allItems = sections.flatMap((s) => s.items);
  const activeHref = getActiveNavItemHref(allItems, pathname);

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-3.5">
      {sections.map((section, i) => (
        <div key={section.title ?? `top-${i}`} className="flex flex-col gap-0.5">
          {section.title && (
            <h2 className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              {section.title}
            </h2>
          )}
          {section.items.map((item) => (
            <NavLink key={item.href} item={item} active={item.href === activeHref} />
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * En-tête d'identité de l'établissement.
 */
export function SchoolIdentity({
  schoolName,
  schoolLogo,
}: {
  schoolName: string;
  schoolLogo?: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5 px-0.5">
      {schoolLogo ? (
        <img
          src={schoolLogo}
          alt=""
          aria-hidden="true"
          className="h-7 w-auto max-w-[70px] shrink-0 rounded-sm object-contain"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-control bg-primary text-xs font-bold text-white"
        >
          {schoolName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 text-xs font-semibold leading-tight text-text" title={schoolName}>
          {schoolName}
        </p>
        <p className="text-[10px] text-text-faint leading-none mt-0.5">EduCom</p>
      </div>
    </div>
  );
}

/**
 * Sidebar desktop — 224 px, persistante & compacte.
 */
export default function Sidebar({
  schoolName = "EduCom",
  schoolLogo,
  userRole = "PARENT",
}: {
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
}) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-rule bg-surface lg:flex lg:flex-col print:hidden">
      <div className="flex h-13 shrink-0 items-center border-b border-rule px-3.5">
        <SchoolIdentity schoolName={schoolName} schoolLogo={schoolLogo} />
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <SidebarNav userRole={userRole} />
      </div>
    </aside>
  );
}
