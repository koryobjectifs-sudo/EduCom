/**
 * Modèle officiel de Déclaration Préalable de Traitement — Commission de Protection des Données Personnelles (CDP Sénégal)
 * 
 * ⚠️ En application des articles 18 et suivants de la loi n° 2008-12 du 25 janvier 2008
 * portant sur la protection des données à caractère personnel.
 * 
 * Ce module génère un document officiel pré-rempli pour l'établissement scolaire
 * contenant l'identification du responsable, la finalité scolaire, les catégories
 * de données et la sous-traitance technique par EduCom SaaS.
 */

export interface SchoolCdpData {
  schoolName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  directorName?: string | null;
  activeAcademicYear?: string | null;
}

export function generateCdpDeclarationDocument(school: SchoolCdpData) {
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const schoolName = school.schoolName || "Établissement Scolaire";
  const address = school.address || "Dakar, Sénégal";
  const phone = school.phone || "Non renseigné";
  const email = school.email || "Non renseigné";
  const director = school.directorName || "La Direction";

  return {
    title: `Dossier de Déclaration Préalable CDP — ${schoolName}`,
    referenceLaw: "Loi n° 2008-12 du 25 janvier 2008 (Sénégal)",
    dateGenerated: dateStr,
    sections: [
      {
        number: "1",
        title: "IDENTIFICATION DU RESPONSABLE DU TRAITEMENT",
        items: [
          { label: "Nom de l'établissement", value: schoolName },
          { label: "Adresse physique", value: address },
          { label: "Numéro de téléphone", value: phone },
          { label: "Courrier électronique", value: email },
          { label: "Représentant légal", value: director },
          { label: "Statut juridique", value: "Établissement d'Enseignement Privé / Public" },
        ]
      },
      {
        number: "2",
        title: "SOUS-TRAITANT TECHNIQUE ET HÉBERGEMENT",
        items: [
          { label: "Dénomination du sous-traitant", value: "EduCom Technologies — Plateforme EduCom SaaS" },
          { label: "Rôle contractuel", value: "Sous-traitant technique exclusif (Art. 4 de la loi 2008-12)" },
          { label: "Localisation des serveurs et sauvegardes", value: "Centre de données sécurisé avec chiffrement TLS et RLS" },
          { label: "Accès aux données", value: "Limité strictement aux opérations d'administration autorisées par l'école" },
        ]
      },
      {
        number: "3",
        title: "FINALITÉ ET NATURE DU TRAITEMENT",
        items: [
          { label: "Finalité principale", value: "Gestion informatisée de la scolarité, inscriptions, admissions et registres des élèves" },
          { label: "Finalités secondaires", value: "Suivi des évaluations et notes, édition des bulletins trimestriels, gestion des paiements et droits de scolarité" },
          { label: "Caractère obligatoire", value: "Nécessaire à l'exécution du contrat de scolarisation liant les familles à l'établissement" },
        ]
      },
      {
        number: "4",
        title: "CATÉGORIES DE DONNÉES À CARACTÈRE PERSONNEL TRAITÉES",
        items: [
          { label: "Données des élèves", value: "Nom, prénom, date et lieu de naissance, sexe, classe, matricule, historique de présence et notes" },
          { label: "Données des parents / tuteurs", value: "Nom, prénom, numéros de téléphone portable, statut de filiation ou de tutelle" },
          { label: "Pièces justificatives", value: "Extrait de naissance, fiche de scolarité, certificat de transfert (exeat), carnet de vaccination" },
          { label: "Données financières", value: "Relevé des règlements, échéances d'écolage et reçus de caisse" },
        ]
      },
      {
        number: "5",
        title: "DURÉE DE CONSERVATION ET SÉCURITÉ",
        items: [
          { label: "Durée de conservation active", value: "Durée de scolarité de l'élève au sein de l'établissement" },
          { label: "Durée d'archivage", value: "10 ans après le départ de l'élève pour conformité aux archives académiques" },
          { label: "Mesures de sécurité", value: "Authentification par rôle, séparation hermétique des locataires (multi-tenant), contrôle des magic bytes, URLs signées temporaires" },
        ]
      },
      {
        number: "6",
        title: "DROITS DES PERSONNES CONCERNÉES (ARTICLES 58 À 69)",
        items: [
          { label: "Exercice des droits", value: "Directement auprès du secrétariat ou de la direction de l'établissement" },
          { label: "Information des parents", value: "Notice d'information remise lors de la première admission et accessible sur l'espace parent" },
        ]
      }
    ]
  };
}
