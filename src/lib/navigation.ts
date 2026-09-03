import {
  LayoutDashboard, Users, ClipboardList, CreditCard,
  FileText, MessageSquare, Settings, BarChart3,
  type LucideIcon, GraduationCap,} from "lucide-react";
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
 *
 * ═══ RÉORGANISATION PAR MÉTIER (22 août 2026) ═══
 *
 * Les groupes portaient des noms d'**objets** — Scolarité, Gestion,
 * Établissement — où « Gestion » finissait par tout absorber : paiements,
 * documents, exports et messages, cinq entrées sans rien de commun. Ils portent
 * désormais des noms de **métiers** : Enseignement · Secrétariat · Finance ·
 * Administration. On vise la rubrique par la personne qui s'en sert.
 *
 * ⚠️ **UN TITRE DE SECTION N'EST PAS UNE PERMISSION.** Il nomme le domaine, pas
 * un droit exclusif. Une directrice voit les quatre sections ; un enseignant
 * voit « Secrétariat » s'il a l'Annuaire et les Communications, et c'est
 * normal — il consulte ses élèves et écrit aux parents. Le filtrage reste
 * `hasAccess()`, entrée par entrée, et **rien n'a bougé de ce côté** : mêmes
 * chemins, mêmes droits, aucune rubrique retirée. Seul le rangement change.
 *
 * ⚠️ **Aucune entrée n'a été supprimée ni déplacée hors de portée.** Les dix
 * rubriques sont toutes là ; deux remontent hors section (voir ci-dessous).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, short: "Accueil" },
    ],
  },
  {
    title: "Secrétariat",
    items: [
      { name: "Élèves & dossiers", href: "/dashboard/students", icon: Users, short: "Élèves" },
      { name: "Documents", href: "/dashboard/documents", icon: FileText, short: "Docs" },
      { name: "Communications", href: "/dashboard/communications", icon: MessageSquare, short: "Messages" },
    ],
  },
  {
    title: "Enseignement",
    items: [
      { name: "Présences", href: "/dashboard/attendance", icon: ClipboardList, short: "Présences" },
      { name: "Notes & bulletins", href: "/dashboard/grades", icon: GraduationCap, short: "Notes" },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Finance", href: "/dashboard/payments", icon: CreditCard, short: "Finance" },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Administration", href: "/dashboard/admin", icon: Settings, short: "Admin" },
      { name: "Rapports", href: "/dashboard/admin/reports", icon: BarChart3, short: "Rapports" },
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
