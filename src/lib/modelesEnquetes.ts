import type { TypeQuestion } from "@/lib/formulaires";

/**
 * Galerie de modèles d'enquêtes — 26 sept. 2026 (inspirée de Jotform et
 * survey.com, demande de Kory), adaptée aux écoles sénégalaises. Chaque modèle
 * s'ouvre dans l'éditeur : tout reste modifiable avant l'envoi.
 */
export type QuestionModele = { type: TypeQuestion; titre: string; obligatoire: boolean; options: string[] };
export type ModeleEnquete = {
  id: string;
  categorie: Categorie;
  emoji: string;
  titre: string;
  description: string;
  /** À qui l'envoyer, en clair (conseil affiché sur la carte). */
  pour: string;
  anonyme?: boolean;
  questions: QuestionModele[];
};

export const CATEGORIES = ["Satisfaction", "Vie scolaire", "Événements", "Pédagogie", "Inscriptions", "Équipe"] as const;
export type Categorie = (typeof CATEGORIES)[number];

const note = (titre: string, obligatoire = true): QuestionModele => ({ type: "echelle", titre, obligatoire, options: [] });
const choix = (titre: string, options: string[], obligatoire = true): QuestionModele => ({ type: "choix", titre, obligatoire, options });
const cases = (titre: string, options: string[], obligatoire = false): QuestionModele => ({ type: "cases", titre, obligatoire, options });
const court = (titre: string, obligatoire = false): QuestionModele => ({ type: "court", titre, obligatoire, options: [] });
const long = (titre: string, obligatoire = false): QuestionModele => ({ type: "long", titre, obligatoire, options: [] });
const nps = (titre: string): QuestionModele => ({ type: "nps", titre, obligatoire: true, options: [] });

