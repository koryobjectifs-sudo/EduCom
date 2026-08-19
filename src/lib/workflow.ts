import { hasAccess, type RoleType } from "@/lib/permissions";
// `import type` et non `import` : le type seul est effacé à la compilation, donc
// ce fichier ne prend PAS de dépendance runtime sur `audit.ts` — qui importe
// Prisma et rendrait ce module serveur-only (voir l'encadré ci-dessous).
import type { AuditEntity } from "@/lib/audit";

/**
 * Workflows — abstraction générique des cycles de validation.
 *
 * ═══ POURQUOI UNE DÉFINITION DÉCLARATIVE, ET PAS UN ÉTAT DE PLUS ═══
 *
 * Un cycle de validation existe déjà dans le produit : `ReportCard` porte
 * `status` (DRAFT / VALIDATED / SUBMITTED / RETURNED / APPROVED) plus
 * `submittedAt`, `submittedById`, `validatedAt`, `validatedById`,
 * `returnedReason`. Il fonctionne, il est utilisé par l'écran de saisie et par
 * l'espace de validation du secrétariat.
 *
 * **Cette fondation ne le remplace pas.** Elle le *décrit*, pour que les modules
 * à venir (Finance, dossier élève, rapports) n'aient pas à réinventer chacun
 * leurs états, leurs transitions autorisées et leur historique. Le bulletin
 * devient la première machine déclarée, sans changement de schéma ni de
 * comportement.
 *
 * ═══ EXTENSIBLE PAR CONCEPTION ═══
 *
 * Chaque module déclare ses propres états. Le tronc commun n'impose pas une
 * liste fermée : la demande parlait de `draft → submitted → under_review →
 * approved → rejected → completed`, mais le bulletin utilise déjà d'autres noms
 * (`VALIDATED`, `RETURNED`). Forcer un vocabulaire unique aurait exigé de migrer
 * une énumération Prisma en production — destructif, et interdit par le lot.
 *
 * ═══ CE FICHIER NE DOIT JAMAIS IMPORTER PRISMA ═══
 *
 * `availableTransitions()` et `labels` servent à l'affichage : un composant
 * client doit pouvoir les importer pour savoir quels boutons proposer. Une
 * dépendance sur Prisma rendrait ce module serveur-only et casserait cet usage.
 * Toute écriture vit dans `workflowHistory.ts`.
 *
 * ═══ CE QUI N'EST PAS FAIT ICI, VOLONTAIREMENT ═══
 *
 * Aucun workflow Finance ni dossier élève n'est déclaré : le lot 10 pose la
 * mécanique, pas les cas d'usage.
 */

/* ─────────────────────────────── définition ─────────────────────────────── */

/**
 * Une transition autorisée.
 *
 * `requiredPath` est un chemin de l'application, résolu par `hasAccess()`.
 * Volontairement pas une liste de rôles : le lot 06 a établi `hasAccess()` comme
 * seule source de vérité, et le lot 09 a supprimé les deux dernières tables de
 * rôles locales. Déclarer des rôles ici recréerait exactement ce doublon.
 */
export type Transition<S extends string> = {
  from: S;
  to: S;
  /** Libellé de l'action, du point de vue de l'utilisateur. */
  label: string;
  /** Chemin dont l'accès conditionne la transition. */
  requiredPath: string;
  /** Un commentaire est-il obligatoire ? Un refus doit s'expliquer. */
  commentRequired?: boolean;
};

export type WorkflowDefinition<S extends string> = {
  /** Identifiant stable, écrit en base dans l'historique. */
  name: string;
  /**
   * Type d'objet concerné (`reportCard`, plus tard `expense`, `studentFile`…).
   *
   * Typé `AuditEntity` et non `string` : chaque transition écrit une ligne
   * d'audit, donc un workflow ne peut porter que sur un objet déjà auditable.
   * Déclarer un nouveau workflow force à déclarer son type dans `audit.ts`.
   */
  entity: AuditEntity;
  initial: S;
  /** États depuis lesquels aucune transition n'est possible. */
  terminal: readonly S[];
  states: readonly S[];
  transitions: readonly Transition<S>[];
  /** Libellés français des états, pour l'affichage. */
  labels: Record<S, string>;
};

/* ────────────────────────── première machine : bulletin ────────────────────── */

export type ReportCardState = "DRAFT" | "VALIDATED" | "SUBMITTED" | "RETURNED" | "APPROVED";

/**
 * Le cycle du bulletin, tel qu'il existe DÉJÀ en base.
 *
 * ⚠️ Les noms d'états reproduisent exactement `ReportCardStatus` du schéma
 * Prisma. Ne pas les renommer : `status.ts` les traduit déjà, l'écran de saisie
 * et l'espace de validation les comparent, et des bulletins réels les portent.
 *
 * Chemins de permission repris de l'existant : la saisie appartient à
 * `/dashboard/grades`, la relecture à `/dashboard/documents/validation` — ce
 * second chemin est refusé à `TEACHER` par `ROLE_DENIALS`, ce qui empêche un
 * enseignant d'approuver son propre travail.
 */
