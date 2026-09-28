import { calculerEtat, PRO_PRICE_XOF } from "@/lib/abonnement";

/**
 * Outil de pilotage — règles de calcul PURES (testables sans base).
 * `scripts/verify-pilotage.ts`.
 *
 * ═══ STATUT COMMERCIAL D'UNE ÉCOLE ═══
 * Déduit des dates de l'abonnement (`calculerEtat`), jamais stocké :
 *   PAYANTE      période payée en cours
 *   ESSAI        essai en cours (jamais payé)
 *   EN_RETARD    échéance dépassée depuis moins de 7 jours — argent à récupérer
 *   PERDUE       a payé au moins une fois, puis n'a pas renouvelé (lecture seule) — churn
 *   NON_CONVERTIE essai terminé sans jamais payer (lecture seule)
 *   INCONNU      aucune ligne d'abonnement (école jamais revenue depuis le module)
 */
export type Statut = "PAYANTE" | "ESSAI" | "EN_RETARD" | "PERDUE" | "NON_CONVERTIE" | "INCONNU";

export const LIBELLE_STATUT: Record<Statut, string> = {
  PAYANTE: "Payante",
  ESSAI: "En essai",
  EN_RETARD: "En retard de paiement",
  PERDUE: "Perdue (churn)",
  NON_CONVERTIE: "Essai non converti",
  INCONNU: "Sans abonnement",
};

export type Abo = { trialEndsAt: Date; currentPeriodEnd: Date | null } | null;

export function statutEcole(abo: Abo, maintenant = new Date()) {
  if (!abo) return { statut: "INCONNU" as Statut, echeance: null as Date | null, joursRestants: null as number | null };
  const a = calculerEtat(abo, maintenant);
  const statut: Statut =
    a.etat === "ACTIF" ? "PAYANTE" : a.etat === "ESSAI" ? "ESSAI" : a.etat === "EN_RETARD" ? "EN_RETARD" : a.aDejaPaye ? "PERDUE" : "NON_CONVERTIE";
  return { statut, echeance: a.echeance, joursRestants: a.joursRestants };
}

export type Revenus = {
  prixMensuel: number;
  /** Revenu mensuel récurrent : écoles payantes × prix. */
  mrr: number;
  /** En retard : encaissable si on relance maintenant. */
  aRecuperer: number;
  /** Perdu chaque mois : écoles parties. */
  perduParMois: number;
  /** Potentiel des essais en cours s'ils convertissent tous. */
  potentielEssais: number;
  /** Part des écoles sorties d'essai qui ont payé au moins une fois. */
  tauxConversion: number | null;
  /** Part des clients (ayant payé) partis. */
  tauxChurn: number | null;
};

export function revenus(compte: Record<Statut, number>, prix = PRO_PRICE_XOF): Revenus {
  const clients = compte.PAYANTE + compte.EN_RETARD + compte.PERDUE;
  const sortiesEssai = clients + compte.NON_CONVERTIE;
  return {
    prixMensuel: prix,
    mrr: compte.PAYANTE * prix,
    aRecuperer: compte.EN_RETARD * prix,
    perduParMois: compte.PERDUE * prix,
    potentielEssais: compte.ESSAI * prix,
    tauxConversion: sortiesEssai ? clients / sortiesEssai : null,
    tauxChurn: clients ? compte.PERDUE / clients : null,
  };
}

export function compterStatuts(statuts: Statut[]): Record<Statut, number> {
  const c: Record<Statut, number> = { PAYANTE: 0, ESSAI: 0, EN_RETARD: 0, PERDUE: 0, NON_CONVERTIE: 0, INCONNU: 0 };
  for (const s of statuts) c[s]++;
  return c;
}

const JOUR = 86_400_000;

/**
 * Signaux « à surveiller » d'une école — ce qui mérite un appel.
 * Inactivité : aucune action enregistrée depuis 7 jours.
 * Bloquée : sortie de la première semaine sans aucune note saisie.
 */
