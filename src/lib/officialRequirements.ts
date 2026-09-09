import type { DocCategory, EducationalCycle, StudentKind, RequirementSource } from "../generated/prisma/client";

/**
 * Référentiel réglementaire et officiel des pièces d'inscription — Sénégal, par cycle.
 * 
 * Contexte réglementaire sénégalais :
 * - Inscription au CI : extrait ou bulletin de naissance. Si < 6 ans, certificat de scolarité préscolaire.
 * - Entrée en 6e (décret n° 90-1463 du 28 décembre 1990) : demande d'inscription, acte d'état civil, fiche scolaire.
 * - Inscription au CFEE : bulletin ou extrait de naissance, fiche scolaire ou certificat de scolarité.
 * - Protection des données de santé (Loi 2008-12) : PAS de carnet de vaccination seedé par défaut.
 */

export type OfficialRequirementDef = {
  label: string;
  category: DocCategory;
  source: RequirementSource;
  required: boolean;
  pinned: boolean;
  conditional?: string | null;
  studentKind?: StudentKind | null;
  order: number;
};

export const OFFICIAL_REQUIREMENTS_BY_CYCLE: Record<EducationalCycle, OfficialRequirementDef[]> = {
  MATERNELLE: [
    {
      label: "Extrait ou bulletin de naissance",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Règlement intérieur signé",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 2,
    },
  ],
  ELEMENTAIRE: [
    {
      label: "Extrait ou bulletin de naissance",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Certificat de scolarité préscolaire",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      conditional: "age < 6 in CI",
      order: 2,
    },
    {
      label: "Fiche scolaire / certificat de scolarité",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 3,
    },
    {
      label: "Bulletin de l'année précédente",
      category: "SCOLARITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Règlement intérieur signé",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
  ],
  COLLEGE: [
    {
      label: "Extrait ou bulletin de naissance",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Fiche scolaire / certificat de scolarité",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Relevé de notes CFEE",
      category: "EXAMENS",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 3,
    },
    {
      label: "Bulletin de l'année précédente",
      category: "SCOLARITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Règlement intérieur signé",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
  ],
  LYCEE: [
    {
      label: "Extrait ou bulletin de naissance",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Fiche scolaire / certificat de scolarité",
      category: "SCOLARITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 2,
    },
    {
      label: "Demande d'inscription",
      category: "INSCRIPTION",
      source: "OFFICIEL",
      required: true,
      pinned: false,
      order: 3,
    },
    {
      label: "Relevé de notes BFEM",
      category: "EXAMENS",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 4,
    },
    {
      label: "Bulletin de l'année précédente",
      category: "SCOLARITE",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 5,
    },
    {
      label: "Règlement intérieur signé",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 6,
    },
  ],
  AUTRE: [
    {
      label: "Extrait ou bulletin de naissance",
      category: "IDENTITE",
      source: "OFFICIEL",
      required: true,
      pinned: true,
      order: 1,
    },
    {
      label: "Règlement intérieur signé",
      category: "INSCRIPTION",
      source: "ETABLISSEMENT",
      required: false,
      pinned: false,
      order: 2,
    },
  ],
};

export const CYCLES_DU_REFERENTIEL: EducationalCycle[] = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE"];

// Alias pour rétro-compatibilité
export const OFFICIAL_REQUIREMENTS = OFFICIAL_REQUIREMENTS_BY_CYCLE;
export type OfficialRequirement = OfficialRequirementDef;
