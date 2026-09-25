export const ECRANS_VITRINE = ["notes", "appel", "profil", "scan", "finances", "facture"] as const;
export type EcranVitrine = (typeof ECRANS_VITRINE)[number];

/**
 * Page réelle du produit que chaque écran de la vitrine représente. Sert à la
 * barre du bas, aux onglets d'espace et à la navigation interactive : un clic
 * sur un lien du produit dont l'adresse figure ici ouvre l'écran de vitrine
 * correspondant ; toute autre adresse affiche « disponible dans votre espace ».
 */
export const CHEMIN_VITRINE: Record<EcranVitrine, string> = {
  notes: "/dashboard/grades",
  appel: "/dashboard/attendance",
  profil: "/dashboard/students",
  scan: "/dashboard/students/dossier",
  finances: "/dashboard/payments/familles",
  facture: "/dashboard/payments/new",
};

/** Adresse du produit → écran de vitrine (correspondance exacte, sans `?…`). */
export function ecranPourChemin(href: string): EcranVitrine | null {
  const chemin = href.split(/[?#]/)[0];
  if (chemin === "/dashboard/students/dossier") return null; // pas un vrai lien produit
  const trouve = (Object.entries(CHEMIN_VITRINE) as [EcranVitrine, string][]).find(([, c]) => c === chemin);
  return trouve ? trouve[0] : null;
}
