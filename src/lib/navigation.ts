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
  | "ClipboardCheck"
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

export type NavSpaceKey = "students" | "documents" | "comms" | "pedagogy" | "finance" | "admin";

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
/**
 * ⚠️ ORDRE ET REGROUPEMENT — chantier navigation (18 sept.) : reflètent le
 * parcours utilisateur (Scolarité → Pédagogie → Finance → Communication →
 * Documents → Administration), pas l'ordre d'apparition historique des
 * fonctionnalités. `Accueil` précède ce tableau, tuile fixe dans AppRail.tsx
 * — non touchée ici, ce qui porte le total à 7 entrées de rail.
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
      "/dashboard/admissions",
    ],
    sections: [
      {
        title: "Scolarité",
        items: [
          { id: "all-students", name: "Élèves", href: "/dashboard/students", icon: "Users", short: "Élèves" },
          { id: "admissions", name: "Admissions", href: "/dashboard/students/dossiers/review", icon: "UserCheck", short: "Admissions" },
          { id: "structure", name: "Structure", href: "/dashboard/classes", icon: "Layers", short: "Structure" },
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
          { id: "grades", name: "Notes", href: "/dashboard/grades", icon: "GraduationCap", short: "Notes" },
          // ⚠️ Route déjà réelle et existante (chantier documents, phase 1) :
          // `/dashboard/grades/report-card` — aucun lien inventé.
          { id: "report-card", name: "Bulletins", href: "/dashboard/grades/report-card", icon: "FileText", short: "Bulletins" },
          { id: "grades-validation", name: "Validation", href: "/dashboard/grades/validation", icon: "ClipboardCheck", short: "Validation" },
          { id: "attendance", name: "Présences", href: "/dashboard/attendance", icon: "ClipboardList", short: "Présences" },
        ],
      },
      {
        // ⚠️ Ordre aligné sur le flux réel de /dashboard/grades (chantier UX,
        // 18 sept.) : Notes/Bulletins/Présences puis Difficultés y suivent
        // exactement la numérotation 1→4 de la page. L'organisation
        // (affectations) vient après : ce n'est pas le travail quotidien.
        title: "Suivi des acquis",
        items: [
          { id: "difficulties", name: "Élèves en difficulté", href: "/dashboard/grades/difficultes", icon: "AlertTriangle", short: "Difficultés" },
        ],
      },
      {
        title: "Organisation",
        items: [
          // ⚠️ Déplacé depuis Administration (id `pedagogy-settings`) : les
          // affectations classe/enseignant relèvent du parcours pédagogique,
          // pas de la configuration technique. Route inchangée.
          { id: "pedagogy-settings", name: "Classes / enseignants", href: "/dashboard/settings/pedagogie", icon: "BookOpen", short: "Affectations" },
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
          { id: "finance-overview", name: "Vue financière", href: "/dashboard/payments", icon: "CreditCard", short: "Vue" },
          { id: "invoicing", name: "Facturation", href: "/dashboard/payments/new", icon: "FileText", short: "Facturation" },
          { id: "payments", name: "Paiements", href: "/dashboard/payments/receipt", icon: "ClipboardList", short: "Paiements" },
          { id: "reminders", name: "Relances", href: "/dashboard/documents/reminder", icon: "FileText", short: "Relances" },
        ],
      },
    ],
  },
  {
    id: "comms",
    label: "Communication",
    fullLabel: "Communications",
    icon: "MessageSquare",
    defaultHref: "/dashboard/communications",
    matchPrefixes: [
      "/dashboard/communications",
    ],
    sections: [
      {
        title: "Échanges & Messages",
        items: [
          { id: "comms-inbox", name: "Messages", href: "/dashboard/communications/inbox", icon: "MessageSquare", short: "Messages" },
          // ⚠️ Libellé honnête : la racine est le centre de communication
          // (statistiques, campagnes), pas un composeur d'annonces dédié —
          // aucune page distincte "Annonces" n'existe aujourd'hui.
          { id: "comms-overview", name: "Vue d'ensemble", href: "/dashboard/communications", icon: "MessageSquare", short: "Vue" },
          { id: "comms-surveys", name: "Sondages", href: "/dashboard/communications/surveys", icon: "ClipboardList", short: "Sondages" },
        ],
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    fullLabel: "Centre documentaire",
    icon: "FileText",
    defaultHref: "/dashboard/documents",
    matchPrefixes: [
      "/dashboard/documents",
    ],
    sections: [
      {
        title: "Bibliothèque",
        items: [
          { id: "documents-produced", name: "Documents produits", href: "/dashboard/documents", icon: "FileText", short: "Documents" },
          { id: "documents-templates", name: "Modèles", href: "/dashboard/documents/templates", icon: "Layers", short: "Modèles" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
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
          { id: "admin-home", name: "Vue d'ensemble", href: "/dashboard/admin", icon: "Settings", short: "Admin" },
          { id: "team", name: "Équipe & membres", href: "/dashboard/team", icon: "Users", short: "Équipe" },
          { id: "reports", name: "Rapports d'activité", href: "/dashboard/admin/reports", icon: "BarChart3", short: "Rapports" },
          { id: "settings", name: "Paramètres", href: "/dashboard/settings", icon: "Settings", short: "Paramètres" },
          { id: "doc-settings", name: "Pièces exigées", href: "/dashboard/settings/documents", icon: "FileText", short: "Pièces" },
        ],
      },
    ],
  },
];

/**
 * Renvoie la liste des Espaces Métier autorisés pour ce rôle,
 * avec leurs sous-sections filtrées par `hasAccess()`.
 *
 * ⚠️ Règle stricte (Audit des rôles) :
 * Chaque entrée de rail ne s'affiche que si le rôle a réellement le droit
 * de l'exécuter côté serveur (`hasAccess` sur `space.defaultHref`).
 * Le droit est vérifié sur la destination, JAMAIS déduit d'un sous-élément de l'espace.
 */
