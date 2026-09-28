export interface EtapeMetier {
  id: string;
  titre: string;
  description: string;
  lien: string;
  badge?: string;
  boutonLabel?: string;
  selecteurSpotlight?: string;
  titreSpotlight?: string;
  descriptionSpotlight?: string;
}

export interface EtapeTour {
  selecteur: string;
  pageCible?: string;
  titre: string;
  description: string;
  actionConcrete?: string;
  placementPrefere?: "top" | "bottom" | "left" | "right";
}

export interface ConfigMetierOnboarding {
  role: string;
  nomMetier: string;
  slogan: string;
  tour: EtapeTour[];
  etapes: EtapeMetier[];
  peutInviterEquipe: boolean;
  peutImporterEleves: boolean;
}

export interface EtapeFormationPage {
  selecteur: string;
  titre: string;
  description: string;
  actionConcrete: string;
  placementPrefere?: "top" | "bottom" | "left" | "right";
}

export interface SectionFormation {
  cle: string;
  titreModule: string;
  prefixPath: string;
  etapes: EtapeFormationPage[];
}

export const SECTIONS_FORMATION: Record<string, SectionFormation> = {
  students: {
    cle: "students",
    titreModule: "Scolarité",
    prefixPath: "/dashboard/students",
    etapes: [
      {
        selecteur: '[data-tour="student-create-btn"]',
        titre: "Inscrire un élève",
        description: "Créez une fiche individuelle pour un nouvel élève.",
        actionConcrete: "Renseignez le nom, prénom, classe et tuteur légal WhatsApp.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="student-import-link"]',
        titre: "Importer une liste d'élèves",
        description: "Chargez tous vos effectifs en quelques secondes depuis un fichier Excel.",
        actionConcrete: "Toutes les classes manquantes sont créées automatiquement dès l'importation !",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="student-export-link"]',
        titre: "Exporter les effectifs",
        description: "Téléchargez la liste complète de vos élèves au format Excel ou CSV.",
        actionConcrete: "Générez un état certifié pour l'inspection ou les registres officiels.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="new-class-btn"]',
        titre: "Créer une classe",
        description: "Ajoutez une classe ou section pour organiser vos effectifs.",
        actionConcrete: "Définissez le niveau, le cycle et l'enseignant principal.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="student-search-input"]',
        titre: "Recherche instantanée",
        description: "Retrouvez n'importe quel élève par son nom, prénom ou matricule.",
        actionConcrete: "Tapez les premières lettres pour filtrer immédiatement la liste.",
        placementPrefere: "bottom",
      },
    ],
  },
  students_new: {
    cle: "students_new",
    titreModule: "Nouvelle Admission",
    prefixPath: "/dashboard/students/new",
    etapes: [
      {
        selecteur: '[data-tour="student-info-section"]',
        titre: "Fiche d'identité de l'élève",
        description: "Renseignez le prénom, nom, date de naissance et affectez sa classe d'accueil.",
        actionConcrete: "L'affectation de classe prépare automatiquement sa liste d'appel et ses matières.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="guardian-info-section"]',
        titre: "Tuteur légal & WhatsApp",
        description: "Coordonnées indispensables du parent pour les notifications automatiques.",
        actionConcrete: "Le numéro WhatsApp permettra d'envoyer instantanément reçus et bulletins.",
        placementPrefere: "top",
      },
      {
        selecteur: '[data-tour="student-submit-btn"]',
        titre: "Valider l'admission",
        description: "Finalisez l'inscription pour générer le dossier scolaire complet.",
        actionConcrete: "Crée l'inscription dans la classe et le compte famille rattaché.",
        placementPrefere: "top",
      },
    ],
  },
  students_import: {
    cle: "students_import",
    titreModule: "Importation Excel",
    prefixPath: "/dashboard/students/import",
    etapes: [
      {
        selecteur: '[data-tour="btn-import"]',
        titre: "Parcourir mon ordinateur",
        description: "Sélectionnez votre fichier de rentrée (.xlsx, .xls ou .csv).",
        actionConcrete: "Bouton « Parcourir mon ordinateur » → Création automatique des classes manquantes dès l'importation.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="import-paste-tab"]',
        titre: "Copier-Coller direct",
        description: "Vous pouvez aussi copier-coller directement vos colonnes depuis un tableur.",
        actionConcrete: "Idéal pour importer rapidement une liste sans enregistrer de fichier.",
        placementPrefere: "bottom",
      },
    ],
  },
  payments_new: {
    cle: "payments_new",
    titreModule: "Nouvel Encaissement",
    prefixPath: "/dashboard/payments/new",
    etapes: [
      {
        selecteur: '[data-tour="payment-student-field"]',
        titre: "Sélection de l'élève",
        description: "Recherchez l'élève par nom, prénom ou matricule.",
        actionConcrete: "Affiche immédiatement son statut financier et ses échéances en cours.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="payment-motif-field"]',
        titre: "Frais & Échéances",
        description: "Indiquez l'écolage, les frais d'inscription ou l'activité réglée.",
        actionConcrete: "Le montant attendu est pré-rempli automatiquement.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="payment-submit-btn"]',
        titre: "Émission du reçu certifié",
        description: "Délivre immédiatement un reçu de caisse infalsifiable avec QR code.",
        actionConcrete: "Le solde de la famille est instantanément actualisé.",
        placementPrefere: "top",
      },
    ],
  },
  grades: {
    cle: "grades",
    titreModule: "Pédagogie",
    prefixPath: "/dashboard/grades",
    etapes: [
      {
        selecteur: '[data-tour="grade-first-class-action"]',
        titre: "Saisie des notes",
        description: "Saisissez les contrôles continus, devoirs et compositions pour chaque classe.",
        actionConcrete: "Les moyennes pondérées trimestrielles se calculent en temps réel.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="grade-first-class-conseil"]',
        titre: "Conseil de classe",
        description: "Consultez les moyennes générales et attribuez les appréciations officielles.",
        actionConcrete: "Prépare les délibérations et le classement des élèves.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="nav-report-card-button"]',
        titre: "Bulletins & Relevés",
        description: "Accédez à la génération et l'impression des bulletins officiels sénégalais.",
        actionConcrete: "Génération en 1 clic avec filigrane, logos, rangs et mentions.",
        placementPrefere: "bottom",
      },
    ],
  },
  grades_report_card: {
    cle: "grades_report_card",
    titreModule: "Bulletins Scolaires",
    prefixPath: "/dashboard/grades/report-card",
    etapes: [
      {
        selecteur: '[data-tour="bulletin-student-filter"]',
        titre: "Filtre par élève",
        description: "Visualisez tous les bulletins de la classe ou isolez un élève précis.",
        actionConcrete: "Pratique pour réimprimer un seul bulletin ou vérifier une fiche individuelle.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="bulletin-customize-btn"]',
        titre: "Personnaliser le bulletin",
        description: "Ajustez les éléments visuels : logo, devise, filigrane et signatures.",
        actionConcrete: "Adaptez la présentation aux standards officiels de votre école.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="bulletin-monochrome-btn"]',
        titre: "Mode Économie d'encre",
        description: "Basculez entre le rendu couleur de l'école et le mode noir & blanc.",
        actionConcrete: "Idéal pour réduire drastiquement la consommation d'encre lors des tirages massifs.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="bulletin-print-btn"]',
        titre: "Imprimer A4 officiel",
        description: "Lancez l'impression de l'ensemble des bulletins prêts pour la distribution.",
        actionConcrete: "Génère un format PDF A4 parfait avec pied de page et signatures.",
        placementPrefere: "bottom",
      },
    ],
  },
  payments: {
    cle: "payments",
    titreModule: "Finance",
    prefixPath: "/dashboard/payments",
    etapes: [
      {
        selecteur: '[data-tour="finance-summary"]',
        titre: "Cockpit financier",
        description: "Suivez en temps réel les scolarités totales, les encaissements et les impayés.",
        actionConcrete: "Contrôlez la trésorerie et la santé financière de l'établissement.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="btn-new-payment"]',
        titre: "Nouvel encaissement",
        description: "Enregistrez un règlement d'écolage et délivrez un reçu certifié infalsifiable.",
        actionConcrete: "Reçu officiel sécurisé avec filigrane et QR code de vérification.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="familles-table"]',
        titre: "Comptes familles",
        description: "Consultez le solde de chaque famille et relancez les échéances en retard.",
        actionConcrete: "Visualisez les reliquats et encaissez directement le solde d'un parent.",
        placementPrefere: "top",
      },
    ],
  },
  documents: {
    cle: "documents",
    titreModule: "Documents",
    prefixPath: "/dashboard/documents",
    etapes: [
      {
        selecteur: '[data-tour="doc-generated"]',
        titre: "Documents produits",
        description: "Historique et téléchargement des actes administratifs certifiés.",
        actionConcrete: "Retrouvez et réimprimez n'importe quelle pièce délivrée par l'école.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="doc-templates"]',
        titre: "Modèles d'actes scolaires",
        description: "Certificats de scolarité, attestations et pièces administratives pré-remplies.",
        actionConcrete: "Sélectionnez un modèle officiel pour générer un document en 1 clic.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="doc-actions-tab"]',
        titre: "Actions & Contrôle",
        description: "Vérifiez la conformité des pièces déposées par les familles lors des inscriptions.",
        actionConcrete: "Suivez en direct les dossiers complets et les pièces manquantes.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="doc-incomplete-action"]',
        titre: "Traiter les dossiers incomplets",
        description: "Relancez directement les familles dont les pièces obligatoires sont manquantes.",
        actionConcrete: "Envoyez une alerte WhatsApp ou accordez un délai administratif.",
        placementPrefere: "bottom",
      },
    ],
  },
  team: {
    cle: "team",
    titreModule: "Équipe & Accès",
    prefixPath: "/dashboard/team",
    etapes: [
      {
        selecteur: '[data-tour="team-invite-btn"]',
        titre: "Ajouter un membre",
        description: "Invitez vos enseignants, surveillants, secrétaire et comptable.",
        actionConcrete: "Déléguez les accès en quelques clics par invitation WhatsApp ou e-mail.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="team-chart"]',
        titre: "Organigramme de l'école",
        description: "Visualisez la structure humaine et la répartition des responsabilités.",
        actionConcrete: "Consultez les attributions et rôles des collaborateurs de l'école.",
        placementPrefere: "top",
      },
    ],
  },
  settings: {
    cle: "settings",
    titreModule: "Administration",
    prefixPath: "/dashboard/settings",
    etapes: [
      {
        selecteur: '[data-tour="settings-school-name"]',
        titre: "Nom officiel & Identité",
        description: "Ce nom figure sur l'en-tête de tous vos reçus financiers et bulletins.",
        actionConcrete: "Renseignez le nom exact de l'école, votre logo et vos coordonnées.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="settings-colors"]',
        titre: "Charte graphique & Couleurs",
        description: "Personnalisez la palette visuelle d'EduCom aux couleurs officielles de l'école.",
        actionConcrete: "Sélectionnez votre teinte pour harmoniser l'ensemble de l'interface.",
        placementPrefere: "top",
      },
      {
        selecteur: '[data-tour="settings-apply-color-btn"]',
        titre: "Valider la charte visuelle",
        description: "Appliquez instantanément les couleurs sélectionnées sur tout l'espace scolaire.",
        actionConcrete: "Tous vos collaborateurs verront la nouvelle charte dès leur prochaine action.",
        placementPrefere: "top",
      },
      {
        selecteur: '[data-tour="settings-logo"]',
        titre: "Logo officiel",
        description: "Téléversez l'emblème de votre établissement.",
        actionConcrete: "Apparaîtra en filigrane et sur tous les documents imprimés.",
        placementPrefere: "bottom",
      },
      {
        selecteur: '[data-tour="settings-stamp"]',
        titre: "Cachet officiel de l'école",
        description: "Numérisez le cachet pour l'apposer automatiquement sur les reçus et certificats.",
        actionConcrete: "Sécurise et authentifie les actes générés sans tamponnage manuel.",
        placementPrefere: "top",
      },
    ],
  },
  comms: {
    cle: "comms",
    titreModule: "Communauté & Échanges",
    prefixPath: "/dashboard/communications/communaute",
    etapes: [
      {
        selecteur: '[data-tour="comms-channels-list"]',
        titre: "Canaux scolaires",
        description: "Canal général de l'école, canaux de classes et groupes d'échanges du personnel.",
        actionConcrete: "Naviguez entre les discussions d'école et les espaces privés par classe.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="comms-composer"]',
        titre: "Composeur d'annonces",
        description: "Rédigez un message, joignez des documents PDF, images ou lancez un sondage.",
        actionConcrete: "Diffusion instantanée sur le fil avec accusé de réception et notifications.",
        placementPrefere: "top",
      },
      {
        selecteur: '[data-tour="comms-members-btn"]',
        titre: "Membres du canal & Détails",
        description: "Consultez la liste des membres, parents et collègues inscrits sur ce canal.",
        actionConcrete: "Vérifiez qui est connecté et accédez aux pièces jointes partagées.",
        placementPrefere: "bottom",
      },
    ],
  },
};

