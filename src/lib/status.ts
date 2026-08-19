/**
 * Vocabulaire d'état d'EduCom — source unique de vérité.
 *
 * Avant ce fichier, **quinze fichiers traduisaient un statut chacun de son
 * côté**, avec des couleurs et des libellés qui divergeaient : un « payé »
 * n'avait pas le même vert selon l'écran, et le repli universel
 * `status.toLowerCase()` affichait l'énumération brute en anglais dès qu'un
 * statut n'était pas explicitement prévu — un `PARTIAL` se lisait « partial »,
 * un `CANCELLED` « cancelled ».
 *
 * ═══ POURQUOI UNE TABLE CLOISONNÉE PAR DOMAINE ═══
 *
 * Une table plate serait fausse. Les énumérations partagent des noms qui n'ont
 * pas le même sens :
 *
 *   - `DRAFT` vaut « Brouillon » pour une facture, mais « Saisie en cours »
 *     pour un bulletin — ce n'est pas le même objet ni la même action attendue.
 *   - `PENDING` vaut « En attente de validation » pour une admission et
 *     « En attente de paiement » pour une facture.
 *
 * D'où `describeStatus(domain, value)` plutôt qu'un dictionnaire unique :
 * le domaine lève l'ambiguïté, et le compilateur refuse un statut qui
 * n'appartient pas au domaine invoqué.
 *
 * ═══ LA COULEUR NE PORTE JAMAIS L'INFORMATION SEULE ═══
 *
 * Chaque descripteur porte un `label` obligatoire. `Badge` refuse de rendre une
 * pastille sans texte. Un utilisateur daltonien, une impression en noir et
 * blanc ou un lecteur d'écran doivent tous obtenir l'état — la couleur ne fait
 * que le renforcer.
 */

/** Charge visuelle d'un état. Correspond aux tokens sémantiques du socle. */
export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

/** Objet métier auquel le statut se rapporte. */
export type StatusDomain =
  | "student" | "invoice" | "reportCard" | "message"
  | "expense" | "financialStatement"
  // Lot 13 — pièce du dossier numérique élève.
  | "studentDocument"
  // Lot 15 — document officiel de l'établissement.
  | "schoolDocument";

export type StatusDescriptor = {
  /** Libellé français affiché. Porte l'information à lui seul. */
  label: string;
  variant: StatusVariant;
  /** Précision facultative, pour une infobulle ou un attribut `title`. */
  hint?: string;
};

/* ─────────────────────────── StudentStatus ─────────────────────────── */
const STUDENT = {
  PENDING:   { label: "En attente", variant: "warning", hint: "Admission à valider" },
  ENROLLED:  { label: "Inscrit",    variant: "success" },
  GRADUATED: { label: "Diplômé",    variant: "info",    hint: "A terminé son cursus" },
  INACTIVE:  { label: "Inactif",    variant: "neutral", hint: "N'est plus scolarisé" },
} as const satisfies Record<string, StatusDescriptor>;

/* ─────────────────────────── InvoiceStatus ─────────────────────────── */
const INVOICE = {
  DRAFT:     { label: "Brouillon",  variant: "neutral", hint: "Non encore émise" },
  PENDING:   { label: "En attente", variant: "warning", hint: "Émise, pas encore réglée" },
  PARTIAL:   { label: "Partiel",    variant: "warning", hint: "Partiellement réglée" },
  PAID:      { label: "Payée",      variant: "success" },
  OVERDUE:   { label: "En retard",  variant: "danger",  hint: "Échéance dépassée" },
  CANCELLED: { label: "Annulée",    variant: "neutral" },
} as const satisfies Record<string, StatusDescriptor>;

/* ────────────────────────── ReportCardStatus ────────────────────────── */
const REPORT_CARD = {
  DRAFT:     { label: "Saisie en cours", variant: "neutral", hint: "Modifiable" },
  VALIDATED: { label: "Validé",          variant: "info",    hint: "Verrouillé par l'enseignant" },
  SUBMITTED: { label: "Déposé",          variant: "info",    hint: "Transmis au secrétariat" },
  RETURNED:  { label: "À corriger",      variant: "warning", hint: "Renvoyé par le secrétariat" },
  APPROVED:  { label: "Approuvé",        variant: "success", hint: "Vérifié, imprimable" },

  /**
   * ⚠️ `PRINTED` n'existe PAS dans `ReportCardStatus`.
   *
   * L'état figurait dans l'esquisse initiale de la phase 2 (`DRAFT →
   * SUBMITTED → VALIDATED → PRINTED`), mais le schéma finalement poussé en
   * base nomme le dernier état `APPROVED`. L'entrée est conservée ici par
   * précaution : si un jour une donnée porte `PRINTED`, elle s'affichera en
   * français au lieu de « printed ». Aucun code ne le produit aujourd'hui.
   */
  PRINTED:   { label: "Imprimé",         variant: "success" },
} as const satisfies Record<string, StatusDescriptor>;

/* ─────────────────────────── MessageStatus ─────────────────────────── */
const MESSAGE = {
  SENT:      { label: "Envoyé",  variant: "info" },
  DELIVERED: { label: "Reçu",    variant: "success" },
  READ:      { label: "Lu",      variant: "success" },
  FAILED:    { label: "Échec",   variant: "danger", hint: "Le message n'a pas pu être remis" },
} as const satisfies Record<string, StatusDescriptor>;