export const reportCardWorkflow: WorkflowDefinition<ReportCardState> = {
  name: "reportCard",
  entity: "reportCard",
  initial: "DRAFT",
  terminal: ["APPROVED"],
  states: ["DRAFT", "VALIDATED", "SUBMITTED", "RETURNED", "APPROVED"],
  labels: {
    DRAFT: "Saisie en cours",
    VALIDATED: "Validé par l'enseignant",
    SUBMITTED: "Déposé au secrétariat",
    RETURNED: "Renvoyé pour correction",
    APPROVED: "Approuvé",
  },
  transitions: [
    { from: "DRAFT",     to: "VALIDATED", label: "Valider la saisie",        requiredPath: "/dashboard/grades" },
    { from: "VALIDATED", to: "DRAFT",     label: "Rouvrir pour correction",  requiredPath: "/dashboard/grades" },
    { from: "VALIDATED", to: "SUBMITTED", label: "Déposer au secrétariat",   requiredPath: "/dashboard/grades" },
    { from: "SUBMITTED", to: "APPROVED",  label: "Approuver",                requiredPath: "/dashboard/documents/validation" },
    { from: "SUBMITTED", to: "RETURNED",  label: "Renvoyer pour correction", requiredPath: "/dashboard/documents/validation", commentRequired: true },
    { from: "RETURNED",  to: "DRAFT",     label: "Reprendre la saisie",      requiredPath: "/dashboard/grades" },
  ],
};

/* ──────────────────── machines financières (lot 11) ──────────────────── */

/**
 * États du circuit financier — dépense et état financier.
 *
 * Reproduisent exactement l'énumération Prisma `FinanceWorkflowStatus`. Ne pas
 * les renommer sans migrer le schéma.
 */
export type FinanceState = "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "CANCELLED";

/**
 * Fabrique une machine du circuit financier.
 *
 * ═══ POURQUOI UNE FABRIQUE, ET PAS DEUX DÉFINITIONS COPIÉES ═══
 *
 * La dépense et l'état financier suivent le **même** circuit ; seuls le nom, le
 * type d'objet, les deux chemins de permission et les libellés changent. Deux
 * définitions recopiées auraient divergé au premier ajustement — et une divergence
 * silencieuse entre deux circuits de validation est précisément le genre de bug
 * qu'on ne voit qu'en production.
 *
 * ═══ DEUX CHEMINS, DONC SÉPARATION DES POUVOIRS ═══
 *
 * `preparePath` porte la préparation, `reviewPath` la décision. Les rôles ne sont
 * pas cités ici : `hasAccess()` en décide, et `ROLE_DENIALS` refuse `reviewPath`
 * au comptable. Résultat, celui qui prépare ne peut pas approuver — sans qu'aucune
 * règle de rôle ne soit écrite dans ce fichier.
 *
 * ⚠️ `SUBMITTED → CANCELLED` n'existe volontairement PAS. Une pièce transmise est
 * entre les mains de la direction : le préparateur ne peut pas la retirer de la
 * revue. Il attend qu'elle lui revienne (`RETURNED`), et peut alors l'abandonner.
 */