export const ONBOARDING_METIERS: Record<string, ConfigMetierOnboarding> = {
  TEACHER: {
    role: "TEACHER",
    nomMetier: "Enseignant",
    slogan: "Votre quotidien pédagogique en toute simplicité",
    tour: [
      {
        selecteur: '[data-tour="nav-accueil"]',
        titre: "Accueil",
        description: "Votre espace enseignant quotidien avec vos prochaines classes et rappels.",
        actionConcrete: "Consultez d'un coup d'œil vos tâches prioritaires et vos attributions.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-pedagogy"]',
        titre: "Pédagogie",
        description: "La saisie des notes, les évaluations trimestrielles et les feuilles d'appel.",
        actionConcrete: "Saisissez les notes de vos contrôles et réalisez l'appel de vos élèves en un clic.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-comms"]',
        titre: "Communauté",
        description: "Échanges avec la direction, collègues et familles de vos élèves.",
        actionConcrete: "Partagez les devoirs et les informations importantes avec vos classes.",
        placementPrefere: "right",
      },
    ],
    etapes: [
      {
        id: "classes",
        titre: "Consulter vos classes et matières",
        description: "Vérifiez vos attributions et découvrez la liste de vos élèves.",
        lien: "/dashboard/grades",
        badge: "Indispensable",
        boutonLabel: "Voir mes classes",
        selecteurSpotlight: '[data-tour="grades-table"]',
        titreSpotlight: "Vos classes assignées",
        descriptionSpotlight: "Retrouvez ici la liste de vos élèves et vos matières d'enseignement.",
      },
      {
        id: "appel",
        titre: "Faire l'appel du jour",
        description: "Marquez les présences et retards en un clic pour votre classe.",
        lien: "/dashboard/grades",
        badge: "Quotidien",
        boutonLabel: "Faire l'appel",
        selecteurSpotlight: '[data-tour="grades-table"]',
        titreSpotlight: "Feuille de présence",
        descriptionSpotlight: "Pointez les présents, retards et absences justifiées.",
      },
      {
        id: "notes",
        titre: "Saisir vos premières notes",
        description: "Enregistrez une évaluation pour tester le calcul automatique des moyennes.",
        lien: "/dashboard/grades",
        badge: "Recommandé",
        boutonLabel: "Saisir des notes",
        selecteurSpotlight: '[data-tour="grades-table"]',
        titreSpotlight: "Saisie d'évaluations",
        descriptionSpotlight: "Les moyennes pondérées et classements se calculent en direct.",
      },
      {
        id: "bulletins",
        titre: "Consulter les bulletins scolaires",
        description: "Vérifiez le rendu officiel des moyennes et rangs calculés.",
        lien: "/dashboard/grades/report-card",
        badge: "Officiel",
        boutonLabel: "Voir les bulletins",
        selecteurSpotlight: '[data-tour="nav-report-card"]',
        titreSpotlight: "Bulletins conformes",
        descriptionSpotlight: "Générez et imprimez les bulletins aux normes officielles.",
      },
    ],
    peutInviterEquipe: false,
    peutImporterEleves: false,
  },
  ACCOUNTANT: {
    role: "ACCOUNTANT",
    nomMetier: "Comptable",
    slogan: "Maîtrise financière et encaissements certifiés",
    tour: [
      {
        selecteur: '[data-tour="nav-accueil"]',
        titre: "Accueil",
        description: "Vue synthétique de la santé financière, caisse du jour et alertes.",
        actionConcrete: "Surveillez les encaissements récents et les soldes en temps réel.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-finance"]',
        titre: "Finance",
        description: "Encaissements des écolages, reçus officiels infalsifiables et relances.",
        actionConcrete: "Enregistrez un paiement en 10 secondes et suivez les comptes familles.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-comms"]',
        titre: "Communauté",
        description: "Canaux d'information et annonces de l'établissement.",
        actionConcrete: "Diffusez les avis financiers ou alertes de facturation.",
        placementPrefere: "right",
      },
    ],
    etapes: [
      {
        id: "caisse",
        titre: "Vérifier le solde de caisse",
        description: "Consultez les recettes de la journée et les encaissements récents.",
        lien: "/dashboard/payments",
        badge: "Indispensable",
        boutonLabel: "Voir la caisse",
        selecteurSpotlight: '[data-tour="finance-summary"]',
        titreSpotlight: "Cockpit financier",
        descriptionSpotlight: "Contrôlez les encaissements totaux et le reliquat prévisionnel.",
      },
      {
        id: "encaisser",
        titre: "Enregistrer un paiement d'écolage",
        description: "Émettez un reçu certifié officiel avec filigrane et QR code.",
        lien: "/dashboard/payments/new",
        badge: "Prioritaire",
        boutonLabel: "Encaisser",
        selecteurSpotlight: '[data-tour="btn-new-payment"]',
        titreSpotlight: "Nouvel encaissement",
        descriptionSpotlight: "Saisissez le règlement pour générer un reçu sécurisé infalsifiable.",
      },
      {
        id: "familles",
        titre: "Consulter les comptes familles",
        description: "Suivez les relances et échéances en cours pour chaque élève.",
        lien: "/dashboard/payments/familles",
        badge: "Comptes",
        boutonLabel: "Comptes familles",
        selecteurSpotlight: '[data-tour="familles-table"]',
        titreSpotlight: "Soldes par famille",
        descriptionSpotlight: "Visualisez les impayés et émettez un reçu en un clic.",
      },
      {
        id: "etats",
        titre: "Exporter les bilans comptables",
        description: "Téléchargez les états d'impayés et les journaux de recettes.",
        lien: "/dashboard/payments",
        badge: "Export",
        boutonLabel: "Exporter",
        selecteurSpotlight: '[data-tour="finance-summary"]',
        titreSpotlight: "Rapports de trésorerie",
        descriptionSpotlight: "Exportez les journaux de caisse en PDF ou Excel.",
      },
    ],
    peutInviterEquipe: false,
    peutImporterEleves: false,
  },
  SECRETARY: {
    role: "SECRETARY",
    nomMetier: "Secrétariat",
    slogan: "Gestion des admissions, registres et vie scolaire",
    tour: [
      {
        selecteur: '[data-tour="nav-accueil"]',
        titre: "Accueil",
        description: "Vue d'ensemble des inscriptions et activités de vie scolaire du jour.",
        actionConcrete: "Suivez les flux de nouveaux inscrits et présences du jour.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-students"]',
        titre: "Scolarité",
        description: "Annuaire des élèves, dossiers d'admission et registres matricules.",
        actionConcrete: "Inscrivez un élève ou importez les effectifs de rentrée.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-pedagogy"]',
        titre: "Pédagogie",
        description: "Consultation des registres de présence et bulletins scolaires.",
        actionConcrete: "Imprimez et distribuez les bulletins officiels validés.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-comms"]',
        titre: "Communauté",
        description: "Diffusion des communications officielles et échanges directs.",
        actionConcrete: "Diffusez les avis aux familles et aux enseignants.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-documents"]',
        titre: "Documents",
        description: "Centre documentaire, modèles de certificats et attestations de scolarité.",
        actionConcrete: "Éditez et imprimez les documents administratifs officiels pour les familles.",
        placementPrefere: "right",
      },
    ],
    etapes: [
      {
        id: "import",
        titre: "Importer la liste des élèves",
        description: "Importez les effectifs à partir d'un fichier Excel ou inscrivez un élève.",
        lien: "/dashboard/students/import",
        badge: "1er pas crucial",
        boutonLabel: "Importer",
        selecteurSpotlight: '[data-tour="btn-import"]',
        titreSpotlight: "Import Excel",
        descriptionSpotlight: "Glissez votre liste pour créer automatiquement les classes et élèves.",
      },
      {
        id: "annuaire",
        titre: "Consulter l'annuaire des élèves",
        description: "Vérifiez les fiches élèves, numéros de matricule et contacts parents.",
        lien: "/dashboard/students",
        badge: "Annuaire",
        boutonLabel: "Voir l'annuaire",
        selecteurSpotlight: '[data-tour="student-create-btn"]',
        titreSpotlight: "Fiches élèves",
        descriptionSpotlight: "Consultez les informations de scolarité et les tuteurs.",
      },
      {
        id: "certificats",
        titre: "Éditer un certificat de scolarité",
        description: "Générez un certificat officiel aux normes de l'établissement.",
        lien: "/dashboard/documents",
        badge: "Documents",
        boutonLabel: "Éditer un certificat",
        selecteurSpotlight: '[data-tour="doc-templates"]',
        titreSpotlight: "Documents officiels",
        descriptionSpotlight: "Délivrez des certificats et attestations en un clic.",
      },
      {
        id: "presences",
        titre: "Superviser les registres du jour",
        description: "Contrôlez les appels enregistrés par les enseignants.",
        lien: "/dashboard/grades",
        badge: "Assiduité",
        boutonLabel: "Vérifier l'appel",
        selecteurSpotlight: '[data-tour="grades-table"]',
        titreSpotlight: "Registres d'assiduité",
        descriptionSpotlight: "Vérifiez que toutes les classes ont bien effectué l'appel du jour.",
      },
    ],
    peutInviterEquipe: false,
    peutImporterEleves: true,
  },
  OWNER: {
    role: "OWNER",
    nomMetier: "Direction Générale",
    slogan: "Supervision globale, pilotage pédagogique et financier",
    tour: [
      {
        selecteur: '[data-tour="nav-accueil"]',
        titre: "Accueil",
        description: "Votre tableau de bord central et vue d'ensemble de l'établissement.",
        actionConcrete: "Retrouvez vos indicateurs clés, alertes de santé scolaire et raccourcis opérationnels.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-students"]',
        titre: "Scolarité",
        description: "Vos classes, vos élèves, leurs fiches et leurs dossiers d'admission.",
        actionConcrete: "C'est ici que vous importez votre liste d'élèves au début de l'année.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-pedagogy"]',
        titre: "Pédagogie",
        description: "La saisie des notes, les registres d'appel et la génération des bulletins officiels.",
        actionConcrete: "Suivez l'avancement des enseignants et imprimez ou partagez les bulletins aux familles.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-finance"]',
        titre: "Finance",
        description: "Les encaissements d'écolages, les reçus officiels infalsifiables et le suivi des impayés.",
        actionConcrete: "Enregistrez un règlement en 10 secondes et relancez les familles par SMS ou WhatsApp.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-comms"]',
        titre: "Communauté",
        description: "Le fil d'actualité de votre école, les communications officielles et les espaces de classe.",
        actionConcrete: "Publiez une annonce aux parents ou sondez votre communauté en quelques clics.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-documents"]',
        titre: "Documents",
        description: "Centre documentaire officiel, modèles d'actes scolaires et certificats.",
        actionConcrete: "Générez des certificats de scolarité, attestations et fiches administratives conformes.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-admin"]',
        titre: "Administration",
        description: "Les paramètres de l'école, la grille tarifaire et la gestion de votre personnel.",
        actionConcrete: "Invitez vos enseignants et votre staff administratif avec leurs accès sécurisés.",
        placementPrefere: "right",
      },
    ],
    etapes: [
      {
        id: "settings",
        titre: "Paramétrer l'école",
        description: "Nom, logo, coordonnées et coordonnées de paiement — indispensables pour des bulletins et reçus officiels.",
        lien: "/dashboard/settings",
        badge: "1. Identité",
        boutonLabel: "Configurer",
        selecteurSpotlight: '[data-tour="settings-school-name"]',
        titreSpotlight: "Nom officiel de l'établissement",
        descriptionSpotlight: "Renseignez le nom officiel de votre école, votre logo et vos coordonnées d'en-tête.",
      },
      {
        id: "import",
        titre: "Importer les élèves",
        description: "Téléchargez votre fichier Excel ou utilisez notre modèle — vos classes sont créées automatiquement !",
        lien: "/dashboard/students/import",
        badge: "2. Élèves & Classes",
        boutonLabel: "Importer maintenant",
        selecteurSpotlight: '[data-tour="btn-import"]',
        titreSpotlight: "Importer vos données d'élèves",
        descriptionSpotlight: "Glissez votre fichier de rentrée : toutes vos classes seront créées d'un coup !",
      },
      {
        id: "teachers",
        titre: "Inviter les enseignants",
        description: "Donnez accès à vos professeurs pour qu'ils puissent saisir leurs notes et faire l'appel dès la rentrée.",
        lien: "/dashboard/team",
        badge: "3. Pédagogie",
        boutonLabel: "Inviter des profs",
        selecteurSpotlight: '[data-tour="team-invite-btn"]',
        titreSpotlight: "Inviter vos enseignants",
        descriptionSpotlight: "Déléguez les accès aux enseignants par e-mail ou WhatsApp en quelques clics.",
      },
      {
        id: "staff",
        titre: "Inviter le staff (secrétariat & comptabilité)",
        description: "Ajoutez votre secrétaire pour la gestion des élèves et votre comptable pour l'encaissement des écolages.",
        lien: "/dashboard/team",
        badge: "4. Administration",
        boutonLabel: "Inviter le staff",
        selecteurSpotlight: '[data-tour="team-invite-btn"]',
        titreSpotlight: "Inviter le personnel administratif",
        descriptionSpotlight: "Ajoutez secrétaire et comptable avec leurs rôles dédiés et sécurisés.",
      },
    ],
    peutInviterEquipe: true,
    peutImporterEleves: true,
  },
  ADMIN: {
    role: "ADMIN",
    nomMetier: "Direction Générale",
    slogan: "Supervision globale, pilotage pédagogique et financier",
    tour: [
      {
        selecteur: '[data-tour="nav-accueil"]',
        titre: "Accueil",
        description: "Votre tableau de bord central et vue d'ensemble de l'établissement.",
        actionConcrete: "Retrouvez vos indicateurs clés, alertes de santé scolaire et raccourcis opérationnels.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-students"]',
        titre: "Scolarité",
        description: "Vos classes, vos élèves, leurs fiches et leurs dossiers d'admission.",
        actionConcrete: "C'est ici que vous importez votre liste d'élèves au début de l'année.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-pedagogy"]',
        titre: "Pédagogie",
        description: "La saisie des notes, les registres d'appel et la génération des bulletins officiels.",
        actionConcrete: "Suivez l'avancement des enseignants et imprimez ou partagez les bulletins aux familles.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-finance"]',
        titre: "Finance",
        description: "Les encaissements d'écolages, les reçus officiels infalsifiables et le suivi des impayés.",
        actionConcrete: "Enregistrez un règlement en 10 secondes et relancez les familles par SMS ou WhatsApp.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-comms"]',
        titre: "Communauté",
        description: "Le fil d'actualité de votre école, les communications officielles et les espaces de classe.",
        actionConcrete: "Publiez une annonce aux parents ou sondez votre communauté en quelques clics.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-documents"]',
        titre: "Documents",
        description: "Centre documentaire officiel, modèles d'actes scolaires et certificats.",
        actionConcrete: "Générez des certificats de scolarité, attestations et fiches administratives conformes.",
        placementPrefere: "right",
      },
      {
        selecteur: '[data-tour="nav-admin"]',
        titre: "Administration",
        description: "Les paramètres de l'école, la grille tarifaire et la gestion de votre personnel.",
        actionConcrete: "Invitez vos enseignants et votre staff administratif avec leurs accès sécurisés.",
        placementPrefere: "right",
      },
    ],
    etapes: [
      {
        id: "settings",
        titre: "Paramétrer l'école",
        description: "Nom, logo, coordonnées et coordonnées de paiement — indispensables pour des bulletins et reçus officiels.",
        lien: "/dashboard/settings",
        badge: "1. Identité",
        boutonLabel: "Configurer",
        selecteurSpotlight: '[data-tour="settings-school-name"]',
        titreSpotlight: "Nom officiel de l'établissement",
        descriptionSpotlight: "Renseignez le nom officiel de votre école, votre logo et vos coordonnées d'en-tête.",
      },
      {
        id: "import",
        titre: "Importer les élèves",
        description: "Téléchargez votre fichier Excel ou utilisez notre modèle — vos classes sont créées automatiquement !",
        lien: "/dashboard/students/import",
        badge: "2. Élèves & Classes",
        boutonLabel: "Importer maintenant",
        selecteurSpotlight: '[data-tour="btn-import"]',
        titreSpotlight: "Importer vos données d'élèves",
        descriptionSpotlight: "Glissez votre fichier de rentrée : toutes vos classes seront créées d'un coup !",
      },
      {
        id: "teachers",
        titre: "Inviter les enseignants",
        description: "Donnez accès à vos professeurs pour qu'ils puissent saisir leurs notes et faire l'appel dès la rentrée.",
        lien: "/dashboard/team",
        badge: "3. Pédagogie",
        boutonLabel: "Inviter des profs",
        selecteurSpotlight: '[data-tour="team-invite-btn"]',
        titreSpotlight: "Inviter vos enseignants",
        descriptionSpotlight: "Déléguez les accès aux enseignants par e-mail ou WhatsApp en quelques clics.",
      },
      {
        id: "staff",
        titre: "Inviter le staff (secrétariat & comptabilité)",
        description: "Ajoutez votre secrétaire pour la gestion des élèves et votre comptable pour l'encaissement des écolages.",
        lien: "/dashboard/team",
        badge: "4. Administration",
        boutonLabel: "Inviter le staff",
        selecteurSpotlight: '[data-tour="team-invite-btn"]',
        titreSpotlight: "Inviter le personnel administratif",
        descriptionSpotlight: "Ajoutez secrétaire et comptable avec leurs rôles dédiés et sécurisés.",
      },
    ],
    peutInviterEquipe: true,
    peutImporterEleves: true,
  },
};

export function getOnboardingConfig(role: string): ConfigMetierOnboarding {
  return ONBOARDING_METIERS[role] || ONBOARDING_METIERS.TEACHER;
}
