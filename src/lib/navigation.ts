import { hasAccess, type RoleType } from "@/lib/permissions";

export type NavIconName =
  | "LayoutDashboard"
  | "Users"
  | "FolderKanban"
  | "GraduationCap"
  | "CreditCard"
  | "Settings"
  | "BarChart3"
  | "ClipboardList"
  | "FileText"
  | "MessageSquare"
  | "BookOpen"
  | "UserCheck"
  | "AlertTriangle"
  | "Layers";

export type NavItem = {
  id: string;
  name: string;
  href: string;
  icon: NavIconName;
  short?: string;
};

export type NavSection = {
  title: string | null;
  items: NavItem[];
};

export type NavSpaceKey = "students" | "documents" | "pedagogy" | "finance" | "admin";

export type NavSpace = {
  id: NavSpaceKey;
  label: string;
  fullLabel?: string;
  icon: NavIconName;
  defaultHref: string;
  matchPrefixes: string[];
  sections: NavSection[];
};

/**
 * Définition exhaustive des 5 Espaces Métier d'EduCom.
 *
 * ⚠️ CHAQUE SOUS-DESTINATION EST UNE ROUTE RÉELLE ET EXISTANTE.
 * Aucun lien mort ni sous-fonctionnalité inventée.
 */
export const NAV_SPACES: NavSpace[] = [
  {
    id: "students",
    label: "Scolarité",
    icon: "Users",
    defaultHref: "/dashboard/students",
    matchPrefixes: [
      "/dashboard/students",
      "/dashboard/directory",
      "/dashboard/classes",
    ],
    sections: [
      {
        title: "Élèves & Dossiers",
        items: [
          { id: "all-students", name: "Registre des élèves", href: "/dashboard/students", icon: "Users", short: "Élèves" },
          { id: "by-classes", name: "Par classe", href: "/dashboard/students?view=classes", icon: "FolderKanban", short: "Classes" },
          { id: "review", name: "Examen des admissions", href: "/dashboard/students/dossiers/review", icon: "UserCheck", short: "Admissions" },
        ],
      },
      {
        title: "Structure & Classes",
        items: [
          { id: "classes", name: "Classes & niveaux", href: "/dashboard/classes", icon: "Layers", short: "Classes" },
        ],
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    fullLabel: "Documents & Communication",
    icon: "FileText",
    defaultHref: "/dashboard/documents",
    matchPrefixes: [
      "/dashboard/documents",
      "/dashboard/communications",
    ],
    sections: [
      {
        title: "Gestion Documentaire",
        items: [
          { id: "documents", name: "Centre documentaire", href: "/dashboard/documents", icon: "FileText", short: "Documents" },
        ],
      },
      {
        title: "Échanges & Messages",
        items: [
          { id: "comms", name: "Communications", href: "/dashboard/communications", icon: "MessageSquare", short: "Messages" },
        ],
      },
    ],
  },
  {
    id: "pedagogy",
    label: "Pédagogie",
    icon: "GraduationCap",
    defaultHref: "/dashboard/grades",
    matchPrefixes: [
      "/dashboard/grades",
      "/dashboard/attendance",
    ],
    sections: [
      {
        title: "Enseignement",
        items: [
          { id: "grades", name: "Notes & bulletins", href: "/dashboard/grades", icon: "GraduationCap", short: "Notes" },
          { id: "attendance", name: "Présences & appel", href: "/dashboard/attendance", icon: "ClipboardList", short: "Présences" },
        ],
      },
      {
        title: "Suivi des acquis",
        items: [
          { id: "difficulties", name: "Élèves en difficulté", href: "/dashboard/grades/difficultes", icon: "AlertTriangle", short: "Difficultés" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "CreditCard",
    defaultHref: "/dashboard/payments",
    matchPrefixes: [
      "/dashboard/payments",
    ],
    sections: [
      {
        title: "Gestion Financière",
        items: [
          { id: "payments", name: "Facturation & paiements", href: "/dashboard/payments", icon: "CreditCard", short: "Paiements" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: "Settings",
    defaultHref: "/dashboard/admin",
    matchPrefixes: [
      "/dashboard/admin",
      "/dashboard/team",
      "/dashboard/settings",
    ],
    sections: [
      {
        title: "Établissement",
        items: [
          { id: "admin-home", name: "Vue d'ensemble admin", href: "/dashboard/admin", icon: "Settings", short: "Admin" },
          { id: "team", name: "Équipe & membres", href: "/dashboard/team", icon: "Users", short: "Équipe" },
          { id: "reports", name: "Rapports d'activité", href: "/dashboard/admin/reports", icon: "BarChart3", short: "Rapports" },
          { id: "settings", name: "Paramètres généraux", href: "/dashboard/settings", icon: "Settings", short: "Paramètres" },
          { id: "pedagogy-settings", name: "Config pédagogique", href: "/dashboard/settings/pedagogie", icon: "BookOpen", short: "Config Pédag." },
          { id: "doc-settings", name: "Pièces exigées", href: "/dashboard/settings/documents", icon: "FileText", short: "Pièces" },
        ],
      },
    ],
  },
];

/**
 * Renvoie la liste des Espaces Métier autorisés pour ce rôle,
 * avec leurs sous-sections filtrées par `hasAccess()`.
 */
export function getVisibleSpaces(role: RoleType | string): NavSpace[] {
  return NAV_SPACES.map((space) => {
    const authorizedSections = space.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => hasAccess(role, item.href)),
      }))
      .filter((sec) => sec.items.length > 0);

    const firstAllowedHref = authorizedSections[0]?.items[0]?.href ?? space.defaultHref;

    return {
      ...space,
      defaultHref: firstAllowedHref,
      sections: authorizedSections,
    };
  }).filter((space) => space.sections.length > 0);
}

/**
 * Détecte l'espace actif à partir de l'URL actuelle.
 * Retourne `null` quand on est sur `/dashboard` (aucun espace actif).
 */
export function getActiveSpaceId(pathname: string | null, spaces: NavSpace[]): NavSpaceKey | null {
  if (!pathname || spaces.length === 0) return null;

  // Sur l'accueil général (/dashboard), aucun espace métier n'est actif
  if (pathname === "/dashboard") {
    return null;
  }

  // 1. Chercher d'abord une correspondance avec une sous-destination dans les sections de chaque espace
  for (const space of spaces) {
    for (const section of space.sections) {
      for (const item of section.items) {
        if (isActive(item.href, pathname)) {
          return space.id;
        }
      }
    }
  }

  // 2. Chercher par préfixe de l'espace
  for (const space of spaces) {
    for (const prefix of space.matchPrefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return space.id;
      }
    }
  }

  return null;
}

/**
 * Vrai si l'entrée correspond au chemin courant.
 */
export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  const hrefPath = href.split("?")[0];
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

/**
 * Toutes les entrées autorisées, à plat — pour le tiroir mobile unifié.
 */
export function visibleItems(role: RoleType | string): NavItem[] {
  return getVisibleSpaces(role).flatMap((space) =>
    space.sections.flatMap((sec) => sec.items)
  );
}

// Rétrocompatibilité avec l'ancienne signature
export function visibleSections(role: RoleType | string): NavSection[] {
  return getVisibleSpaces(role).flatMap((s) => s.sections);
}
