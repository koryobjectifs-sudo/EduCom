import type { DocCategory, EducationalCycle, StudentKind } from "../generated/prisma/client";

/**
 * Référentiel officiel des pièces d'inscription — Sénégal, par cycle.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * `settings/documents/actions.ts` portait la note inverse : « aucune liste de
 * pièces n'est codée, pré-remplir une liste sénégalaise serait inventer une
 * règle ». L'inquiétude était juste, la conclusion trop large — le résultat
 * était qu'une école ouvrait son premier dossier sur **zéro exigence**, donc
 * sur un écran qui ne dit rien et un taux de complétude impossible à calculer.
 *
 * Le compromis retenu : ce référentiel est une **proposition**, jamais une
 * règle. Rien n'est écrit en base tant que la direction ne l'applique pas
 * depuis Réglages › Pièces du dossier, et chaque ligne créée reste modifiable
 * ou désactivable comme n'importe quelle exigence saisie à la main. L'école
 * garde la main ; elle ne part simplement plus de rien.
 *
 * ⚠️ **« Moins de 3 mois » n'est PAS une durée de validité.** L'extrait de
 * naissance doit être récent *au dépôt* ; il ne périme pas tous les trimestres.
 * Le renseigner en `validityMonths` ferait basculer la pièce en EXPIRED trois
 * mois après son dépôt et réclamerait un nouvel extrait chaque trimestre, pour
 * chaque élève. La règle est donc portée par le LIBELLÉ, que la secrétaire lit
 * au moment de contrôler la pièce, et `validityMonths` reste vide.
 *
 * ⚠️ `studentKind: "TRANSFERT"` cible les pièces qui n'ont de sens que pour un
 * élève venu d'un autre établissement — radiation, dossier scolaire. Sans ce
 * ciblage, tout élève déjà présent l'an dernier apparaîtrait en dossier
 * incomplet pour une pièce qu'il n'a aucune raison de fournir.
 */

export type OfficialRequirement = {
  label: string;
  category: DocCategory;
  studentKind?: StudentKind;
};

export const OFFICIAL_REQUIREMENTS: Partial<Record<EducationalCycle, OfficialRequirement[]>> = {
  MATERNELLE: [
    { label: "Extrait de naissance (moins de 3 mois)", category: "IDENTITE" },
    { label: "Carnet de vaccination à jour", category: "SANTE" },
    { label: "Photos d'identité (2 à 4)", category: "IDENTITE" },
    { label: "Fiche de renseignement parentale", category: "INSCRIPTION" },
  ],
  ELEMENTAIRE: [
    { label: "Extrait de naissance original (moins de 3 mois)", category: "IDENTITE" },
    { label: "Dossier scolaire ou livret de notes de l'année précédente", category: "SCOLARITE", studentKind: "TRANSFERT" },
    { label: "Certificat de radiation (quitus)", category: "TRANSFERT", studentKind: "TRANSFERT" },
    { label: "Photos d'identité récentes", category: "IDENTITE" },
  ],
  COLLEGE: [
    { label: "Extrait ou bulletin de naissance", category: "IDENTITE" },
    { label: "Bulletins de notes des deux semestres précédents", category: "SCOLARITE" },
    { label: "Certificat de scolarité de l'école d'origine", category: "SCOLARITE", studentKind: "TRANSFERT" },
    { label: "Certificat de radiation", category: "TRANSFERT", studentKind: "TRANSFERT" },
    { label: "Photos d'identité", category: "IDENTITE" },
  ],
  LYCEE: [
    { label: "Extrait de naissance", category: "IDENTITE" },
    { label: "Bulletins de notes des semestres précédents", category: "SCOLARITE" },
    { label: "Attestation de réussite au BFEM (copie certifiée)", category: "EXAMENS" },
    { label: "Fiche d'orientation (CAOSP)", category: "INSCRIPTION" },
    { label: "Photos d'identité", category: "IDENTITE" },
    { label: "Enveloppes timbrées", category: "AUTRES" },
  ],
};

export const CYCLES_DU_REFERENTIEL = Object.keys(OFFICIAL_REQUIREMENTS) as EducationalCycle[];

/** Nombre total de pièces proposées, tous cycles confondus. */
export const NB_PIECES_OFFICIELLES = Object.values(OFFICIAL_REQUIREMENTS)
  .reduce((n, l) => n + (l?.length ?? 0), 0);
