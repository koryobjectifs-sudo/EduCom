import {
  LayoutDashboard,
  Users,
  FolderKanban,
  GraduationCap,
  CreditCard,
  Settings,
  BarChart3,
  ClipboardList,
  FileText,
  MessageSquare,
  BookOpen,
  UserCheck,
  AlertTriangle,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { hasAccess, type RoleType } from "@/lib/permissions";

export type NavItem = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  short?: string;
};

export type NavSection = {
  title: string | null;
  items: NavItem[];
};

export type NavSpaceKey = "home" | "students" | "pedagogy" | "finance" | "admin";

export type NavSpace = {
  id: NavSpaceKey;
  label: string;
  icon: LucideIcon;
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
    id: "home",
    label: "Accueil",
    icon: LayoutDashboard,
    defaultHref: "/dashboard",
    matchPrefixes: ["/dashboard$"],
    sections: [
      {
        title: "Pilotage",
        items: [
          { id: "overview", name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, short: "Accueil" },
        ],
      },
    ],
  },
  {
    id: "students",
    label: "Scolarité",
    icon: Users,
    defaultHref: "/dashboard/students",
    matchPrefixes: [
      "/dashboard/students",
      "/dashboard/directory",
      "/dashboard/documents",
      "/dashboard/communications",
    ],
    sections: [
      {
        title: "Élèves & Dossiers",
        items: [
          { id: "directory", name: "Annuaire des classes", href: "/dashboard/directory", icon: BookOpen, short: "Annuaire" },
          { id: "dossiers", name: "Dossiers de classe", href: "/dashboard/students/dossiers", icon: FolderKanban, short: "Dossiers" },
          { id: "review", name: "Examen des admissions", href: "/dashboard/students/dossiers/review", icon: UserCheck, short: "Admissions" },
          { id: "all-students", name: "Registre des élèves", href: "/dashboard/students", icon: Users, short: "Élèves" },
        ],
      },
      {
        title: "Secrétariat",
        items: [
          { id: "documents", name: "Centre documentaire", href: "/dashboard/documents", icon: FileText, short: "Docs" },
          { id: "comms", name: "Communications", href: "/dashboard/communications", icon: MessageSquare, short: "Messages" },
        ],
      },
    ],
  },
  {
    id: "pedagogy",
    label: "Pédagogie",
    icon: GraduationCap,
    defaultHref: "/dashboard/grades",
    matchPrefixes: [
      "/dashboard/grades",
      "/dashboard/attendance",
      "/dashboard/classes",
    ],
    sections: [
      {
        title: "Enseignement",
        items: [
          { id: "grades", name: "Notes & bulletins", href: "/dashboard/grades", icon: GraduationCap, short: "Notes" },
          { id: "attendance", name: "Présences & appel", href: "/dashboard/attendance", icon: ClipboardList, short: "Présences" },
          { id: "classes", name: "Classes & niveaux", href: "/dashboard/classes", icon: Layers, short: "Classes" },
        ],
      },
      {
        title: "Suivi des acquis",
        items: [
          { id: "difficulties", name: "Élèves en difficulté", href: "/dashboard/grades/difficultes", icon: AlertTriangle, short: "Difficultés" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: CreditCard,
    defaultHref: "/dashboard/payments",
    matchPrefixes: [
      "/dashboard/payments",
    ],
    sections: [
      {
        title: "Gestion Financière",
        items: [
          { id: "payments", name: "Facturation & paiements", href: "/dashboard/payments", icon: CreditCard, short: "Paiements" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: Settings,
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
          { id: "admin-home", name: "Vue d'ensemble admin", href: "/dashboard/admin", icon: Settings, short: "Admin" },
          { id: "team", name: "Équipe & membres", href: "/dashboard/team", icon: Users, short: "Équipe" },
          { id: "reports", name: "Rapports d'activité", href: "/dashboard/admin/reports", icon: BarChart3, short: "Rapports" },
          { id: "settings", name: "Paramètres généraux", href: "/dashboard/settings", icon: Settings, short: "Paramètres" },
          { id: "pedagogy-settings", name: "Config pédagogique", href: "/dashboard/settings/pedagogie", icon: BookOpen, short: "Config Pédag." },
          { id: "doc-settings", name: "Pièces exigées", href: "/dashboard/settings/documents", icon: FileText, short: "Pièces" },
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

    // Si la route par défaut n'est pas autorisée, prendre la première route autorisée de l'espace
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
 */
export function getActiveSpaceId(pathname: string | null, spaces: NavSpace[]): NavSpaceKey {
  if (!pathname || spaces.length === 0) return spaces[0]?.id ?? "home";

  if (pathname === "/dashboard") {
    const hasHome = spaces.find((s) => s.id === "home");
    if (hasHome) return "home";
  }

  // 1. Chercher d'abord une correspondance exacte avec une sous-destination
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
    if (space.id !== "home") {
      for (const prefix of space.matchPrefixes) {
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
          return space.id;
        }
      }
    }
  }

  return spaces[0]?.id ?? "home";
}

/**
 * Vrai si l'entrée correspond au chemin courant.
 */
export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
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