export function signaux(e: { statut: Statut; joursRestants: number | null; derniereActivite: Date | null; creeLe: Date; notes30j: number; eleves: number }, maintenant = new Date()) {
  const s: string[] = [];
  if (e.statut === "ESSAI" && e.joursRestants !== null && e.joursRestants <= 3) s.push(`Essai : fin dans ${Math.max(0, e.joursRestants)} j`);
  if (e.statut === "EN_RETARD") s.push("Paiement en retard");
  const inactifDepuis = e.derniereActivite ? Math.floor((maintenant.getTime() - e.derniereActivite.getTime()) / JOUR) : null;
  const active = e.statut === "PAYANTE" || e.statut === "ESSAI" || e.statut === "EN_RETARD";
  if (active && (inactifDepuis === null || inactifDepuis >= 7)) s.push(inactifDepuis === null ? "Aucune activité" : `Inactive depuis ${inactifDepuis} j`);
  if (active && maintenant.getTime() - e.creeLe.getTime() > 7 * JOUR) {
    if (!e.eleves) s.push("Aucun élève importé");
    else if (!e.notes30j) s.push("Aucune note ce mois");
  }
  return s;
}

export const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F CFA`;

/* ═══════════════════════ ENTONNOIR D'ADOPTION & LANCEMENT ═══════════════════════ */

export type EtapeAdoption = "INSCRITE" | "STRUCTURE" | "ELEVES" | "PEDAGOGIE" | "VALEUR";

export const ETAPES_FUNNEL: { id: EtapeAdoption; label: string; description: string; ordre: number }[] = [
  { id: "INSCRITE", label: "1. Inscription", description: "Compte créé", ordre: 1 },
  { id: "STRUCTURE", label: "2. Structure", description: "Classes configurées", ordre: 2 },
  { id: "ELEVES", label: "3. Élèves", description: "Élèves importés", ordre: 3 },
  { id: "PEDAGOGIE", label: "4. Notes & Appel", description: "Saisie active en classe", ordre: 4 },
  { id: "VALEUR", label: "5. Bulletins & Finances", description: "Bulletins ou facturation émis", ordre: 5 },
];

export type InfoAdoption = {
  etapes: {
    inscrite: boolean;
    structure: boolean;
    eleves: boolean;
    pedagogie: boolean;
    valeur: boolean;
  };
  etapeActuelle: EtapeAdoption;
  score: number; // 1 à 5
  pourcentage: number; // 20 à 100
  labelEtape: string;
  diagnostic: string;
  actionRecommandee: string;
  estChampionne: boolean;
  messageWhatsApp: string;
  sujetEmail: string;
  messageEmail: string;
};

export function calculerAdoption(
  e: {
    nom: string;
    classes: number;
    eleves: number;
    notes30j: number;
    bulletins: number;
    factures?: number;
    proprietaire?: { nom: string } | null;
  }
): InfoAdoption {
  const nomDir = e.proprietaire?.nom || "Directeur";
  const aClasses = e.classes > 0;
  const aEleves = e.eleves > 0;
  const aNotes = e.notes30j > 0;
  const aValeur = e.bulletins > 0 || (e.factures ?? 0) > 0;

  const etapes = {
    inscrite: true,
    structure: aClasses,
    eleves: aEleves,
    pedagogie: aNotes,
    valeur: aValeur,
  };

  let score = 1;
  let etapeActuelle: EtapeAdoption = "INSCRITE";
  let labelEtape = "Structure non configurée (0 classe)";
  let diagnostic = "L'école s'est inscrite mais n'a pas encore créé ses classes.";
  let actionRecommandee = "Proposer un accompagnement de 5 min pour configurer la structure.";
  let messageWhatsApp = `Bonjour ${nomDir}, c'est Kory d'EduCom. J'ai vu que vous avez créé votre école ${e.nom}. Souhaitez-vous que nous configurions vos premières classes ensemble en 5 minutes ?`;
  let sujetEmail = `Bienvenue sur EduCom — Configuration de ${e.nom}`;
  let messageEmail = `Bonjour ${nomDir},\n\nNous avons le plaisir de vous compter parmi nous sur EduCom pour votre établissement ${e.nom}.\n\nAfin de vous faire gagner un maximum de temps, notre équipe d'accompagnement peut vous aider à paramétrer vos premières classes et cycles scolaires en 5 minutes.\n\nÊtes-vous disponible aujourd'hui ou demain pour un rapide point de prise en main ?\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`;

  if (!aClasses) {
    etapeActuelle = "INSCRITE";
  } else if (!aEleves) {
    score = 2;
    etapeActuelle = "STRUCTURE";
    labelEtape = "Élèves non importés (0 élève)";
    diagnostic = `Structure prête (${e.classes} classes), mais aucun élève n'a été importé.`;
    actionRecommandee = "Proposer d'importer leur fichier Excel / CSV d'élèves.";
    messageWhatsApp = `Bonjour ${nomDir}, c'est Kory d'EduCom pour l'école ${e.nom}. Vos classes sont prêtes ! Avez-vous besoin d'un coup de main pour importer vos listes d'élèves par fichier Excel ?`;
    sujetEmail = `EduCom : Import de vos listes d'élèves pour ${e.nom}`;
    messageEmail = `Bonjour ${nomDir},\n\nVos classes sont bien configurées sur votre espace EduCom pour ${e.nom}.\n\nPour franchir l'étape suivante, nous pouvons importer directement votre liste d'élèves à partir de votre fichier Excel ou CSV. Si vous le souhaitez, vous pouvez nous transmettre votre fichier en réponse à cet e-mail, nous l'intégrerons pour vous.\n\nRestant à votre entière disposition,\nL'équipe EduCom\ncontact@educom.school`;
  } else if (!aNotes) {
    score = 3;
    etapeActuelle = "ELEVES";
    labelEtape = "Aucune note saisie (0 note)";
    diagnostic = `${e.eleves} élèves importés dans ${e.classes} classes, mais aucune note saisie ce mois.`;
    actionRecommandee = "Vérifier si les enseignants ont reçu leurs accès pour saisir les notes.";
    messageWhatsApp = `Bonjour ${nomDir}, c'est Kory d'EduCom. Vos ${e.eleves} élèves sont bien enregistrés dans ${e.nom}. Vos enseignants ont-ils pu se connecter pour commencer la saisie des notes ?`;
    sujetEmail = `EduCom : Prise en main de la saisie des notes pour ${e.nom}`;
    messageEmail = `Bonjour ${nomDir},\n\nVos ${e.eleves} élèves sont bien enregistrés dans vos classes sur EduCom.\n\nVos enseignants ont-ils pu se connecter à leur espace pour démarrer la saisie des notes ? Nous pouvons vous assister ou leur fournir un guide rapide de 2 minutes pour la saisie sur smartphone et ordinateur.\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`;
  } else if (!aValeur) {
    score = 4;
    etapeActuelle = "PEDAGOGIE";
    labelEtape = "Notes saisies, en attente de bulletins";
    diagnostic = `Pédagogie active (${e.notes30j} notes saisies). Les bulletins officiels peuvent être générés.`;
    actionRecommandee = "Encourager à générer les premiers bulletins ou émettre les factures.";
    messageWhatsApp = `Bonjour ${nomDir}, c'est Kory d'EduCom. Bravo pour les notes saisies sur ${e.nom} ! Vos bulletins officiels sont prêts à être générés d'un clic dans votre espace.`;
    sujetEmail = `Génération de vos bulletins officiels — ${e.nom}`;
    messageEmail = `Bonjour ${nomDir},\n\nFélicitations pour les notes saisies par votre équipe sur EduCom (${e.notes30j} notes enregistrées).\n\nVos relevés et bulletins officiels de notes sont désormais prêts à être édités et imprimés en un clic depuis votre tableau de bord.\n\nAvez-vous besoin d'une démonstration pour la génération de vos premiers bulletins ?\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`;
  } else {
    score = 5;
    etapeActuelle = "VALEUR";
    labelEtape = "Adoption complète (Championne 🚀)";
    diagnostic = `L'école utilise toute la chaîne EduCom : élèves, notes et bulletins/factures.`;
    actionRecommandee = "Recueillir un témoignage ou fidéliser le directeur.";
    messageWhatsApp = `Bonjour ${nomDir}, c'est Kory d'EduCom. Félicitations pour l'activité de ${e.nom} sur la plateforme ! Tout fonctionne-t-il parfaitement pour vous et votre équipe ?`;
    sujetEmail = `Point de suivi sur votre expérience EduCom — ${e.nom}`;
    messageEmail = `Bonjour ${nomDir},\n\nNous constatons une excellente activité de votre établissement ${e.nom} sur EduCom et nous tenions à vous en féliciter !\n\nTout se passe-t-il comme vous le souhaitez ? N'hésitez pas à nous faire part de vos retours ou suggestions pour vous accompagner au mieux.\n\nExcellente journée,\nL'équipe EduCom\ncontact@educom.school`;
  }

  const estChampionne = score >= 4 && e.eleves >= 20 && e.notes30j >= 10;

  return {
    etapes,
    etapeActuelle,
    score,
    pourcentage: score * 20,
    labelEtape,
    diagnostic,
    actionRecommandee,
    estChampionne,
    messageWhatsApp,
    sujetEmail,
    messageEmail,
  };
}

