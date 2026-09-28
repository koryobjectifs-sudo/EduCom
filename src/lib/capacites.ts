/**
 * Accès en plus (« capacités ») — 26 sept. 2026, demande de Kory.
 *
 * Chaque membre du personnel a UN métier (son rôle), qui donne ses accès de
 * base (`permissions.ts`). La direction peut lui confier en plus quelques
 * capacités, prises dans ce catalogue FERMÉ. Rien d'autre n'est délégable :
 * réglages de l'école, équipe & accès, conseil de classe, distribution des
 * bulletins et suppressions restent à la direction.
 *
 * Une capacité ouvre à la fois l'écran (chemins ajoutés à `hasAccess`) ET les
 * actions serveur correspondantes (elles se gardent avec les mêmes chemins, ou
 * appellent `aCapacite`). Module pur : utilisable côté écran.
 */
export type Capacite = "PAIEMENTS_LECTURE" | "PAIEMENTS_ENCAISSER" | "BULLETINS_VALIDER" | "INSCRIPTIONS" | "ECRIRE_ECOLE" | "MODERER";

export const CAPACITES: {
  id: Capacite;
  libelle: string;
  detail: string;
  /** Chemins ouverts par la capacité (mêmes règles que `ROLE_PERMISSIONS`, `$` = exact). */
  chemins: string[];
  /** Métiers qui l'ont déjà de base (la case est alors affichée « inclus »). */
  incluse: string[];
}[] = [
  {
    id: "PAIEMENTS_LECTURE",
    libelle: "Voir les paiements des familles",
    detail: "Lecture seule : situation des familles, factures, reçus.",
    chemins: ["/dashboard/payments$", "/dashboard/payments/familles", "/dashboard/payments/invoice", "/dashboard/payments/receipt"],
    incluse: ["OWNER", "ADMIN", "ACCOUNTANT"],
  },
  {
    id: "PAIEMENTS_ENCAISSER",
    libelle: "Encaisser un paiement",
    detail: "Au guichet : facturer et encaisser, avec reçu. Comprend la lecture.",
    chemins: ["/dashboard/payments$", "/dashboard/payments/familles", "/dashboard/payments/invoice", "/dashboard/payments/receipt", "/dashboard/payments/new"],
    incluse: ["OWNER", "ADMIN", "ACCOUNTANT"],
  },
  {
    id: "BULLETINS_VALIDER",
    libelle: "Valider les bulletins",
    detail: "Le bon à tirer du secrétariat, avant le conseil de classe.",
    chemins: ["/dashboard/grades/validation"],
    incluse: ["OWNER", "ADMIN", "SECRETARY"],
  },
  {
    id: "INSCRIPTIONS",
    libelle: "Gérer les inscriptions",
    detail: "Nouveaux élèves, dossiers d'inscription, fiches élèves.",
    chemins: ["/dashboard/students"],
    incluse: ["OWNER", "ADMIN", "SECRETARY", "ASSISTANT"],
  },
  {
    id: "ECRIRE_ECOLE",
    libelle: "Écrire à toute l'école",
    detail: "Publier dans #général, envoyer formulaires et sondages à toutes les familles, @parents.",
    chemins: [],
    incluse: ["OWNER", "ADMIN", "SECRETARY"],
  },
  {
    id: "MODERER",
    libelle: "Modérer la Communauté",
    detail: "Masquer un message, voir qui a lu, clore un sondage d'un autre.",
    chemins: [],
    incluse: ["OWNER", "ADMIN"],
  },
];

export const RESERVE_DIRECTION = [
  "Réglages de l'école",
  "Équipe & accès",
  "Conseil de classe",
  "Distribution des bulletins",
  "Suppressions",
];

const IDS = new Set<string>(CAPACITES.map((c) => c.id));
export const estCapacite = (v: unknown): v is Capacite => typeof v === "string" && IDS.has(v);

/** Le métier inclut-il déjà cette capacité ? */
export const incluseDansMetier = (role: string, cap: Capacite) => CAPACITES.find((c) => c.id === cap)?.incluse.includes(role) ?? false;

/** Le membre a-t-il cette capacité (par son métier, ou reçue en plus) ? */
export function aCapacite(role: string, accordees: readonly string[] | undefined, cap: Capacite): boolean {
  return incluseDansMetier(role, cap) || Boolean(accordees?.includes(cap));
}

/** Chemins supplémentaires ouverts par les capacités accordées (pour `hasAccess`). */
export function cheminsSupplementaires(accordees: readonly string[] | undefined): string[] {
  if (!accordees?.length) return [];
  return [...new Set(CAPACITES.filter((c) => accordees.includes(c.id)).flatMap((c) => c.chemins))];
}
