import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import {
  periodFilter, dayPeriod, weekPeriod, monthPeriod, termPeriod, customPeriod, type Period,
} from "@/lib/period";
import type { ExpenseCategory, FinanceWorkflowStatus } from "@/generated/prisma/enums";

/**
 * Agrégations financières — la seule source des chiffres de l'atelier.
 *
 * ═══ TOUT EST PARTITIONNÉ PAR ÉTABLISSEMENT, SANS EXCEPTION ═══
 *
 * Chaque fonction exige un `ActorContext` (résolu par `requireActionContext()` ou
 * `requireSchoolContext()`) et injecte `actor.schoolId` elle-même. **Aucune
 * signature n'accepte de `schoolId`**, donc aucun appelant ne peut en fournir un
 * venu du client — c'est la règle posée au lot 01 et reprise au lot 10.
 *
 * Un agrégat sans `schoolId` est plus dangereux qu'une liste sans `schoolId` :
 * une liste laisse voir des noms inconnus, un total se lit comme le sien. Quatre
 * fuites d'isolation ont été trouvées dans ce projet, dont une où
 * `schoolId: dbUser?.schoolId` valait `undefined` et Prisma ignorait donc le
 * filtre en silence. Ici le type interdit `undefined`.
 *
 * ═══ CE QUE LES DONNÉES EXISTANTES PERMETTENT — ET CE QU'ELLES NE PERMETTENT PAS ═══
 *
 * ⚠️ **`Payment` n'a pas de date d'encaissement.** Seul `createdAt`. Un versement
 * reçu hier et saisi aujourd'hui est daté d'aujourd'hui. Les recettes d'une
 * période sont donc les paiements *saisis* dans la période. Ajouter une colonne
 * de date de valeur toucherait la facturation existante, hors périmètre du lot 11.
 *
 * ⚠️ **`InvoiceStatus.OVERDUE` n'est écrit par AUCUN code.** Aucune tâche
 * planifiée ne fait basculer une facture échue. Une créance calculée sur
 * `status: "OVERDUE"` vaudrait donc 0 en permanence — c'est déjà le cas de
 * `documents/reminder`. Le retard est ici **dérivé de `dueDate`**, comme le fait
 * déjà la liste des factures à l'affichage.
 *
 * ⚠️ **Les recettes se comptent sur `Payment`, pas sur `Invoice`.** Mesuré au
 * moment du lot : `SUM(Invoice.totalAmount)` des factures `PAID` valait 196 866
 * FCFA quand `SUM(Payment.amount)` valait 306 866. L'écran Paiements affichait le
 * premier chiffre sous le libellé « Total encaissé ». L'argent réellement
 * enregistré est le second.
 */

/* ─────────────────────────────── catégories ─────────────────────────────── */

/**
 * Libellés des postes de dépense — **donnée**, pas texte dispersé dans les vues.
 *
 * Un seul endroit à modifier pour renommer un poste ou en ajouter un. L'ordre de
 * ce tableau est l'ordre d'affichage des menus et des regroupements : les postes
 * les plus fréquents d'abord, `OTHER` en dernier.
 */
export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; hint: string }> = {
  SALARY:      { label: "Salaires",     hint: "Rémunérations et charges du personnel" },
  RENT:        { label: "Loyer",        hint: "Loyer et charges locatives" },
  UTILITIES:   { label: "Charges",      hint: "Eau, électricité, internet, téléphone" },
  SUPPLIES:    { label: "Fournitures",  hint: "Fournitures scolaires et de bureau" },
  MAINTENANCE: { label: "Entretien",    hint: "Réparations, travaux, ménage" },
  TRANSPORT:   { label: "Transport",    hint: "Carburant, déplacements, transport scolaire" },
  EQUIPMENT:   { label: "Équipement",   hint: "Mobilier, matériel, informatique" },
  OTHER:       { label: "Autre",        hint: "À préciser dans la note" },
};

/** Ordre d'affichage stable, dérivé de la table ci-dessus. */
export const EXPENSE_CATEGORY_ORDER = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[];

export function expenseCategoryLabel(c: ExpenseCategory | string): string {
  return EXPENSE_CATEGORIES[c as ExpenseCategory]?.label ?? c;
}

