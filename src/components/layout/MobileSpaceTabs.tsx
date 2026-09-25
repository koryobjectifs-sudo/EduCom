"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { type NavSpace, getActiveNavItemHref } from "@/lib/navigation";

/**
 * Pages de l'espace actif, en onglets défilants sous la barre du haut —
 * équivalent mobile de `ContextualSidebar` (masquée sous `md`). 24 sept. 2026.
 *
 * Un geste suffit pour passer de Notes à Bulletins ou Présences, sans ouvrir
 * de menu. L'onglet actif est ramené dans le champ au chargement.
 */
export default function MobileSpaceTabs({ space, pathnameOverride }: { space: NavSpace; pathnameOverride?: string }) {
  const realPathname = usePathname();
  const pathname = pathnameOverride ?? realPathname;
  const items = space.sections.flatMap((s) => s.items);
  const hrefActif = getActiveNavItemHref(items, pathname);
  const actifRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    actifRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [hrefActif]);

  if (items.length < 2) return null;

  return (
    <nav
      aria-label={`Pages · ${space.fullLabel ?? space.label}`}
      className="sticky top-0 z-10 shrink-0 border-b border-rule bg-surface/95 backdrop-blur-md md:hidden print:hidden"
    >
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const actif = item.href === hrefActif;
          return (
            <Link
              key={item.id}
              ref={actif ? actifRef : undefined}
              href={item.href}
              aria-current={actif ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                actif ? "bg-primary text-white" : "bg-sunk text-text-soft active:bg-rule"
              }`}
            >
              {item.short ?? item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
