import {
  LayoutDashboard, Users, School, ClipboardList, CreditCard,
  FileText, MessageSquare, BarChart3, Briefcase, Settings,
  type LucideIcon, FolderOpen, Package,} from "lucide-react";
import { hasAccess, type RoleType } from "@/lib/permissions";

/**
 * Définition unique de la navigation du tableau de bord.
 *
 * Sidebar desktop et navigation mobile lisent cette même table : elles ne
 * peuvent plus diverger. C'était le cas avant — `BottomNav` déclarait ses
 * propres entrées, avec des chemins **sans le préfixe `/dashboard`**, donc
 * quatre liens sur cinq menaient à une 404 et le cinquième sortait de
 * l'application vers la vitrine.
 *
 * ⚠️ **Chaque rubrique a une icône DISTINCTE.** L'ancienne sidebar utilisait
 * `FileText` pour « Saisie des notes » ET « Documents » : sur un rail sans
 * libellés, les deux entrées étaient littéralement indiscernables. « Saisie des
 * notes » porte désormais `ClipboardList`.
 *
 * ⚠️ **Aucune couleur par rubrique.** L'ancienne version donnait à chaque entrée
 * sa propre teinte (bleu, ambre, rose, indigo, teal, violet, rose…) : neuf
 * couleurs ne codent rien, et si tout est accentué, rien ne l'est. La couleur
 * est réservée à l'élément actif, conformément au socle du lot 02.
 */

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Libellé court pour la navigation mobile, si le nom complet est trop long. */
  short?: string;
};

export type NavSection = {
  /** Titre de groupe. `null` pour les entrées de premier niveau, sans en-tête. */
  title: string | null;
  items: NavItem[];
};

/**
 * Regroupement par métier plutôt que par ordre d'arrivée.
 *
 * Dix entrées à plat forcent à lire la liste entière pour trouver la bonne.
 * Trois groupes nommés permettent de viser directement — la secrétaire sait que
 * les élèves sont dans « Scolarité », le comptable que les factures sont dans
 * « Gestion ».
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, short: "Accueil" },
    ],
  },
  {
    title: "Scolarité",
    items: [
      { name: "Élèves", href: "/dashboard/students", icon: Users },
      { name: "Classes", href: "/dashboard/classes", icon: School },
      { name: "Saisie des notes", href: "/dashboard/grades", icon: ClipboardList, short: "Notes" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { name: "Paiements", href: "/dashboard/payments", icon: CreditCard },
      { name: "Documents", href: "/dashboard/documents", icon: FileText },
      // Lot 15 — entrée distincte, et non un sous-menu du hub : `TEACHER` n'a
      // PAS `/dashboard/documents` mais a bien `/dashboard/documents/centre`.
      // Rattacher le centre au hub l'aurait rendu invisible aux enseignants,
      // à qui la liste de fournitures de leur classe est destinée.
      { name: "Centre documentaire", href: "/dashboard/documents/centre", icon: FolderOpen, short: "Centre" },
      // Lot 16 — sous `/dashboard/students` : exporter, c'est lire un dossier.
      // Aucun droit nouveau, et `PARENT`/`ACCOUNTANT` ne le voient pas.
      { name: "Exports de dossiers", href: "/dashboard/students/export", icon: Package, short: "Exports" },
      { name: "Communications", href: "/dashboard/communications", icon: MessageSquare, short: "Messages" },
    ],
  },
  {
    title: "Établissement",
    items: [
      { name: "Équipe", href: "/dashboard/team", icon: Briefcase },
      { name: "Rapports", href: "/dashboard/reports", icon: BarChart3 },
      { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

/**
 * Sections filtrées par rôle, via `hasAccess()`.
 *
 * ⚠️ **Les rubriques interdites ne sont plus affichées grisées.** L'ancienne
 * sidebar les rendait avec un cadenas : elle annonçait donc à chaque rôle
 * l'existence de tout ce qu'il ne peut pas faire, ce qui encombre sans informer.
 * Une navigation ne montre que ce qui est atteignable — sinon elle contient des
 * liens morts par construction.
 *
 * Une section dont aucune entrée n'est autorisée disparaît entièrement, en-tête
 * compris : un titre de groupe vide n'informe de rien.
 */
export function visibleSections(role: RoleType | string): NavSection[] {
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasAccess(role, item.href)),
    }))
    .filter((section) => section.items.length > 0);
}

/** Toutes les entrées autorisées, à plat — pour la navigation mobile. */
export function visibleItems(role: RoleType | string): NavItem[] {
  return visibleSections(role).flatMap((s) => s.items);
}

/**
 * Vrai si l'entrée correspond au chemin courant.
 *
 * `/dashboard` demande une correspondance exacte : sans cela, l'accueil
 * resterait actif sur toutes les pages du tableau de bord, puisque toutes
 * commencent par `/dashboard`.
 */
export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