/** Modes de paiement, pour la répartition des recettes. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
};

/**
 * Statuts de facture considérés comme **non soldés**.
 *
 * `DRAFT` est exclu : une facture non émise n'est pas une créance. `CANCELLED`
 * aussi, évidemment. `OVERDUE` figure dans la liste par correction, même si rien
 * ne l'écrit aujourd'hui — le jour où une tâche le fera, ce calcul suivra.
 */
const UNSETTLED_INVOICE: string[] = ["PENDING", "PARTIAL", "OVERDUE"];

/** Seul statut de dépense qui compte dans un total de dépenses. */
const COUNTED_EXPENSE: FinanceWorkflowStatus = "APPROVED";

/* ═══════════════ portée des factures : le cas du parent ═══════════════ */

/**
 * Restriction de visibilité des factures, dérivée du rôle et de la session.
 *
 * ═══ LA FUITE CORRIGÉE (lot 11.1) ═══
 *
 * `payments/page.tsx` listait `where: { schoolId }` sans plus. Or `PARENT` a
 * accès à `/dashboard/payments` : chaque parent voyait donc les factures de
 * **toutes les familles** de l'école, montants et échéances compris, ainsi que
 * les totaux financiers de l'établissement.
 *
 * ═══ DEUX CHEMINS MÈNENT D'UN PARENT À UNE FACTURE ═══
 *
 * Le schéma en porte deux, et il faut les deux :
 *
 *   1. direct   — `Invoice.parentId → User`
 *   2. indirect — `Invoice.studentId → Student.parentId → User`
 *
 * ⚠️ Mesuré en base au moment du correctif : **0 facture sur 6** utilise le lien
 * direct, 4 passent par l'élève. Ne traiter que `Invoice.parentId` aurait donc
 * produit une liste vide pour tout le monde — un correctif qui « marche » en
 * apparence tout en cachant les vraies factures du parent.
 *
 * ⚠️ **2 factures sur 6 n'ont AUCUN rattachement parent** (pas d'élève, ou un
 * élève sans parent). Le `OR` ci-dessous ne les fait correspondre à personne :
 * elles restent invisibles à tous les parents. C'est le bon comportement — une
 * facture non rattachée n'appartient à aucune famille.
 *
 * ═══ L'IDENTITÉ VIENT DE LA SESSION, JAMAIS DE L'APPELANT ═══
 *
 * `actor.userId` est résolu par `requireActionContext()` / `requireSchoolContext()`.
 * Aucun `parentId` d'argument n'entre ici : la signature n'en accepte pas.
 * `schoolId` reste appliqué **en premier**, la restriction parent s'y ajoute.
 */
export function invoiceScope(actor: ActorContext) {
  const base = { schoolId: actor.schoolId };
  if (actor.role !== "PARENT") return base;
  return {
    ...base,
    OR: [
      { parentId: actor.userId },
      { student: { parentId: actor.userId } },
    ],
  };
}

/* ═══════════════ « encaissé » — définition unique ═══════════════ */

/**
 * ═══ CE QU'« ENCAISSÉ » VEUT DIRE DANS EDUCOM ═══
 *
 * **La somme des lignes `Payment` rattachées aux factures concernées.**
 *
 * Deux précisions que le schéma impose :
 *
 * 1. **`Payment` n'a AUCUNE colonne de statut** — vérifié : `amount`, `method`,
 *    `reference`, `invoiceId`, `schoolId`, `createdAt`. Il n'existe donc pas de
 *    « paiement PAID » : l'existence de la ligne EST l'encaissement. Filtrer sur
 *    un statut de paiement serait impossible.
 *
 * 2. **`Invoice.totalAmount` n'est pas un registre d'argent.** C'est la cause
 *    exacte de l'écart signalé au lot 11 : deux factures portent `totalAmount = 0`
 *    alors qu'elles ont reçu 70 000 et 40 000 FCFA — soit très précisément les
 *    110 000 FCFA d'écart entre 196 866 et 306 866. La colonne a `@default(0)` et
 *    rien ne la recalcule quand un paiement arrive.
 *
 * ⚠️ **Ne jamais additionner `Invoice.totalAmount` pour dire « encaissé ».**
 * C'est ce que faisait la carte de l'écran Paiements.
 *
 * ⚠️ La date d'un encaissement est `Payment.createdAt` : le modèle n'a pas de
 * date de valeur (voir l'encadré en tête de fichier).
 *
 * Cette fonction est la SEULE définition. L'écran Paiements et l'état financier
 * l'appellent tous les deux — il ne peut plus y avoir deux chiffres.
 */
