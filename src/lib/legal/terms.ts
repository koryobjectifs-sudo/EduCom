/**
 * Conditions Générales d'Utilisation (CGU) & Politique de Confidentialité d'EduCom
 * 
 * ⚠️ Version actuelle : 2026-09-v1
 * Conforme à la loi sénégalaise n° 2008-12 du 25 janvier 2008 relative à la
 * protection des données à caractère personnel (CDP).
 * 
 * Le contenu textuel ci-dessous est structuré pour permettre une mise à jour
 * juridique rapide par le conseil juridique de l'établissement ou de la plateforme.
 */

export const CURRENT_LEGAL_VERSION = "2026-09-v1";

export const TERMS_OF_SERVICE = {
  version: CURRENT_LEGAL_VERSION,
  lastUpdated: "9 septembre 2026",
  title: "Conditions Générales d'Utilisation — EduCom SaaS",
  sections: [
    {
      id: "objet",
      title: "1. Objet et champ d'application",
      content: `La plateforme EduCom est un progiciel de gestion intégrée (SaaS) dédié aux établissements scolaires primaires, moyens et secondaires au Sénégal. Les présentes Conditions Générales régissent l'accès et l'utilisation de l'ensemble des modules : gestion des admissions, scolarité, assiduité, notes, bulletins et gestion financière.`
    },
    {
      id: "roles-responsabilites",
      title: "2. Responsabilité des données (Loi n° 2008-12)",
      content: `L'établissement scolaire client agit en qualité de RESPONSABLE DE TRAITEMENT au sens de l'article 4 de la loi sénégalaise n° 2008-12. À ce titre, il lui appartient d'effectuer les déclarations préalables obligatoires auprès de la Commission de Protection des Données Personnelles (CDP).\n\nEduCom intervient exclusivement en qualité de SOUS-TRAITANT technique agissant sur instruction documentée de l'établissement scolaire.`
    },
    {
      id: "securite-confidentialite",
      title: "3. Sécurité et intégrité des traitements",
      content: `EduCom s'engage à mettre en œuvre les mesures techniques et organisationnelles appropriées pour préserver la sécurité, la confidentialité et l'intégrité des dossiers scolaires, des données d'état civil des élèves et des relevés financiers.`
    },
    {
      id: "engagements-utilisateur",
      title: "4. Obligations de l'établissement utilisateur",
      content: `L'établissement s'engage à n'importer que des données exactes et à jour, et à informer les parents ou représentants légaux de l'existence du traitement numérique de scolarité.`
    },
    {
      id: "abonnement-tarifs",
      title: "5. Souscription, Forfaits et Tarification",
      content: `EduCom propose ses services sous forme de forfaits d'établissement (Standard, Premium ou Sur Demande), indépendamment du nombre d'élèves inscrits. Chaque nouvel établissement bénéficie d'une période d'essai gratuit de 7 jours. Dès la première souscription payante par l'établissement, la période d'essai prend fin immédiatement et la durée d'abonnement souscrite (1, 3, 6 ou 12 mois) commence à courir. Les éventuelles remises dégressives associées aux engagements plurimensuels sont acquises pour la période réglée.`
    },
    {
      id: "annulation-remboursement",
      title: "6. Politique d'annulation et de remboursement",
      content: `Toute souscription peut faire l'objet d'une demande d'annulation et de remboursement intégral dans un délai de 48 heures suivant le paiement en cas d'erreur de facturation ou d'impossibilité technique avérée d'utilisation du service. En cas d'annulation ou de remboursement validé, les droits d'écriture et de modification sur la plateforme sont suspendus. L'historique complet de la transaction, du motif et du statut remboursé reste directement accessible, traçable et gérable depuis l'espace d'administration de l'établissement scolaire.`
    },
    {
      id: "resiliation-donnees-archives",
      title: "7. Résiliation, compte annulé et accès garanti aux données",
      content: `L'établissement scolaire conserve l'entière propriété et la maîtrise souveraine de ses données. En cas d'échéance non renouvelée, d'annulation ou de résiliation de l'abonnement, le compte de l'établissement n'est jamais supprimé sans préavis : il demeure accessible en mode consultation et impression depuis la plateforme de l'école. La direction peut ainsi continuer à consulter, exporter et télécharger l'ensemble de ses registres scolaires, dossiers élèves, relevés de notes et bulletins officiels à des fins de conservation légale. La suppression définitive et irréversible de l'espace et de ses bases de données ne s'opère que sur demande expresse et écrite de la direction de l'établissement.`
    }
  ]
};

export const PRIVACY_POLICY = {
  version: CURRENT_LEGAL_VERSION,
  lastUpdated: "9 septembre 2026",
  title: "Politique de Protection des Données Personnelles",
  sections: [
    {
      id: "collecte",
      title: "1. Données collectées",
      content: `EduCom traite pour le compte de l'école : les données d'identification des élèves (nom, prénom, date de naissance, sexe, matricule), les coordonnées des tuteurs légaux (téléphone, nom, lien de parenté), les données pédagogiques (notes, présences) et les pièces justificatives d'admission.`
    },
    {
      id: "finalites",
      title: "2. Finalités du traitement",
      content: `Les traitements ont pour seules finalités la gestion de la scolarité, le suivi pédagogique, l'édition des documents officiels (bulletins, certificats) et la gestion des droits d'écolage.`
    },
    {
      id: "conservation",
      title: "3. Durée de conservation",
      content: `Les données sont conservées pendant la durée de scolarisation de l'élève au sein de l'établissement, puis archivées conformément aux durées réglementaires de conservation des archives scolaires au Sénégal.`
    },
    {
      id: "droits-cdp",
      title: "4. Droits des personnes (Accès, Rectification, Opposition)",
      content: `Conformément aux articles 58 à 69 de la loi n° 2008-12, les parents et tuteurs disposent d'un droit d'accès, de rectification et d'opposition sur les données de leurs enfants mineurs, à exercer directement auprès de la direction de l'établissement scolaire.`
    }
  ]
};
