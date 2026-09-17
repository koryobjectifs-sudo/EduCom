import type { DocCategory, EducationalCycle, StudentKind, RequirementSource, RequirementNature } from "../generated/prisma/client";

/**
 * Référentiel réglementaire et officiel des pièces d'inscription — Sénégal, par cycle.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️ RÈGLE STRICTE ET DÉFINITIVE : AUCUNE DONNÉE DE SANTÉ DANS LE RÉFÉRENTIEL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * En application du principe de proportionnalité de la loi n° 2008-12 du 25 janvier 2008
 * (Protection des données à caractère personnel au Sénégal), il est STRICTEMENT INTERDIT
 * de collecter ou d'exiger des pièces que l'établissement scolaire n'utilise pas.
 * 
 * Les données de santé des mineurs (carnet de santé, carnet de vaccination, certificats
 * médicaux, aptitudes physiques) constituent la catégorie de données la plus sensible.
 * 
 * EduCom SaaS :
 * 1. N'en seed AUCUNE par défaut.
 * 2. N'en propose AUCUNE dans ses modèles officiels.
 * 3. N'en documente AUCUNE dans ses règles par défaut.
 * 
 * Si un établissement a un besoin légal spécifique (ex: internat médicalisé), il l'ajoute
 * lui-même sous sa propre responsabilité depuis « Configurer les pièces exigées ».
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Contexte réglementaire officiel sénégalais :
 * - Inscription au CI : extrait ou bulletin de naissance. Si < 6 ans, certificat de scolarité préscolaire.
 * - Entrée en 6e (décret n° 90-1463 du 28 décembre 1990) : demande d'inscription, acte d'état civil, fiche scolaire (certificat de scolarité).
 * - Inscription au CFEE : bulletin ou extrait de naissance, certificat de scolarité (fiche scolaire).
 * - Inscription au BFEM / Baccalauréat : acte d'état civil, relevés et certificats de scolarité.
 *
 * Natures de pièces :
 * - UPLOAD    : le parent envoie un fichier qu'il possède
 * - SIGNATURE : l'école fournit le document, le parent remplit et signe
 * - AUTO      : l'école détient déjà la donnée, EduCom la produit
 */

export type OfficialRequirementDef = {
  label: string;
  shortLabel: string;
  category: DocCategory;
  nature: RequirementNature;
  source: RequirementSource;
  required: boolean;
  pinned: boolean;
  conditional?: string | null;
  studentKind?: StudentKind | null;
  order: number;
};

export const OFFICIAL_REQUIREMENTS_BY_CYCLE: Record<EducationalCycle, OfficialRequirementDef[]> = {
  PRESCOLAIRE: [
    {
      label: "Extrait ou bulletin de naissance",
      shortLabel: "Extrait de naissance",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Personnes autorisées à récupérer l'enfant",
      shortLabel: "Personnes autorisées",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 3,
    },
    {
      label: "Fiche de renseignements signée",
      shortLabel: "Fiche renseig.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
  ],
  ELEMENTAIRE: [
    {
      label: "Extrait ou bulletin de naissance",
      shortLabel: "Extrait de naissance",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Certificat de scolarité préscolaire",
      shortLabel: "Certif. préscolaire",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      conditional: "Âge < 6 ans en CI",
      order: 2,
    },
    {
      label: "Certificat de scolarité",
      shortLabel: "Certificat scolarité",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 3,
    },
    {
      label: "Certificat de transfert (exeat)",
      shortLabel: "Certif. exeat",
      category: "SCOLARITE",
      nature: "UPLOAD",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      conditional: "transfer",
      order: 4,
    },
    {
      label: "Bulletin de l'année précédente",
      shortLabel: "Bulletin N-1",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
    {
      label: "Fiche de renseignements signée",
      shortLabel: "Fiche renseig.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 7,
    },
    {
      label: "Pièce d'identité du tuteur",
      shortLabel: "CNI Tuteur",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 8,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 9,
    },
    {
      label: "Personnes autorisées à récupérer l'enfant",
      shortLabel: "Personnes autorisées",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 10,
    },
  ],
  MOYEN: [
    {
      label: "Acte d'état civil (bulletin, extrait ou jugement)",
      shortLabel: "Acte d'état civil",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Certificat de scolarité",
      shortLabel: "Certificat scolarité",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Demande d'inscription",
      shortLabel: "Demande inscrip.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      order: 3,
    },
    {
      label: "Relevé de notes CFEE",
      shortLabel: "Relevé CFEE",
      category: "EXAMENS",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Bulletin de l'année précédente",
      shortLabel: "Bulletin N-1",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
    {
      label: "Pièce d'identité du tuteur",
      shortLabel: "CNI Tuteur",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 7,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 8,
    },
    {
      label: "Personnes autorisées à récupérer l'enfant",
      shortLabel: "Personnes autorisées",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 9,
    },
  ],
  SECONDAIRE: [
    {
      label: "Acte d'état civil",
      shortLabel: "Acte d'état civil",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Certificat de scolarité",
      shortLabel: "Certificat scolarité",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Relevé de notes BFEM",
      shortLabel: "Relevé BFEM",
      category: "EXAMENS",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 3,
    },
    {
      label: "Bulletin de l'année précédente",
      shortLabel: "Bulletin N-1",
      category: "SCOLARITE",
      nature: "AUTO",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Pièce d'identité du tuteur",
      shortLabel: "CNI Tuteur",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 7,
    },
    {
      label: "Personnes autorisées à récupérer l'enfant",
      shortLabel: "Personnes autorisées",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 8,
    },
  ],
  AUTRE: [
    {
      label: "Extrait ou bulletin de naissance",
      shortLabel: "Extrait de naissance",
      category: "IDENTITE",
      nature: "UPLOAD",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      nature: "SIGNATURE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 2,
    },
  ],
};

export const CYCLES_DU_REFERENTIEL: EducationalCycle[] = ["PRESCOLAIRE", "ELEMENTAIRE", "MOYEN", "SECONDAIRE"];

// Alias pour rétro-compatibilité
export const OFFICIAL_REQUIREMENTS = OFFICIAL_REQUIREMENTS_BY_CYCLE;
export type OfficialRequirement = OfficialRequirementDef;