/* ──────────────── FinanceWorkflowStatus — deux lectures ──────────────── */

/**
 * Dépense et état financier partagent l'énumération Prisma
 * `FinanceWorkflowStatus`, mais **pas les libellés**.
 *
 * C'est exactement la raison d'être du cloisonnement par domaine : une dépense
 * est « Approuvée » et un état « Approuvé », et surtout `SUBMITTED` ne dit pas la
 * même chose — la dépense est *transmise pour validation*, l'état est *chez la
 * direction*. Une table plate aurait imposé un compromis faux aux deux.
 */
const EXPENSE = {
  DRAFT:     { label: "Brouillon",  variant: "neutral", hint: "Pas encore transmise — modifiable" },
  SUBMITTED: { label: "Transmise",  variant: "info",    hint: "En attente de la direction — verrouillée" },
  RETURNED:  { label: "À corriger", variant: "warning", hint: "Renvoyée par la direction avec un motif" },
  APPROVED:  { label: "Approuvée",  variant: "success", hint: "Validée — comptée dans les dépenses de la période" },
  CANCELLED: { label: "Annulée",    variant: "neutral", hint: "Abandonnée, jamais comptée" },
} as const satisfies Record<string, StatusDescriptor>;

const FINANCIAL_STATEMENT = {
  DRAFT:     { label: "En préparation", variant: "neutral", hint: "Chiffres calculés en direct" },
  SUBMITTED: { label: "Transmis",       variant: "info",    hint: "Chez la direction — chiffres arrêtés" },
  RETURNED:  { label: "Renvoyé",        variant: "warning", hint: "La direction demande une correction" },
  APPROVED:  { label: "Approuvé",       variant: "success", hint: "Validé par la direction" },
  CANCELLED: { label: "Abandonné",      variant: "neutral", hint: "La période est de nouveau libre" },
} as const satisfies Record<string, StatusDescriptor>;

/* ───────────────────── StudentDocStatus (lot 13) ───────────────────── */

/**
 * ⚠️ `MISSING` n'est jamais écrit en base : une pièce manquante n'a pas de
 * ligne. Le statut existe parce que la checklist raisonne sur l'absence, qui
 * est un état à part entière du dossier.
 */
const STUDENT_DOCUMENT = {
  MISSING:   { label: "Manquant",    variant: "danger",  hint: "Aucune pièce reçue pour cette exigence" },
  RECEIVED:  { label: "Reçu",        variant: "info",    hint: "Déposé, pas encore examiné" },
  TO_VERIFY: { label: "À vérifier",  variant: "warning", hint: "En attente de contrôle par le secrétariat" },
  VALIDATED: { label: "Validé",      variant: "success", hint: "Contrôlé et accepté" },
  REJECTED:  { label: "Rejeté",      variant: "danger",  hint: "Refusé — un motif est enregistré" },
  EXPIRED:   { label: "Expiré",      variant: "warning", hint: "Hors de sa durée de validité" },
} as const satisfies Record<string, StatusDescriptor>;

/**
 * États d'un document officiel (lot 15).
 *
 * ⚠️ `PUBLISHED` est le seul état qui rend un document visible hors de la
 * direction. Les indices le disent : un brouillon n'est pas « en attente », il
 * n'existe pas encore pour les familles.
 */
const SCHOOL_DOCUMENT = {
  DRAFT:     { label: "Brouillon", variant: "neutral", hint: "Visible de la direction seule — pas encore un document officiel" },
  REVIEW:    { label: "À valider", variant: "warning", hint: "Relecture en cours avant publication" },
  PUBLISHED: { label: "Publié",    variant: "success", hint: "Document officiel, visible selon sa portée" },
  ARCHIVED:  { label: "Archivé",   variant: "neutral", hint: "Retiré de la circulation, conservé pour l'historique" },
} as const satisfies Record<string, StatusDescriptor>;

export const STATUS = {
  student: STUDENT,
  studentDocument: STUDENT_DOCUMENT,
  schoolDocument: SCHOOL_DOCUMENT,
  invoice: INVOICE,
  reportCard: REPORT_CARD,
  message: MESSAGE,
  expense: EXPENSE,
  financialStatement: FINANCIAL_STATEMENT,
} as const;

/** Statuts admis pour un domaine donné. */
export type StatusOf<D extends StatusDomain> = keyof (typeof STATUS)[D] & string;

/**
 * Décrit un statut : libellé français et charge visuelle.
 *
 * Accepte volontairement une `string` en plus des valeurs connues : les statuts
 * arrivent de la base et un schéma peut gagner une valeur avant que ce fichier
 * ne la connaisse. Dans ce cas, **le libellé est la valeur brute** — l'état
 * reste lisible et rien ne disparaît de l'écran, ce qui vaut mieux qu'une
 * pastille vide ou qu'une exception en production.
 */
export function describeStatus(domain: StatusDomain, value: string | null | undefined): StatusDescriptor {
  if (!value) return { label: "—", variant: "neutral" };
  const table = STATUS[domain] as Record<string, StatusDescriptor>;
  return table[value] ?? { label: value, variant: "neutral" };
}

/** Libellé français seul, pour un contexte qui n'accepte pas de composant. */
export function statusLabel(domain: StatusDomain, value: string | null | undefined): string {
  return describeStatus(domain, value).label;
}