export async function collectedByMethod(
  actor: ActorContext,
  opts: { period?: Period; invoiceIds?: string[] } = {},
): Promise<MethodTotal[]> {
  const rows = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      schoolId: actor.schoolId,
      ...(opts.period ? periodFilter(opts.period, "createdAt") : {}),
      // Restriction de portée (parent). `undefined` = aucune restriction ; on ne
      // passe JAMAIS un tableau vide sans le vouloir, d'où le test explicite.
      ...(opts.invoiceIds ? { invoiceId: { in: opts.invoiceIds } } : {}),
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return rows
    .map((p) => ({
      method: String(p.method),
      label: PAYMENT_METHOD_LABELS[String(p.method)] ?? String(p.method),
      amount: p._sum.amount ?? 0,
      count: p._count._all,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* ───────────────────────────── instantané ───────────────────────────── */

export type CategoryTotal = { category: ExpenseCategory; label: string; amount: number; count: number };
export type MethodTotal = { method: string; label: string; amount: number; count: number };

export type FinanceSnapshot = {
  /** Encaissements réellement enregistrés sur la période — SUM(Payment.amount). */
  collected: number;
  collectedCount: number;
  byMethod: MethodTotal[];

  /** Dépenses APPROUVÉES de la période. Le seul total qui entre dans le solde. */
  expenseApproved: number;
  expenseApprovedCount: number;
  /** Transmises, en attente de décision. Comptées à part : rien n'est encore acté. */
  expenseSubmitted: number;
  expenseSubmittedCount: number;
  /** Brouillons et renvoyées : encore chez le gestionnaire. */
  expenseOpen: number;
  expenseOpenCount: number;
  byCategory: CategoryTotal[];

  /** Créances dont l'échéance tombe dans la période, montant restant dû. */
  receivable: number;
  receivableCount: number;
  /** Créances échues à ce jour, toutes périodes — dérivé de `dueDate`, pas du statut. */
  overdue: number;
  overdueCount: number;
  /** Total non soldé, sans borne de date. Ce que l'école attend en tout. */
  receivableAll: number;

  /** Encaissé − dépenses approuvées. Rien d'autre. */
  balance: number;
};

/**
 * Calcule l'instantané financier d'une période.
 *
 * Cinq requêtes, toutes filtrées `schoolId` + période + statut **avant**
 * l'agrégation : rien n'est ramené en mémoire pour être totalisé ensuite, et
 * rien n'est envoyé au client pour y être additionné.
 *
 * Seule exception documentée : les créances demandent le reste réellement dû,
 * donc `totalAmount` moins les versements déjà reçus. Prisma ne sait pas
 * exprimer cette soustraction en un agrégat unique, d'où deux requêtes — l'une
 * sur les factures non soldées (colonnes restreintes par `select`), l'autre
 * groupée sur leurs paiements. Le calcul reste **côté serveur**.
 */
export async function financeSnapshot(actor: ActorContext, period: Period): Promise<FinanceSnapshot> {
  const school = { schoolId: actor.schoolId };

  // 1. Recettes — via la définition unique, partagée avec l'écran Paiements.
  //    Aucune agrégation de paiement n'est réécrite ici : c'était exactement le
  //    genre de doublon qui a produit deux « totaux encaissés » différents.
  const byMethod = await collectedByMethod(actor, { period });
  const collected = byMethod.reduce((s, m) => s + m.amount, 0);
  const collectedCount = byMethod.reduce((s, m) => s + m.count, 0);

  // 2. Dépenses — regroupées par statut ET par poste en une seule requête.
  const expenses = await prisma.expense.groupBy({
    by: ["status", "category"],
    where: { ...school, ...periodFilter(period, "spentAt") },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const sumWhere = (pred: (s: FinanceWorkflowStatus) => boolean) =>
    expenses
      .filter((e) => pred(e.status))
      .reduce((acc, e) => ({ amount: acc.amount + (e._sum.amount ?? 0), count: acc.count + e._count._all }),
        { amount: 0, count: 0 });

  const approved = sumWhere((s) => s === COUNTED_EXPENSE);
  const submitted = sumWhere((s) => s === "SUBMITTED");
  const open = sumWhere((s) => s === "DRAFT" || s === "RETURNED");

  // Le regroupement par poste ne porte que sur l'APPROUVÉ : mêler des dépenses
  // non validées à une répartition la rendrait trompeuse.
  const byCategory: CategoryTotal[] = EXPENSE_CATEGORY_ORDER
    .map((category) => {
      const rows = expenses.filter((e) => e.category === category && e.status === COUNTED_EXPENSE);
      return {
        category,
        label: expenseCategoryLabel(category),
        amount: rows.reduce((s, r) => s + (r._sum.amount ?? 0), 0),
        count: rows.reduce((s, r) => s + r._count._all, 0),
      };
    })
    .filter((c) => c.count > 0);

  // 3. Créances — reste réellement dû, pas le montant facturé.
  const unsettled = await prisma.invoice.findMany({
    where: { ...school, status: { in: UNSETTLED_INVOICE as never[] } },
    select: { id: true, totalAmount: true, dueDate: true },
  });

  const paidByInvoice = new Map<string, number>();
  if (unsettled.length > 0) {
    const grouped = await prisma.payment.groupBy({
      by: ["invoiceId"],
      // ⚠️ `schoolId` ici aussi : `invoiceId: { in: … }` viendrait de la requête
      // précédente, mais l'omettre laisserait la requête dépendre d'un seul
      // filtre. Deux verrous valent mieux qu'un sur une agrégation d'argent.
      where: { ...school, invoiceId: { in: unsettled.map((i) => i.id) } },
      _sum: { amount: true },
    });
    for (const g of grouped) paidByInvoice.set(g.invoiceId, g._sum.amount ?? 0);
  }

  const now = new Date();
  let receivable = 0, receivableCount = 0, overdue = 0, overdueCount = 0, receivableAll = 0;

  for (const inv of unsettled) {
    const due = Math.max(0, inv.totalAmount - (paidByInvoice.get(inv.id) ?? 0));
    if (due === 0) continue; // soldée en fait, malgré son statut
    receivableAll += due;

    // Échéance dans la période — borne de fin exclue, comme partout.
    if (inv.dueDate >= period.from && inv.dueDate < period.to) {
      receivable += due;
      receivableCount += 1;
    }
    // Retard dérivé de la date, PAS du statut : rien n'écrit `OVERDUE`.
    if (inv.dueDate < now) {
      overdue += due;
      overdueCount += 1;
    }
  }

  return {
    collected, collectedCount, byMethod,
    expenseApproved: approved.amount, expenseApprovedCount: approved.count,
    expenseSubmitted: submitted.amount, expenseSubmittedCount: submitted.count,
    expenseOpen: open.amount, expenseOpenCount: open.count,
    byCategory,
    receivable, receivableCount, overdue, overdueCount, receivableAll,
    balance: collected - approved.amount,
  };
}

/* ═══════════════ vue d'ensemble de l'écran Paiements ═══════════════ */

export type InvoiceOverview = {
  /** Factures visibles par l'acteur. Déjà restreintes par `invoiceScope()`. */
  invoices: {
    id: string; title: string; totalAmount: number; status: string; dueDate: Date;
    student: { firstName: string; lastName: string } | null;
  }[];
  /** Encaissé sur ces factures — même définition que l'état financier. */
  collected: number;
  collectedCount: number;
  /** Reste réellement dû : montant facturé moins versements reçus. */
  outstanding: number;
  /** Factures dont l'échéance est dépassée et qui ne sont pas soldées. */
  overdueCount: number;
  overdue: number;
  paidCount: number;
  pendingCount: number;
  /** `true` si la vue est restreinte aux factures du parent connecté. */
  restrictedToParent: boolean;
};

/**
 * Tout ce dont l'écran Paiements a besoin, en une lecture bornée.
 *
 * ⚠️ **Les agrégats suivent la même restriction que la liste.** C'était le second
 * volet de la fuite : même avec une liste filtrée, les cartes « Total encaissé »
 * et « Reste à encaisser » auraient continué d'exposer la trésorerie de tout
 * l'établissement à chaque parent. Ici les totaux ne portent que sur les
 * factures que l'acteur a le droit de voir.
 *
 * ⚠️ Le retard est dérivé de `dueDate`, jamais du statut `OVERDUE` seul : ce
 * statut n'est écrit que par le balayage de `src/lib/overdue.ts`, qui peut ne
 * pas encore être passé. Une facture échue ce matin doit compter aujourd'hui.
 */
export async function invoiceOverview(actor: ActorContext): Promise<InvoiceOverview> {
  const scope = invoiceScope(actor);

  const invoices = await prisma.invoice.findMany({
    where: scope,
    select: {
      id: true, title: true, totalAmount: true, status: true, dueDate: true,
      student: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const ids = invoices.map((i) => i.id);

  // Aucune facture visible ⇒ aucun encaissement visible. Sans ce court-circuit,
  // `invoiceId: { in: [] }` serait passé à Prisma ; le résultat serait correct,
  // mais autant ne pas interroger la base pour rien.
  const byMethod = ids.length > 0 ? await collectedByMethod(actor, { invoiceIds: ids }) : [];
  const collected = byMethod.reduce((s, m) => s + m.amount, 0);
  const collectedCount = byMethod.reduce((s, m) => s + m.count, 0);

  // Reste dû par facture — même méthode que `financeSnapshot`.
  const paidByInvoice = new Map<string, number>();
  if (ids.length > 0) {
    const grouped = await prisma.payment.groupBy({
      by: ["invoiceId"],
      where: { schoolId: actor.schoolId, invoiceId: { in: ids } },
      _sum: { amount: true },
    });
    for (const g of grouped) paidByInvoice.set(g.invoiceId, g._sum.amount ?? 0);
  }

  const now = new Date();
  let outstanding = 0, overdue = 0, overdueCount = 0;

  for (const inv of invoices) {
    if (!UNSETTLED_INVOICE.includes(String(inv.status))) continue;
    const due = Math.max(0, inv.totalAmount - (paidByInvoice.get(inv.id) ?? 0));
    if (due === 0) continue;
    outstanding += due;
    if (inv.dueDate < now) {
      overdue += due;
      overdueCount += 1;
    }
  }

  return {
    invoices,
    collected,
    collectedCount,
    outstanding,
    overdue,
    overdueCount,
    paidCount: invoices.filter((i) => String(i.status) === "PAID").length,
    pendingCount: invoices.filter((i) => String(i.status) === "PENDING").length,
    restrictedToParent: actor.role === "PARENT",
  };
}

/* ─────────────────────────── lectures de dépenses ─────────────────────────── */

/** Dépenses d'une période, ordre chronologique inverse. */
export async function expensesForPeriod(actor: ActorContext, period: Period, take = 200) {
  return prisma.expense.findMany({
    where: { schoolId: actor.schoolId, ...periodFilter(period, "spentAt") },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    take,
  });
}

/** Une dépense de CET établissement, ou `null`. La seule façon de la charger. */
export async function findExpense(actor: ActorContext, id: string) {
  return prisma.expense.findFirst({ where: { id, schoolId: actor.schoolId } });
}

/** Pièces en attente de décision, pour le bureau de la direction. */
export async function pendingReview(actor: ActorContext) {
  const [expenses, statements] = await Promise.all([
    prisma.expense.findMany({
      where: { schoolId: actor.schoolId, status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      take: 100,
    }),
    prisma.financialStatement.findMany({
      where: { schoolId: actor.schoolId, status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      take: 50,
    }),
  ]);
  return { expenses, statements };
}

/* ──────────────────────── états financiers ──────────────────────── */

/** Un état de CET établissement, ou `null`. */
export async function findStatement(actor: ActorContext, id: string) {
  return prisma.financialStatement.findFirst({ where: { id, schoolId: actor.schoolId } });
}

/** Derniers états de l'établissement, tous statuts. */
export async function recentStatements(actor: ActorContext, take = 20) {
  return prisma.financialStatement.findMany({
    where: { schoolId: actor.schoolId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * État non abandonné dont la période chevauche `period`.
 *
 * Deux états qui se chevauchent compteraient deux fois les mêmes encaissements.
 * Le test est l'intersection d'intervalles classique, avec bornes de fin exclues :
 * `existant.from < nouveau.to` ET `existant.to > nouveau.from`.
 *
 * Pas exprimable en contrainte SQL (un chevauchement partiel n'est pas une
 * égalité), d'où ce contrôle en code. `CANCELLED` est ignoré : c'est précisément
 * ce qui permet de libérer une période réservée par erreur.
 */
export async function overlappingStatement(actor: ActorContext, period: Period, excludeId?: string) {
  return prisma.financialStatement.findFirst({
    where: {
      schoolId: actor.schoolId,
      status: { not: "CANCELLED" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      periodFrom: { lt: period.to },
      periodTo: { gt: period.from },
    },
  });
}

/**
 * État transmis ou approuvé dont la période contient `at`.
 *
 * Sert de verrou : on ne modifie pas une dépense datée dans une période déjà
 * arrêtée, sinon les chiffres soumis à la direction cesseraient de correspondre
 * aux pièces. Vaut aussi pour une dépense **créée après** la soumission et
 * antidatée dans la période — le cas que ce verrou existe pour empêcher.
 */
export async function lockingStatement(actor: ActorContext, at: Date) {
  return prisma.financialStatement.findFirst({
    where: {
      schoolId: actor.schoolId,
      status: { in: ["SUBMITTED", "APPROVED"] },
      periodFrom: { lte: at },
      periodTo: { gt: at },
    },
    select: { id: true, periodLabel: true, status: true },
  });
}

/* ─────────────────────── résolution de la période ─────────────────────── */

/** Paramètres de période tels qu'ils arrivent de l'URL. */
export type PeriodParams = { kind?: string; from?: string; to?: string; termId?: string };

const PERIOD_KINDS = ["day", "week", "month", "term", "custom"] as const;

/**
 * Traduit les paramètres d'URL en `Period`.
 *
 * ⚠️ **Aucune période n'est codée en dur.** Le mois courant n'est qu'un défaut
 * quand rien n'est demandé — les cinq granularités du lot 10 sont toutes
 * atteignables, et une période personnalisée accepte deux dates quelconques.
 *
 * Le cas du trimestre est le seul à toucher la base : `Term` est lu **avec le
 * `schoolId` de l'acteur**, sinon connaître un identifiant suffirait à cadrer un
 * état sur le calendrier d'un autre établissement.
 *
 * ⚠️ Les trois trimestres réellement en base n'ont **aucune date** : `termPeriod()`
 * renvoie alors `null`. On retombe sur le mois courant **avec un avertissement
 * affiché**, jamais sur des bornes inventées — un total faux est pire qu'un
 * message d'indisponibilité.
 */
export async function resolvePeriod(
  actor: ActorContext,
  params: PeriodParams,
): Promise<{ period: Period; notice?: string; terms: { id: string; name: string; dated: boolean }[] }> {
  const termRows = await prisma.term.findMany({
    where: { schoolId: actor.schoolId },
    select: { id: true, name: true, startDate: true, endDate: true },
    orderBy: { name: "asc" },
  });
  const terms = termRows.map((t) => ({
    id: t.id,
    name: t.name,
    dated: Boolean(t.startDate && t.endDate),
  }));

  const kind = (PERIOD_KINDS as readonly string[]).includes(params.kind ?? "") ? params.kind : "month";
  const ref = new Date();

  if (kind === "day") return { period: dayPeriod(ref), terms };
  if (kind === "week") return { period: weekPeriod(ref), terms };

  if (kind === "term") {
    const row = termRows.find((t) => t.id === params.termId);
    if (!row) return { period: monthPeriod(ref), notice: "Trimestre introuvable — mois en cours affiché.", terms };
    const p = termPeriod(row);
    if (!p) {
      return {
        period: monthPeriod(ref),
        notice: `« ${row.name} » n'a pas de dates de début et de fin. Renseignez-les dans Paramètres pour l'utiliser comme période.`,
        terms,
      };
    }
    return { period: p, terms };
  }

  if (kind === "custom") {
    const a = params.from ? new Date(params.from) : null;
    const b = params.to ? new Date(params.to) : null;
    if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
      return { period: monthPeriod(ref), notice: "Dates personnalisées incomplètes — mois en cours affiché.", terms };
    }
    return { period: customPeriod(a, b), terms };
  }

  return { period: monthPeriod(ref), terms };
}

/** Formatage monétaire unique du module. FCFA n'a pas de décimale d'usage. */
// ⚠️ `formatAmount` vit dans `moneyFormat.ts`, sans import Prisma — même raison
// que les libellés tarifaires ci-dessus. Ré-exporté ici pour les appelants
// serveur ; les composants clients importent le module direct.
export { formatAmount } from "@/lib/moneyFormat";

/** `YYYY-MM-DD` en heure locale, pour préremplir un `<input type="date">`. */
export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