export const MODELES_ENQUETES: ModeleEnquete[] = [
  /* ── Satisfaction ── */
  {
    id: "satisfaction-annuelle",
    categorie: "Satisfaction",
    emoji: "⭐",
    titre: "Satisfaction des familles",
    description: "Le baromètre annuel : enseignement, communication, sécurité, accueil.",
    pour: "Tous les parents",
    anonyme: true,
    questions: [
      note("Qualité de l'enseignement"),
      note("Communication de l'école"),
      note("Sécurité et encadrement des enfants"),
      note("Propreté des locaux"),
      note("Accueil au secrétariat"),
      nps("Recommanderiez-vous l'école à un proche ?"),
      long("Ce que nous faisons bien"),
      long("Ce que nous devrions améliorer"),
    ],
  },
  {
    id: "nps-express",
    categorie: "Satisfaction",
    emoji: "📣",
    titre: "Recommandation express",
    description: "Une note de 0 à 10 et un pourquoi. 30 secondes pour les familles.",
    pour: "Tous les parents",
    anonyme: true,
    questions: [nps("Recommanderiez-vous l'école à un proche ?"), long("Qu'est-ce qui explique votre note ?")],
  },
  {
    id: "bilan-trimestre",
    categorie: "Satisfaction",
    emoji: "📘",
    titre: "Bilan de fin de trimestre",
    description: "Progrès de l'enfant, devoirs, suivi par l'enseignant.",
    pour: "Parents d'une classe",
    questions: [
      note("Votre enfant a-t-il progressé ce trimestre ?"),
      choix("La quantité de devoirs est…", ["Trop importante", "Adaptée", "Insuffisante"]),
      note("Suivi et disponibilité de l'enseignant"),
      long("Un point à signaler pour le prochain trimestre ?"),
    ],
  },
  {
    id: "nouvelles-familles",
    categorie: "Satisfaction",
    emoji: "🤝",
    titre: "Accueil des nouvelles familles",
    description: "Comment s'est passée l'arrivée à l'école, et comment elles nous ont connus.",
    pour: "Nouveaux parents",
    questions: [
      note("Facilité de l'inscription"),
      choix("Comment avez-vous connu l'école ?", ["Bouche-à-oreille", "Réseaux sociaux", "Affiche ou panneau", "Autre"]),
      note("Première semaine de votre enfant"),
      long("Qu'aurions-nous pu mieux faire ?"),
    ],
  },

  /* ── Vie scolaire ── */
  {
    id: "cantine",
    categorie: "Vie scolaire",
    emoji: "🍽️",
    titre: "Cantine",
    description: "Qualité des repas, quantités, fréquentation et idées de menus.",
    pour: "Parents des enfants inscrits à la cantine",
    questions: [
      note("Qualité des repas"),
      note("Quantités servies"),
      choix("Votre enfant mange à la cantine…", ["Tous les jours", "Quelques jours par semaine", "Rarement"]),
      cases("Plats que votre enfant aimerait voir plus souvent", ["Thiéboudienne", "Yassa", "Mafé", "Pâtes", "Salades", "Fruits"]),
      long("Suggestions"),
    ],
  },
  {
    id: "transport",
    categorie: "Vie scolaire",
    emoji: "🚌",
    titre: "Transport scolaire",
    description: "Besoin de ramassage, quartiers, ponctualité et sécurité du bus.",
    pour: "Tous les parents",
    questions: [
      choix("Utilisez-vous le transport scolaire ?", ["Oui", "Non", "Non, mais intéressé(e)"]),
      court("Votre quartier", true),
      note("Ponctualité du bus", false),
      note("Sécurité pendant le trajet", false),
      long("Remarques"),
    ],
  },
  {
    id: "bien-etre",
    categorie: "Vie scolaire",
    emoji: "🛡️",
    titre: "Sécurité et bien-être",
    description: "Anonyme : repérer tôt un malaise ou un conflit entre élèves.",
    pour: "Tous les parents",
    anonyme: true,
    questions: [
      note("Votre enfant se sent-il en sécurité à l'école ?"),
      choix("Votre enfant vous a-t-il parlé de moqueries ou de bagarres ?", ["Non", "Oui, une fois", "Oui, plusieurs fois", "Je ne sais pas"]),
      note("Qualité de la surveillance dans la cour"),
      long("Voulez-vous nous signaler quelque chose ? (réponse anonyme)"),
    ],
  },
  {
    id: "horaires",
    categorie: "Vie scolaire",
    emoji: "⏰",
    titre: "Horaires et garderie",
    description: "Les horaires conviennent-ils ? Besoin d'accueil avant ou après les cours ?",
    pour: "Tous les parents",
    questions: [
      choix("Les horaires actuels vous conviennent-ils ?", ["Oui", "Plutôt oui", "Plutôt non", "Non"]),
      cases("Accueil dont vous auriez besoin", ["Avant 7 h 30", "Pause de midi", "Après 17 h", "Mercredi après-midi"]),
      long("Précisions"),
    ],
  },

  /* ── Événements ── */
  {
    id: "sortie",
    categorie: "Événements",
    emoji: "🎒",
    titre: "Autorisation de sortie",
    description: "Accord des parents, numéro du jour J, allergies.",
    pour: "Parents d'une classe",
    questions: [
      choix("Autorisez-vous votre enfant à participer ?", ["Oui", "Non"]),
      court("Numéro à joindre le jour de la sortie", true),
      long("Allergies ou informations utiles"),
    ],
  },
  {
    id: "reunion",
    categorie: "Événements",
    emoji: "🗓️",
    titre: "Réunion de parents",
    description: "Présence, créneaux possibles, questions à aborder.",
    pour: "Parents d'une classe ou de l'école",
    questions: [
      choix("Serez-vous présent(e) ?", ["Oui", "Non", "Peut-être"]),
      cases("Créneaux possibles", ["Samedi matin", "Samedi après-midi", "Mercredi après-midi", "En semaine après 18 h"]),
      long("Questions à aborder"),
    ],
  },
  {
    id: "kermesse",
    categorie: "Événements",
    emoji: "🎪",
    titre: "Kermesse et fête de fin d'année",
    description: "Présence, nombre de personnes, et qui peut donner un coup de main.",
    pour: "Tous les parents",
    questions: [
      choix("Viendrez-vous ?", ["Oui", "Non", "Peut-être"]),
      court("Combien de personnes en tout ?"),
      cases("Je peux aider pour…", ["Tenir un stand", "La cuisine", "L'installation", "L'animation", "Le rangement"]),
      long("Idées pour la fête"),
    ],
  },
  {
    id: "retour-evenement",
    categorie: "Événements",
    emoji: "🎉",
    titre: "Retour après un événement",
    description: "Organisation, ambiance et envie de revenir.",
    pour: "Participants",
    questions: [note("Organisation"), note("Ambiance"), nps("Reviendriez-vous l'an prochain ?"), long("Ce qu'on garde, ce qu'on change")],
  },

  /* ── Pédagogie ── */
  {
    id: "periscolaire",
    categorie: "Pédagogie",
    emoji: "⚽",
    titre: "Activités périscolaires",
    description: "Quelles activités ouvrir, quels jours, à quel budget.",
    pour: "Tous les parents",
    questions: [
      cases("Activités qui intéresseraient votre enfant", ["Football", "Arts plastiques", "Informatique et code", "Théâtre", "Anglais renforcé", "Échecs", "Danse"], true),
      cases("Jours possibles", ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]),
      choix("Budget mensuel envisageable", ["Moins de 5 000 FCFA", "5 000 à 10 000 FCFA", "10 000 à 20 000 FCFA", "Plus de 20 000 FCFA"]),
      long("Autre idée d'activité"),
    ],
  },
  {
    id: "devoirs",
    categorie: "Pédagogie",
    emoji: "✏️",
    titre: "Devoirs et suivi à la maison",
    description: "Temps passé, aide disponible, clarté des consignes.",
    pour: "Parents d'une classe",
    questions: [
      choix("Temps passé chaque soir sur les devoirs", ["Moins de 30 min", "30 min à 1 h", "Plus d'1 h"]),
      choix("Quelqu'un peut-il aider votre enfant ?", ["Oui, souvent", "Parfois", "Rarement"]),
      note("Les consignes sont-elles claires ?"),
      long("Difficultés rencontrées"),
    ],
  },
  {
    id: "langues",
    categorie: "Pédagogie",
    emoji: "🌍",
    titre: "Choix de langue vivante",
    description: "Recueillir les souhaits avant d'organiser les groupes.",
    pour: "Parents des classes concernées",
    questions: [
      choix("Langue souhaitée pour votre enfant", ["Anglais", "Arabe", "Espagnol"]),
      choix("Votre enfant a-t-il déjà étudié cette langue ?", ["Oui", "Un peu", "Non"]),
      long("Remarque"),
    ],
  },

  /* ── Inscriptions ── */
  {
    id: "reinscription",
    categorie: "Inscriptions",
    emoji: "📝",
    titre: "Réinscription pour l'an prochain",
    description: "Anticiper les effectifs et comprendre les départs.",
    pour: "Tous les parents",
    questions: [
      choix("Votre enfant sera-t-il réinscrit l'an prochain ?", ["Oui", "Non", "Je ne sais pas encore"]),
      choix("Si non, pour quelle raison ?", ["Déménagement", "Coût de la scolarité", "Autre école", "Autre raison"], false),
      long("Qu'est-ce qui pourrait vous faire rester ?"),
    ],
  },
  {
    id: "coordonnees",
    categorie: "Inscriptions",
    emoji: "📇",
    titre: "Mise à jour des coordonnées",
    description: "Téléphones, contact d'urgence, quartier : un dossier à jour.",
    pour: "Tous les parents",
    questions: [
      court("Téléphone principal", true),
      court("Contact en cas d'urgence (nom et téléphone)", true),
      court("Quartier de résidence"),
      court("Adresse e-mail"),
    ],
  },
  {
    id: "paiement",
    categorie: "Inscriptions",
    emoji: "💳",
    titre: "Moyens de paiement préférés",
    description: "Wave, Orange Money, espèces… et le rythme qui vous arrange.",
    pour: "Tous les parents",
    questions: [
      cases("Comment préférez-vous payer ?", ["Wave", "Orange Money", "Espèces au secrétariat", "Virement bancaire"], true),
      choix("Rythme de paiement souhaité", ["Mensuel", "Trimestriel", "Annuel"]),
      long("Remarque"),
    ],
  },

  /* ── Équipe ── */
  {
    id: "climat-equipe",
    categorie: "Équipe",
    emoji: "🧑‍🏫",
    titre: "Climat de travail",
    description: "Anonyme : ce que vit l'équipe, et ce qui l'aiderait.",
    pour: "Le personnel",
    anonyme: true,
    questions: [
      note("Je me sens soutenu(e) par la direction"),
      note("La charge de travail est raisonnable"),
      note("L'entente dans l'équipe"),
      nps("Recommanderiez-vous l'école comme lieu de travail ?"),
      long("Une idée pour mieux travailler ensemble"),
    ],
  },
  {
    id: "formation",
    categorie: "Équipe",
    emoji: "🎓",
    titre: "Besoins en formation",
    description: "Thèmes prioritaires et format préféré pour l'équipe.",
    pour: "Le personnel",
    questions: [
      cases("Thèmes prioritaires", ["Outils numériques", "Gestion de classe", "Évaluation", "Élèves en difficulté", "Premiers secours"], true),
      choix("Format préféré", ["Une journée entière", "Plusieurs demi-journées", "En ligne, à mon rythme"]),
      long("Autre besoin"),
    ],
  },
];

/** Durée estimée pour la personne qui répond, en minutes (arrondie, au moins 1). */
export function dureeEstimee(questions: QuestionModele[]): number {
  const s = questions.reduce((t, q) => t + (q.type === "long" ? 45 : q.type === "court" ? 20 : 12), 0);
  return Math.max(1, Math.round(s / 60));
}

/** Idées de sondages rapides (une question, réponses prêtes). */
export const IDEES_SONDAGES: { question: string; options: string[] }[] = [
  { question: "Quel jour pour la réunion de parents ?", options: ["Samedi matin", "Samedi après-midi", "Mercredi après-midi"] },
  { question: "Quelle sortie pour la fin de l'année ?", options: ["Parc de Hann", "Île de Gorée", "Lac Rose", "Musée des civilisations noires"] },
  { question: "Couleur du t-shirt de la kermesse ?", options: ["Bleu", "Vert", "Jaune", "Rouge"] },
  { question: "Votre enfant participera-t-il à la sortie ?", options: ["Oui", "Non", "Je ne sais pas encore"] },
  { question: "Êtes-vous satisfait(e) de la communication de l'école ?", options: ["Très satisfait(e)", "Plutôt satisfait(e)", "Pas vraiment", "Pas du tout"] },
];