export function getVisibleSpaces(role: RoleType | string): NavSpace[] {
  return NAV_SPACES.map((space) => {
    // 1. Vérification stricte du droit d'entrée dans l'espace (non déduit de l'espace)
    if (!hasAccess(role, space.defaultHref)) {
      return null;
    }

    const authorizedSections = space.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => hasAccess(role, item.href)),
      }))
      .filter((sec) => sec.items.length > 0);

    if (authorizedSections.length === 0) {
      return null;
    }

    return {
      ...space,
      defaultHref: space.defaultHref,
      sections: authorizedSections,
    };
  }).filter((space): space is NavSpace => space !== null);
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
 * Détermine l'unique entrée de navigation active pour le chemin courant.
 *
 * ⚠️ Règle stricte d'exclusivité : UNE SEULE entrée active à la fois.
 * 1. Correspondance EXACTE du pathname en priorité absolue.
 * 2. Si aucune correspondance exacte n'existe (ex: sous-page /dashboard/students/[id]),
 *    on retient la correspondance par préfixe la plus spécifique (plus long préfixe).
 */
export function getActiveNavItemHref(items: NavItem[], pathname: string | null): string | null {
  if (!pathname || items.length === 0) return null;

  // 1. Correspondance exacte du pathname
  for (const item of items) {
    const itemPath = item.href.split("?")[0];
    if (itemPath === pathname) {
      return item.href;
    }
    // Alias vers Bulletins
    if (itemPath === "/dashboard/grades/report-card" && pathname === "/dashboard/grades/bulletin") {
      return item.href;
    }
  }

  // 2. Si aucune correspondance exacte, correspondance par préfixe la plus spécifique
  const prefixCandidates = items
    .filter((item) => {
      const itemPath = item.href.split("?")[0];
      if (itemPath === "/dashboard") return false;
      return pathname.startsWith(`${itemPath}/`);
    })
    .sort((a, b) => b.href.split("?")[0].length - a.href.split("?")[0].length);

  if (prefixCandidates.length > 0) {
    return prefixCandidates[0].href;
  }

  // 3. Cas particulier de l'accueil
  if (pathname === "/dashboard") {
    const home = items.find((it) => it.href === "/dashboard");
    if (home) return home.href;
  }

  return null;
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