export type FunnelLancement = {
  total: number;
  etapes: {
    id: EtapeAdoption;
    label: string;
    nombre: number;
    pourcentage: number;
    bloqueesIci: number;
  }[];
  championsCount: number;
};

export function calculerFunnelLancement(
  ecoles: {
    classes: number;
    eleves: number;
    notes30j: number;
    bulletins: number;
    factures?: number;
    nom: string;
    proprietaire?: { nom: string } | null;
  }[]
): FunnelLancement {
  const total = ecoles.length;
  if (total === 0) {
    return {
      total: 0,
      etapes: ETAPES_FUNNEL.map((e) => ({
        id: e.id,
        label: e.label,
        nombre: 0,
        pourcentage: 0,
        bloqueesIci: 0,
      })),
      championsCount: 0,
    };
  }

  let nbInscrites = total;
  let nbStructure = 0;
  let nbEleves = 0;
  let nbPedagogie = 0;
  let nbValeur = 0;
  let championsCount = 0;

  const bloquees = {
    INSCRITE: 0,
    STRUCTURE: 0,
    ELEVES: 0,
    PEDAGOGIE: 0,
    VALEUR: 0,
  };

  for (const ecole of ecoles) {
    const a = calculerAdoption(ecole);
    if (a.etapes.structure) nbStructure++;
    if (a.etapes.eleves) nbEleves++;
    if (a.etapes.pedagogie) nbPedagogie++;
    if (a.etapes.valeur) nbValeur++;
    bloquees[a.etapeActuelle]++;
    if (a.estChampionne) championsCount++;
  }

  return {
    total,
    etapes: [
      { id: "INSCRITE", label: "Inscrites", nombre: nbInscrites, pourcentage: 100, bloqueesIci: bloquees.INSCRITE },
      { id: "STRUCTURE", label: "Classes créées", nombre: nbStructure, pourcentage: Math.round((nbStructure / total) * 100), bloqueesIci: bloquees.STRUCTURE },
      { id: "ELEVES", label: "Élèves importés", nombre: nbEleves, pourcentage: Math.round((nbEleves / total) * 100), bloqueesIci: bloquees.ELEVES },
      { id: "PEDAGOGIE", label: "Notes saisies", nombre: nbPedagogie, pourcentage: Math.round((nbPedagogie / total) * 100), bloqueesIci: bloquees.PEDAGOGIE },
      { id: "VALEUR", label: "Bulletins / Factures", nombre: nbValeur, pourcentage: Math.round((nbValeur / total) * 100), bloqueesIci: bloquees.VALEUR },
    ],
    championsCount,
  };
}