function financeWorkflow(o: {
  name: string;
  entity: AuditEntity;
  preparePath: string;
  reviewPath: string;
  labels: Record<FinanceState, string>;
  submitLabel: string;
  resubmitLabel: string;
  approveLabel: string;
  returnLabel: string;
  cancelLabel: string;
}): WorkflowDefinition<FinanceState> {
  return {
    name: o.name,
    entity: o.entity,
    initial: "DRAFT",
    terminal: ["APPROVED", "CANCELLED"],
    states: ["DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "CANCELLED"],
    labels: o.labels,
    transitions: [
      { from: "DRAFT",     to: "SUBMITTED", label: o.submitLabel,   requiredPath: o.preparePath },
      { from: "DRAFT",     to: "CANCELLED", label: o.cancelLabel,   requiredPath: o.preparePath },
      { from: "SUBMITTED", to: "APPROVED",  label: o.approveLabel,  requiredPath: o.reviewPath },
      { from: "SUBMITTED", to: "RETURNED",  label: o.returnLabel,   requiredPath: o.reviewPath, commentRequired: true },
      { from: "RETURNED",  to: "SUBMITTED", label: o.resubmitLabel, requiredPath: o.preparePath },
      { from: "RETURNED",  to: "CANCELLED", label: o.cancelLabel,   requiredPath: o.preparePath },
    ],
  };
}

/** Chemin de décision, commun aux deux machines : le bureau de la direction. */
export const FINANCE_REVIEW_PATH = "/dashboard/payments/review";

export const expenseWorkflow = financeWorkflow({
  name: "expense",
  entity: "expense",
  preparePath: "/dashboard/payments/expenses",
  reviewPath: FINANCE_REVIEW_PATH,
  labels: {
    DRAFT: "Brouillon",
    SUBMITTED: "Transmise à la direction",
    RETURNED: "Renvoyée pour correction",
    APPROVED: "Approuvée",
    CANCELLED: "Annulée",
  },
  submitLabel: "Transmettre à la direction",
  resubmitLabel: "Transmettre de nouveau",
  approveLabel: "Approuver la dépense",
  returnLabel: "Renvoyer pour correction",
  cancelLabel: "Annuler la dépense",
});

export const financialStatementWorkflow = financeWorkflow({
  name: "financialStatement",
  entity: "financialStatement",
  preparePath: "/dashboard/payments/statement",
  reviewPath: FINANCE_REVIEW_PATH,
  labels: {
    DRAFT: "En préparation",
    SUBMITTED: "Transmis à la direction",
    RETURNED: "Renvoyé pour correction",
    APPROVED: "Approuvé",
    CANCELLED: "Abandonné",
  },
  submitLabel: "Soumettre l'état",
  resubmitLabel: "Soumettre de nouveau",
  approveLabel: "Approuver l'état",
  returnLabel: "Renvoyer au gestionnaire",
  cancelLabel: "Abandonner l'état",
});

/**
 * Chemin de décision du référentiel tarifaire : le bureau de la direction.
 *
 * ⚠️ `/dashboard/settings` n'est listé par AUCUN rôle dans `ROLE_PERMISSIONS` :
 * seuls OWNER et ADMIN l'atteignent, via `"*"`. C'est précisément ce qui fait
 * de la direction la source de vérité des tarifs, **sans qu'aucun rôle ne soit
 * cité ici** ni qu'une seconde matrice de permissions existe.
 */
export const FEE_REVIEW_PATH = "/dashboard/settings";

/**
 * Demande de modification tarifaire — lot 12.1.
 *
 * Le gestionnaire prépare depuis l'atelier financier ; la direction tranche
 * depuis les réglages. La fabrique `financeWorkflow` est réutilisée telle
 * quelle : le circuit est le même que celui d'une dépense, seuls les deux
 * chemins et les libellés changent.
 *
 * ⚠️ Conséquence voulue de `reviewPath` : un ACCOUNTANT ne peut pas approuver
 * sa propre demande, puisqu'il n'a pas `/dashboard/settings`. La grille
 * officielle ne peut donc pas être modifiée silencieusement par le gestionnaire.
 */
export const feeChangeWorkflow = financeWorkflow({
  name: "feeChangeRequest",
  entity: "feeChangeRequest",
  preparePath: "/dashboard/payments",
  reviewPath: FEE_REVIEW_PATH,
  labels: {
    DRAFT: "Brouillon",
    SUBMITTED: "Transmise à la direction",
    RETURNED: "Renvoyée pour précision",
    APPROVED: "Acceptée — grille modifiée",
    CANCELLED: "Retirée",
  },
  submitLabel: "Demander la modification",
  resubmitLabel: "Redemander",
  approveLabel: "Accepter et modifier la grille",
  returnLabel: "Refuser et renvoyer",
  cancelLabel: "Retirer la demande",
});

/* ──────────────── centre documentaire (lot 15) ──────────────── */

export type SchoolDocState = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

/**
 * Cycle de vie d'un document officiel de l'établissement.
 *
 * ⚠️ **Aucun moteur parallèle.** Ce n'est qu'une définition de plus dans le
 * registre existant : `canTransition()`, `authorizeTransition()` et l'écriture
 * dans `WorkflowTransition` fonctionnent sans une ligne de code nouvelle.
 *
 * ⚠️ **Deux chemins, deux autorités.** Préparer un document (brouillon,
 * soumission à relecture) relève du centre documentaire, ouvert au
 * secrétariat ; **publier, dépublier et archiver** exigent le chemin de
 * gestion, réservé à la direction. C'est le §11 exprimé là où toutes les autres
 * séparations de pouvoir de ce dépôt le sont : dans un chemin, pas dans une
 * liste de rôles.
 *
 * ⚠️ `ARCHIVED` n'est **pas** terminal. Un règlement archivé par erreur doit
 * pouvoir revenir en circulation ; le rendre définitif obligerait à recréer le
 * document, donc à casser sa lignée de versions et son historique.
 */
export const schoolDocumentWorkflow: WorkflowDefinition<SchoolDocState> = {
  name: "schoolDocument",
  entity: "schoolDocument",
  initial: "DRAFT",
  terminal: [],
  states: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"],
  labels: {
    DRAFT: "Brouillon",
    REVIEW: "À valider",
    PUBLISHED: "Publié",
    ARCHIVED: "Archivé",
  },
  transitions: [
    { from: "DRAFT",     to: "REVIEW",    label: "Soumettre à validation", requiredPath: "/dashboard/documents/centre" },
    { from: "REVIEW",    to: "DRAFT",     label: "Renvoyer au brouillon",  requiredPath: "/dashboard/documents/centre", commentRequired: true },
    { from: "DRAFT",     to: "PUBLISHED", label: "Publier",                requiredPath: "/dashboard/documents/centre/gestion" },
    { from: "REVIEW",    to: "PUBLISHED", label: "Valider et publier",     requiredPath: "/dashboard/documents/centre/gestion" },
    { from: "PUBLISHED", to: "DRAFT",     label: "Dépublier",              requiredPath: "/dashboard/documents/centre/gestion", commentRequired: true },
    { from: "PUBLISHED", to: "ARCHIVED",  label: "Archiver",               requiredPath: "/dashboard/documents/centre/gestion" },
    { from: "ARCHIVED",  to: "PUBLISHED", label: "Remettre en circulation", requiredPath: "/dashboard/documents/centre/gestion" },
  ],
};

/** Registre des machines déclarées. Les modules à venir s'y ajoutent. */
export const WORKFLOWS = {
  reportCard: reportCardWorkflow,
  schoolDocument: schoolDocumentWorkflow,
  expense: expenseWorkflow,
  financialStatement: financialStatementWorkflow,
  feeChangeRequest: feeChangeWorkflow,
} as const;

/* ──────────────────────────────── moteur ──────────────────────────────── */

export type TransitionCheck<S extends string> =
  | { allowed: true; transition: Transition<S> }
  | { allowed: false; reason: string };

/**
 * La transition est-elle possible pour ce rôle ?
 *
 * Trois refus distincts, chacun avec son message : état terminal, transition
 * inexistante, droit manquant. Un appelant doit pouvoir dire *pourquoi* une
 * action est indisponible plutôt que de la masquer sans explication.
 */
export function canTransition<S extends string>(
  wf: WorkflowDefinition<S>,
  from: S,
  to: S,
  role: RoleType | string,
): TransitionCheck<S> {
  if (wf.terminal.includes(from)) {
    return { allowed: false, reason: `L'état « ${wf.labels[from] ?? from} » est définitif.` };
  }

  const transition = wf.transitions.find((t) => t.from === from && t.to === to);
  if (!transition) {
    return {
      allowed: false,
      reason: `Aucun passage prévu de « ${wf.labels[from] ?? from} » à « ${wf.labels[to] ?? to} ».`,
    };
  }

  if (!hasAccess(role, transition.requiredPath)) {
    return { allowed: false, reason: "Vous n'avez pas les droits pour cette action." };
  }

  return { allowed: true, transition };
}

/** Transitions réellement proposables depuis un état, pour un rôle donné. */
export function availableTransitions<S extends string>(
  wf: WorkflowDefinition<S>,
  from: S,
  role: RoleType | string,
): Transition<S>[] {
  if (wf.terminal.includes(from)) return [];
  return wf.transitions.filter((t) => t.from === from && hasAccess(role, t.requiredPath));
}

/**
 * Contrôles de cohérence d'une définition.
 *
 * Exécuté par le vérificateur, pas au runtime : une machine mal déclarée est une
 * erreur de développement, pas une condition d'exécution.
 */
export function validateDefinition<S extends string>(wf: WorkflowDefinition<S>): string[] {
  const errors: string[] = [];
  const known = new Set<string>(wf.states);

  if (!known.has(wf.initial)) errors.push(`état initial « ${wf.initial} » absent de states`);
  for (const t of wf.terminal) {
    if (!known.has(t)) errors.push(`état terminal « ${t} » absent de states`);
  }
  for (const s of wf.states) {
    if (!wf.labels[s]) errors.push(`état « ${s} » sans libellé`);
  }
  for (const t of wf.transitions) {
    if (!known.has(t.from)) errors.push(`transition depuis un état inconnu « ${t.from} »`);
    if (!known.has(t.to)) errors.push(`transition vers un état inconnu « ${t.to} »`);
    if (t.from === t.to) errors.push(`transition « ${t.from} » vers lui-même`);
    if (wf.terminal.includes(t.from)) errors.push(`transition au départ de l'état terminal « ${t.from} »`);
  }
  // Tout état non initial doit être atteignable, sinon il est décoratif.
  for (const s of wf.states) {
    if (s === wf.initial) continue;
    if (!wf.transitions.some((t) => t.to === s)) errors.push(`état « ${s} » inatteignable`);
  }
  return errors;
}
