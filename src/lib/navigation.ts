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
          // 26 sept. 2026 — dernière étape du bulletin : la remise aux familles.
          { id: "grades-distribution", name: "Distribution aux familles", href: "/dashboard/grades/distribution", icon: "FileText", short: "Distribution" },
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
          { id: "familles", name: "Familles", href: "/dashboard/payments/familles", icon: "Users", short: "Familles" },
          { id: "invoicing", name: "Facturation", href: "/dashboard/payments/new", icon: "FileText", short: "Facturation" },
          { id: "payments", name: "Paiements", href: "/dashboard/payments/receipt", icon: "ClipboardList", short: "Paiements" },
          { id: "reminders", name: "Relances", href: "/dashboard/documents/reminder", icon: "FileText", short: "Relances" },
        ],
      },
    ],
  },
  {
    id: "comms",
    // 25 sept. 2026 — « Product Change » : la Communication devient la
    // Communauté (fil de l'école, espaces de classe), sans API WhatsApp.
    label: "Communauté",
    fullLabel: "Communauté",
    icon: "MessageSquare",
    defaultHref: "/dashboard/communications/communaute",
    matchPrefixes: [
      "/dashboard/communications",
      "/dashboard/aide",
    ],
    sections: [
      {
        title: "Communauté",
        items: [
          // 26 sept. 2026 : canaux et messages directs sur une seule page (façon Slack).
          { id: "comms-community", name: "Canaux & messages", href: "/dashboard/communications/communaute", icon: "MessageSquare", short: "Canaux" },
          { id: "comms-surveys", name: "Enquêtes", href: "/dashboard/communications/communaute?espace=SONDAGES", icon: "ClipboardList", short: "Enquêtes" },
          // 27 sept. 2026 : demandes à l'équipe EduCom (reçues dans le pilotage).
          { id: "aide", name: "Aide EduCom", href: "/dashboard/aide", icon: "MessageSquare", short: "Aide" },
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
    defaultHref: "/dashboard/settings",
    matchPrefixes: [
      "/dashboard/admin",
      "/dashboard/team",
      "/dashboard/settings",
      "/dashboard/abonnement",
    ],
    sections: [
      {
        title: "Configuration",
        items: [
          { id: "settings-general", name: "Établissement & Identité", href: "/dashboard/settings", icon: "Settings", short: "Établissement" },
          { id: "settings-fees", name: "Grille tarifaire & Frais", href: "/dashboard/settings/fees", icon: "CreditCard", short: "Tarifs" },
          { id: "doc-settings", name: "Pièces exigées (Dossier)", href: "/dashboard/settings/documents", icon: "FileText", short: "Pièces" },
          { id: "team", name: "Équipe & Accès", href: "/dashboard/team", icon: "Users", short: "Équipe" },
          { id: "subscription", name: "Abonnement EduCom", href: "/dashboard/abonnement", icon: "CreditCard", short: "Abonnement" },
        ],
      },
      {
        title: "Pilotage & Avancé",
        items: [
          { id: "reports", name: "Rapports d'activité", href: "/dashboard/admin/reports", icon: "BarChart3", short: "Rapports" },
          { id: "other-settings", name: "Autres paramètres & Bascule", href: "/dashboard/settings/reinscription", icon: "Layers", short: "Autres" },
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
export function getVisibleSpaces(role: RoleType | string, extras?: readonly string[]): NavSpace[] {
  return NAV_SPACES.map((space) => {
    // 1. Vérification stricte du droit d'entrée dans l'espace (non déduit de l'espace)
    //    `extras` : chemins ouverts par les accès en plus du membre (`lib/capacites.ts`).
    const entree = hasAccess(role, space.defaultHref, extras) || space.sections.some((sec) => sec.items.some((i) => extras?.some((e) => i.href.split("?")[0] === e.replace(/\$$/, ""))));
    if (!entree) {
      return null;
    }

    const authorizedSections = space.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => hasAccess(role, item.href.split("?")[0], extras) || hasAccess(role, item.href)),
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
  if (hrefPath === "/dashboard/settings" && pathname === "/dashboard/admin") return true;
  // Anciens questionnaires (lien public) : rattachés à l'entrée « Sondages » (26 sept. 2026).
  if (href.includes("espace=SONDAGES") && pathname.startsWith("/dashboard/communications/surveys")) return true;
  if (
    hrefPath === "/dashboard/communications/communaute" &&
    ["/dashboard/communications", "/dashboard/communications/campaigns/new", "/dashboard/communications/inbox", "/dashboard/communications/discussions"].includes(pathname)
  ) {
    return true;
  }
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
    // Alias /dashboard/admin vers Paramètres
    if (itemPath === "/dashboard/settings" && pathname === "/dashboard/admin") {
      return item.href;
    }
    // Alias /dashboard/communications vers Fil de la communauté
    if (
      itemPath === "/dashboard/communications/communaute" &&
      ["/dashboard/communications", "/dashboard/communications/campaigns/new", "/dashboard/communications/inbox", "/dashboard/communications/discussions"].includes(pathname)
    ) {
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