export type StatutMetier = "OK" | "ATTENTION" | "BLOQUANT";

export type MetierDiagnostic = {
  id: "direction" | "pedagogie" | "secretariat" | "comptabilite";
  nom: string;
  icone: string;
  statut: StatutMetier;
  score: number; // 0 à 100
  resume: string;
  pointsForts: string[];
  pointsBloquants: string[];
  actionDeblocage: string;
  messageAssistance: {
    whatsapp: string;
    emailSujet: string;
    emailCorps: string;
  };
};

export type InputMetiersEcole = {
  nom: string;
  nomDirecteur: string;
  // Direction & Identité
  aLogo: boolean;
  aStamp: boolean;
  aSignature: boolean;
  anneeScolaire: string | null;
  periodesCount: number;
  adminCount: number;
  // Pédagogie
  classesCount: number;
  subjectsCount: number;
  assignmentsCount: number;
  profsAssignesCount: number;
  classesSansProfCount: number;
  notes30j: number;
  bulletinsCount: number;
  // Secrétariat
  studentsCount: number;
  studentsWithoutClassCount: number;
  studentsWithPhoneCount: number;
  // Comptabilité
  invoicesCount: number;
  invoicesTotal: number;
  paymentsCount: number;
  paymentsTotal: number;
  aWave: boolean;
  aOrangeMoney: boolean;
};

