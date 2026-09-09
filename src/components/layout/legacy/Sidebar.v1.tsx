"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleType } from "@/lib/permissions";
import { visibleSections, isActive, type NavItem } from "@/lib/navigation";
import { getNavIcon } from "../nav-icons";

/**
 * Navigation persistante du tableau de bord.
 *
 * ═══ CE QUI CHANGE, ET POURQUOI ═══
 *
 * L'ancienne version était un rail de **56 px portant neuf icônes sans
 * libellés**, révélés au survol dans une infobulle en `pointer-events-none`.
 * Quatre défauts, tous corrigés ici :
 *
 * 1. **Pas de libellés.** Une secrétaire passe sa journée dans l'outil : chaque
 *    navigation lui demandait de reconnaître un pictogramme. Les libellés sont
 *    désormais permanents.
 * 2. **Deux rubriques partageaient l'icône `FileText`** — « Saisie des notes »
 *    et « Documents » étaient indiscernables. Icônes dédoublonnées.
 * 3. **Neuf couleurs, une par rubrique.** Aucune information encodée. La
 *    couleur est maintenant réservée à l'élément actif.
 * 4. **Infobulles inaccessibles au clavier et au lecteur d'écran** (0
 *    `aria-label` sur le rail). Le libellé visible règle le problème à la source.
 *
 * ═══ ÉTAT ACTIF : SOBRE MAIS SANS AMBIGUÏTÉ ═══
 *
 * Trois signaux simultanés, dont deux non colorés : un fond très pâle, un texte
 * et une icône en `primary`, et un `aria-current="page"`. Pas de barre, pas
 * d'ombre portée, pas de déplacement — l'élément actif se lit d'un coup d'œil
 * sans attirer l'œil plus que le contenu de la page.
 *
 * Le `primary` vient de `--color-primary`, surchargé par `School.primaryColor`
 * au niveau du layout (lot 02) : la navigation suit automatiquement la charte de
 * l'école, sans code de thème ici.
 */

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
            <NavLink key={item.href} item={item} active={isActive(item.href, pathname)} />
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
