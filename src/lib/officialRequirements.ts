import type { DocCategory, EducationalCycle, StudentKind, RequirementSource } from "../generated/prisma/client";

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
 * - Entrée en 6e (décret n° 90-1463 du 28 décembre 1990) : demande d'inscription, acte d'état civil, fiche scolaire.
 * - Inscription au CFEE : bulletin ou extrait de naissance, fiche scolaire ou certificat de scolarité.
 * - Inscription au BFEM / Baccalauréat : acte d'état civil, relevés et certificats de scolarité.
 */

export type OfficialRequirementDef = {
  label: string;
  shortLabel: string;
  category: DocCategory;
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
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Personnes autorisées à récupérer l'enfant",
      shortLabel: "Personnes autorisées",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 3,
    },
    {
      label: "Fiche de renseignements signée",
      shortLabel: "Fiche renseig.",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
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
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Certificat de scolarité préscolaire",
      shortLabel: "Certif. préscolaire",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      conditional: "age < 6 in CI",
      order: 2,
    },
    {
      label: "Fiche scolaire / certificat de scolarité",
      shortLabel: "Fiche scolaire",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 3,
    },
    {
      label: "Certificat de transfert (exeat)",
      shortLabel: "Certif. exeat",
      category: "SCOLARITE",
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
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
    {
      label: "Fiche de renseignements signée",
      shortLabel: "Fiche renseig.",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 7,
    },
    {
      label: "Pièce d'identité du tuteur",
      shortLabel: "CNI Tuteur",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 8,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 9,
    },
  ],
  MOYEN: [
    {
      label: "Acte d'état civil (bulletin, extrait ou jugement)",
      shortLabel: "Acte d'état civil",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Fiche scolaire",
      shortLabel: "Fiche scolaire",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Demande d'inscription",
      shortLabel: "Demande inscrip.",
      category: "INSCRIPTION",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      order: 3,
    },
    {
      label: "Relevé de notes CFEE",
      shortLabel: "Relevé CFEE",
      category: "EXAMENS",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Bulletin de l'année précédente",
      shortLabel: "Bulletin N-1",
      category: "SCOLARITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
    {
      label: "Pièce d'identité du tuteur",
      shortLabel: "CNI Tuteur",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 7,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 8,
    },
  ],
  SECONDAIRE: [
    {
      label: "Acte d'état civil",
      shortLabel: "Acte d'état civil",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Fiche scolaire / certificat de scolarité",
      shortLabel: "Fiche scolaire",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Relevé de notes BFEM",
      shortLabel: "Relevé BFEM",
      category: "EXAMENS",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 3,
    },
    {
      label: "Bulletin de l'année précédente",
      shortLabel: "Bulletin N-1",
      category: "SCOLARITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Photos d'identité",
      shortLabel: "Photos",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Pièce d'identité du tuteur",
      shortLabel: "CNI Tuteur",
      category: "IDENTITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 7,
    },
  ],
  AUTRE: [
    {
      label: "Extrait ou bulletin de naissance",
      shortLabel: "Extrait de naissance",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Règlement intérieur signé",
      shortLabel: "Règlement int.",
      category: "INSCRIPTION",
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