export type AuditMetiersEcole = {
  direction: MetierDiagnostic;
  pedagogie: MetierDiagnostic;
  secretariat: MetierDiagnostic;
  comptabilite: MetierDiagnostic;
  scoreGlobal: number;
  statutGlobal: StatutMetier;
  bloquantPrincipal: string | null;
  actionPrioritaire: string;
};

export function evaluerMetiersEcole(inp: InputMetiersEcole): AuditMetiersEcole {
  const dir = inp.nomDirecteur || "Directeur";

  // 1. Direction & Identité
  const ptsFortsDir: string[] = [];
  const ptsBloqDir: string[] = [];
  let scoreDir = 0;

  if (inp.aStamp) {
    scoreDir += 30;
    ptsFortsDir.push("Cachet officiel certifié présent.");
  } else {
    ptsBloqDir.push("🛑 Cachet officiel manquant : les reçus et bulletins ne sont pas officialisés.");
  }

  if (inp.aSignature) {
    scoreDir += 30;
    ptsFortsDir.push("Signature du directeur enregistrée.");
  } else {
    ptsBloqDir.push("🛑 Signature du directeur manquante : aucun visa officiel sur les documents.");
  }

  if (inp.anneeScolaire) {
    scoreDir += 20;
    ptsFortsDir.push(`Année scolaire active : ${inp.anneeScolaire}`);
  } else {
    ptsBloqDir.push("🛑 Aucune année scolaire active déclarée.");
  }

  if (inp.periodesCount > 0) {
    scoreDir += 20;
    ptsFortsDir.push(`${inp.periodesCount} période(s) (trimestres/semestres) configurée(s).`);
  } else {
    ptsBloqDir.push("⚠️ Aucune période (trimestre / semestre) configurée.");
  }

  const statutDir: StatutMetier =
    !inp.aStamp || !inp.aSignature || !inp.anneeScolaire
      ? "BLOQUANT"
      : !inp.aLogo || inp.periodesCount === 0
      ? "ATTENTION"
      : "OK";

  const diagDir: MetierDiagnostic = {
    id: "direction",
    nom: "Direction & Identité Officielle",
    icone: "🏛️",
    statut: statutDir,
    score: scoreDir,
    resume:
      statutDir === "OK"
        ? "Identité officielle complète et certifiée."
        : statutDir === "BLOQUANT"
        ? "Cachet ou signature manquant pour les documents officiels."
        : "Quelques réglages administratifs à finaliser.",
    pointsForts: ptsFortsDir,
    pointsBloquants: ptsBloqDir,
    actionDeblocage:
      !inp.aStamp || !inp.aSignature
        ? "Téléverser le cachet officiel et la signature de la direction dans Paramètres."
        : "Vérifier l'année scolaire et le calendrier des trimestres.",
    messageAssistance: {
      whatsapp: `Bonjour ${dir}, c'est Kory d'EduCom. Pour certifier vos bulletins et factures de ${inp.nom} avec votre cachet et votre signature officielle, souhaitez-vous que nous les calibrions ensemble en 2 minutes ?`,
      emailSujet: `Configuration du cachet et de la signature officielle — ${inp.nom}`,
      emailCorps: `Bonjour ${dir},\n\nNous avons remarqué que le cachet officiel et/ou la signature de direction ne sont pas encore téléversés pour votre établissement ${inp.nom}.\n\nCes éléments sont indispensables pour certifier vos bulletins officiels et vos reçus de scolarité délivrés aux familles. Vous pouvez nous envoyer une simple photo ou scan de votre cachet et signature en réponse à cet e-mail, notre équipe les intégrera pour vous.\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`,
    },
  };

  // 2. Pédagogie & Enseignement
  const ptsFortsPed: string[] = [];
  const ptsBloqPed: string[] = [];
  let scorePed = 0;

  if (inp.classesCount > 0) {
    scorePed += 20;
    ptsFortsPed.push(`${inp.classesCount} classe(s) créée(s).`);
  } else {
    ptsBloqPed.push("🛑 0 classe créée dans l'établissement.");
  }

  if (inp.subjectsCount > 0) {
    scorePed += 20;
    ptsFortsPed.push(`${inp.subjectsCount} matière(s) au programme.`);
  }

  if (inp.assignmentsCount > 0) {
    scorePed += 25;
    ptsFortsPed.push(`${inp.assignmentsCount} affectation(s) enseignant-matière active(s).`);
  } else if (inp.classesCount > 0) {
    ptsBloqPed.push("🛑 Bloquant : 0 enseignant assigné aux matières. Aucun professeur ne peut saisir de note !");
  }

  if (inp.classesSansProfCount > 0 && inp.assignmentsCount > 0) {
    ptsBloqPed.push(`⚠️ ${inp.classesSansProfCount} classe(s) sans aucun professeur assigné.`);
  }

  if (inp.notes30j > 0) {
    scorePed += 20;
    ptsFortsPed.push(`${inp.notes30j} note(s) saisie(s) ces 30 derniers jours.`);
  } else if (inp.classesCount > 0) {
    ptsBloqPed.push("⚠️ 0 note saisie ces 30 derniers jours : les enseignants n'ont pas encore commencé la saisie.");
  }

  if (inp.bulletinsCount > 0) {
    scorePed += 15;
    ptsFortsPed.push(`${inp.bulletinsCount} bulletin(s) de notes officiel(s) généré(s).`);
  }

  const statutPed: StatutMetier =
    inp.classesCount === 0 || (inp.classesCount > 0 && inp.assignmentsCount === 0)
      ? "BLOQUANT"
      : inp.classesSansProfCount > 0 || inp.notes30j === 0
      ? "ATTENTION"
      : "OK";

  const diagPed: MetierDiagnostic = {
    id: "pedagogie",
    nom: "Pédagogie & Enseignement",
    icone: "📚",
    statut: statutPed,
    score: scorePed,
    resume:
      statutPed === "OK"
        ? "Pédagogie active avec saisie régulière des notes."
        : statutPed === "BLOQUANT"
        ? inp.classesCount === 0
          ? "Aucune classe configurée."
          : "Enseignants non affectés aux matières des classes."
        : "Saisie des notes ou affectations partielles.",
    pointsForts: ptsFortsPed,
    pointsBloquants: ptsBloqPed,
    actionDeblocage:
      inp.classesCount > 0 && inp.assignmentsCount === 0
        ? "Affecter les professeurs aux matières des classes pour débloquer la saisie des notes."
        : inp.notes30j === 0
        ? "Inviter les enseignants à saisir le premier devoir sur mobile ou ordinateur."
        : "Générer les bulletins de notes.",
    messageAssistance: {
      whatsapp: `Bonjour ${dir}, c'est Kory d'EduCom pour ${inp.nom}. Vos classes sont prêtes mais vos enseignants n'ont pas encore leurs matières attribuées. Souhaitez-vous qu'on les affecte ensemble pour qu'ils puissent saisir leurs notes ?`,
      emailSujet: `Affectation des enseignants et saisie des notes — ${inp.nom}`,
      emailCorps: `Bonjour ${dir},\n\nVos classes et matières sont prêtes sur votre espace EduCom pour ${inp.nom}.\n\nPour permettre à vos enseignants de démarrer la saisie de leurs notes, il est nécessaire d'affecter chaque enseignant à ses matières dans ses classes. Sans cette affectation, l'espace enseignant reste vide.\n\nNous pouvons vous accompagner par appel rapide pour paramétrer ces affectations.\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`,
    },
  };

  // 3. Secrétariat & Élèves
  const ptsFortsSec: string[] = [];
  const ptsBloqSec: string[] = [];
  let scoreSec = 0;

  if (inp.studentsCount > 0) {
    scoreSec += 50;
    ptsFortsSec.push(`${inp.studentsCount} élève(s) inscrit(s).`);
  } else {
    ptsBloqSec.push("🛑 0 élève inscrit : le secrétariat n'a pas encore chargé les listes.");
  }

  if (inp.studentsCount > 0 && inp.studentsWithoutClassCount === 0) {
    scoreSec += 25;
    ptsFortsSec.push("Tous les élèves sont répartis dans leurs classes.");
  } else if (inp.studentsWithoutClassCount > 0) {
    ptsBloqSec.push(`⚠️ ${inp.studentsWithoutClassCount} élève(s) sans classe attribuée.`);
  }

  if (inp.studentsWithPhoneCount > 0) {
    scoreSec += 25;
    ptsFortsSec.push(`${inp.studentsWithPhoneCount} tuteur(s) joignable(s) par téléphone/SMS.`);
  }

  const statutSec: StatutMetier =
    inp.studentsCount === 0 ? "BLOQUANT" : inp.studentsWithoutClassCount > 0 ? "ATTENTION" : "OK";

  const diagSec: MetierDiagnostic = {
    id: "secretariat",
    nom: "Secrétariat & Vie Scolaire",
    icone: "👥",
    statut: statutSec,
    score: scoreSec,
    resume:
      statutSec === "OK"
        ? "Base d'élèves complète et répartie dans les classes."
        : statutSec === "BLOQUANT"
        ? "Aucun élève importé dans l'école."
        : "Certains élèves sont sans classe attribuée.",
    pointsForts: ptsFortsSec,
    pointsBloquants: ptsBloqSec,
    actionDeblocage:
      inp.studentsCount === 0
        ? "Importer le fichier Excel des élèves ou nous le transmettre pour intégration."
        : "Affecter les élèves sans classe à leur classe respective.",
    messageAssistance: {
      whatsapp: `Bonjour ${dir}, c'est Kory d'EduCom. Avez-vous besoin d'un coup de main pour importer les listes de vos élèves sur ${inp.nom} ? Vous pouvez nous envoyer votre fichier Excel directement.`,
      emailSujet: `Import de vos listes d'élèves — ${inp.nom}`,
      emailCorps: `Bonjour ${dir},\n\nPour franchir l'étape d'enregistrement de vos élèves sur ${inp.nom}, notre équipe peut intégrer directement vos listes d'élèves à partir de votre fichier Excel ou papier.\n\nTransmettez-nous votre fichier en réponse à ce mail et nous l'importerons sous 24 h.\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`,
    },
  };

  // 4. Comptabilité & Finances
  const ptsFortsCompta: string[] = [];
  const ptsBloqCompta: string[] = [];
  let scoreCompta = 0;

  if (inp.invoicesCount > 0) {
    scoreCompta += 40;
    ptsFortsCompta.push(`${inp.invoicesCount} facture(s) d'écolage émise(s) (${fcfa(inp.invoicesTotal)}).`);
  } else {
    ptsBloqCompta.push("⚠️ 0 facture d'écolage émise : la caisse n'a pas encore facturé les scolarités.");
  }

  if (inp.paymentsCount > 0) {
    scoreCompta += 40;
    ptsFortsCompta.push(`${inp.paymentsCount} règlement(s) enregistré(s) (${fcfa(inp.paymentsTotal)}).`);
  }

  if (inp.aWave) {
    scoreCompta += 20;
    ptsFortsCompta.push("Paiement marchand Wave configuré pour les familles.");
  } else {
    ptsBloqCompta.push("💡 Numéro marchand Wave non configuré : paiement en ligne désactivé.");
  }

  const statutCompta: StatutMetier =
    inp.invoicesCount === 0 && inp.paymentsCount === 0 ? "ATTENTION" : "OK";

  const diagCompta: MetierDiagnostic = {
    id: "comptabilite",
    nom: "Comptabilité & Caisse",
    icone: "💳",
    statut: statutCompta,
    score: scoreCompta,
    resume:
      statutCompta === "OK"
        ? "Facturation et encaissements actifs."
        : "La caisse de l'école n'a pas encore émis de factures d'écolage.",
    pointsForts: ptsFortsCompta,
    pointsBloquants: ptsBloqCompta,
    actionDeblocage:
      inp.invoicesCount === 0
        ? "Paramétrer les frais d'écolage et émettre les factures du mois."
        : "Ajouter les numéros de règlement Wave / Orange Money.",
    messageAssistance: {
      whatsapp: `Bonjour ${dir}, c'est Kory d'EduCom. Souhaitez-vous activer la gestion des paiements et émettre vos reçus de scolarité sur ${inp.nom} ?`,
      emailSujet: `Gestion des paiements de scolarité — ${inp.nom}`,
      emailCorps: `Bonjour ${dir},\n\nEduCom vous permet de suivre les paiements de scolarité, d'éditer des reçus conformes avec cachet et de relancer les retards automatiquement par WhatsApp.\n\nSouhaitez-vous une démonstration pour activer la facturation de votre école ?\n\nBien cordialement,\nL'équipe EduCom\ncontact@educom.school`,
    },
  };

  const scoreGlobal = Math.round((scoreDir + scorePed + scoreSec + scoreCompta) / 4);

  let statutGlobal: StatutMetier = "OK";
  let bloquantPrincipal: string | null = null;
  let actionPrioritaire = "L'école fonctionne parfaitement sur tous les métiers.";

  if (statutDir === "BLOQUANT") {
    statutGlobal = "BLOQUANT";
    bloquantPrincipal = ptsBloqDir[0] || "Direction non configurée";
    actionPrioritaire = diagDir.actionDeblocage;
  } else if (statutSec === "BLOQUANT") {
    statutGlobal = "BLOQUANT";
    bloquantPrincipal = ptsBloqSec[0] || "Élèves non importés";
    actionPrioritaire = diagSec.actionDeblocage;
  } else if (statutPed === "BLOQUANT") {
    statutGlobal = "BLOQUANT";
    bloquantPrincipal = ptsBloqPed[0] || "Pédagogie bloquée";
    actionPrioritaire = diagPed.actionDeblocage;
  } else if (statutPed === "ATTENTION" || statutDir === "ATTENTION" || statutSec === "ATTENTION" || statutCompta === "ATTENTION") {
    statutGlobal = "ATTENTION";
    bloquantPrincipal = ptsBloqPed[0] || ptsBloqDir[0] || ptsBloqSec[0] || ptsBloqCompta[0] || null;
    actionPrioritaire = diagPed.actionDeblocage || diagDir.actionDeblocage;
  }

  return {
    direction: diagDir,
    pedagogie: diagPed,
    secretariat: diagSec,
    comptabilite: diagCompta,
    scoreGlobal,
    statutGlobal,
    bloquantPrincipal,
    actionPrioritaire,
  };
}
