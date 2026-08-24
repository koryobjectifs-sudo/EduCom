"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleType } from "@/lib/permissions";
import { visibleSections, isActive, type NavItem } from "@/lib/navigation";

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
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex items-center gap-3 rounded-control px-3 py-2 text-role-body transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary/8 font-semibold text-primary"
          : "font-medium text-text-soft hover:bg-sunk hover:text-text",
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={active ? 2.2 : 1.8}
        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : "text-text-faint group-hover:text-text-soft"}`}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function SidebarNav({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const sections = visibleSections(userRole as RoleType);

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-5">
      {sections.map((section, i) => (
        <div key={section.title ?? `top-${i}`} className="flex flex-col gap-0.5">
          {section.title && (
            <h2 className="px-3 pb-1.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
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
 *
 * Le nom de l'école est l'ancrage de contexte : l'utilisateur doit savoir en
 * permanence dans quel établissement il travaille. Il était auparavant caché
 * dans une infobulle au survol du logo.
 */
export function SchoolIdentity({
  schoolName,
  schoolLogo,
}: {
  schoolName: string;
  schoolLogo?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-1">
      {schoolLogo ? (
        <img
          src={schoolLogo}
          alt=""
          aria-hidden="true"
          className="h-9 w-auto max-w-[80px] shrink-0 rounded-sm object-contain"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-role-card font-semibold text-white"
        >
          {schoolName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        {/* ⚠️ Chantier PLG — c'était `truncate` : un nom d'école un peu long
            sortait « Institution Sainte-Marie de… », et l'infobulle `title` qui
            portait la valeur complète ne s'ouvre pas au doigt. Le nom de son
            propre établissement est la première chose qu'un directeur lit après
            l'installation : le voir amputé fait douter de ce qui a été
            enregistré. Il passe sur deux lignes — la hauteur reste bornée. */}
        <p className="line-clamp-2 text-role-card font-semibold leading-tight text-text" title={schoolName}>
          {schoolName}
        </p>
        <p className="text-role-meta text-text-faint">EduCom</p>
      </div>
    </div>
  );
}

/**
 * Sidebar desktop — 240 px, persistante.
 *
 * Masquée sous `lg`. La navigation mobile prend le relais dans un tiroir
 * (`MobileNav`) : elle ne disparaît pas, elle change de forme.
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
    <aside className="hidden w-60 shrink-0 border-r border-rule bg-surface lg:flex lg:flex-col print:hidden">
      <div className="flex h-16 shrink-0 items-center border-b border-rule px-4">
        <SchoolIdentity schoolName={schoolName} schoolLogo={schoolLogo} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav userRole={userRole} />
      </div>
    </aside>
  );
}
