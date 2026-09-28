export interface MetierQuizOption {
  role: string;
  label: string;
}

export const METIERS_FORM: MetierQuizOption[] = [
  { role: "DIRECTEUR", label: "Directeur / Fondateur" },
  { role: "ENSEIGNANT", label: "Enseignant / Professeur" },
  { role: "COMPTABLE", label: "Comptable / Gestionnaire financier" },
  { role: "SECRETAIRE", label: "Secrétariat / Scolarité" },
  { role: "PARENT", label: "Parent d'élève" },
];

export const MODULES_FORM = [
  { id: "accueil", label: "Accueil & Tableau de bord" },
  { id: "scolarite", label: "Scolarité (Élèves & Classes)" },
  { id: "pedagogie", label: "Pédagogie (Saisie des notes & Bulletins)" },
  { id: "finance", label: "Finance & Encaissement des écolages" },
  { id: "documents", label: "Documents & Actes officiels (Attestations, certificats)" },
  { id: "communaute", label: "Communauté & Annonces officielles" },
  { id: "parametres", label: "Paramètres & Identité de l'école" },
];

export const CHOIX_FACILITE = [
  { id: "tres_facile", label: "Très facile & intuitif (pris en main immédiatement)", points: 100 },
  { id: "facile", label: "Facile (compris après la démonstration)", points: 80 },
  { id: "moyen", label: "Moyen (quelques hésitations sur les boutons)", points: 50 },
  { id: "difficile", label: "Difficile (besoin d'explications supplémentaires)", points: 25 },
];

export const CHOIX_QUALITE = [
  { id: "excellent", label: "Excellent & très professionnel (valorisant pour l'école)", points: 100 },
  { id: "bon", label: "Propre & fonctionnel (répond bien aux besoins)", points: 80 },
  { id: "passable", label: "Passable (finitions ou affichage à moderniser)", points: 50 },
  { id: "bug", label: "Insuffisant (bugs ou lenteurs rencontrés)", points: 25 },
];

export const CHOIX_CONFUSION = [
  { id: "aucune", label: "✅ Aucune confusion, tout est clair" },
  { id: "libelles", label: "Libellés ou vocabulaire peu clairs" },
  { id: "bouton", label: "Bouton d'action difficile à repérer" },
  { id: "etapes", label: "Trop d'étapes ou formulaire trop long" },
  { id: "peur", label: "Peur de faire une mauvaise manipulation" },
  { id: "lenteur", label: "Lenteur de chargement ou blocage" },
];
