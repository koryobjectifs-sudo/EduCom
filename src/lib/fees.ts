import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import type { Period } from "@/lib/period";
import { periodFilter } from "@/lib/period";
import { collectedByMethod } from "@/lib/finance";
import type { FeeKind, FeeCadence, EducationalCycle } from "../generated/prisma/client";

/**
 * Référentiel financier — lot 12.1.
 *
 * ═══ LA DIRECTION EST LA SOURCE DE VÉRITÉ ═══
 *
 * `FeeSchedule` porte la grille officielle d'une année scolaire. Une seule est
 * `ACTIVE` à la fois, et elle seule alimente le forecast. Le gestionnaire lit ;
 * il ne peut que **demander** une modification (`FeeChangeRequest`, circuit
 * `feeChangeWorkflow` dont la décision exige `/dashboard/settings`).
 *
 * ═══ CINQ CONCEPTS FINANCIERS, CINQ SOURCES DIFFÉRENTES ═══
 *
 * Le cahier des charges insiste, et le lot 11 a déjà montré ce que coûte leur
 * confusion. Aucun de ces cinq nombres n'est dérivé d'un autre :
 *
 *   FORECAST         grille officielle × élèves réellement inscrits
 *                    → `forecast()`, ne lit AUCUNE facture
 *   FACTURÉ          SUM(Invoice.totalAmount) émis sur la période
 *                    → ce que l'école a réellement demandé
 *   ENCAISSÉ         SUM(Payment.amount) reçu sur la période
 *                    → `collectedByMethod()`, définition unique du lot 11
 *   RESTE À ENCAISSER  Σ (facture non soldée − ses versements)
 *                    → sans borne de date : c'est un stock, pas un flux
 *   À RELANCER       familles dont une facture est ÉCHUE et non soldée
 *                    → un sous-ensemble du reste, compté en FAMILLES
 *
 * ⚠️ « Reste » ≠ « à relancer » : une facture due le mois prochain est dans le
 * reste et n'appelle aucune relance. Et « forecast » ≠ « facturé » : l'écart
 * entre les deux est exactement ce qu'un directeur veut voir — ce qui aurait dû
 * être facturé et ne l'a pas été.
 */

/* ══════════════════════════════ types ══════════════════════════════ */

// ⚠️ Les libellés vivent dans `feesLabels.ts`, **sans import Prisma**. Ils sont
// ré-exportés ici pour les appelants serveur, mais un composant `"use client"`
// doit importer le module de libellés directement : passer par ce fichier lui
// ferait embarquer Prisma, `pg` et `dns` dans le bundle navigateur, ce qui
// empêchait la grille tarifaire de se compiler (défaut du lot 12.1, prouvé et
// corrigé au lot 13.1). Aucun calcul n'a bougé.
export { FEE_KIND_LABELS, FEE_CADENCE_LABELS, feeKindLabel } from "@/lib/feesLabels";

export type ResolvedFee = {
  itemId: string;
  kind: FeeKind;
  label: string;
  amount: number;
  cadence: FeeCadence;
  /** D'où vient la ligne retenue — sert à expliquer un montant à l'écran. */
  scope: "class" | "cycle" | "school";
};

export type ForecastLine = {
  classId: string;
  className: string;
  cycle: EducationalCycle;
  students: number;
  /** Attendu annuel par élève, tous frais obligatoires confondus. */
  perStudent: number;
  /** `perStudent × students`. */
  total: number;
  fees: ResolvedFee[];
};

export type Forecast = {
  scheduleId: string;
  scheduleLabel: string;
  academicYear: string;
  lines: ForecastLine[];
  /** Somme des lignes. Attendu ANNUEL — voir l'avertissement de `forecast()`. */
  total: number;
  studentsCovered: number;
  /** Élèves inscrits qu'aucune ligne de grille ne couvre. */
  studentsUncovered: number;
};

/* ═════════════════════ grille officielle ═════════════════════ */

/**
 * Grille ACTIVE de l'établissement, ou `null`.
 *
 * ⚠️ `null` n'est pas une erreur : une école qui n'a pas encore saisi sa grille
 * doit voir « aucune grille officielle », pas un forecast à zéro qui ressemble
 * à un résultat.
 */
export async function activeSchedule(actor: ActorContext) {
  return prisma.feeSchedule.findFirst({
    where: { schoolId: actor.schoolId, status: "ACTIVE" },
    orderBy: { activatedAt: "desc" },
    include: {
      items: {
        where: { schoolId: actor.schoolId },
        orderBy: [{ kind: "asc" }, { label: "asc" }],
        include: { class: { select: { id: true, name: true } } },
      },
    },
  });
}

/** Toutes les grilles de l'école, la plus récente d'abord. */
export async function allSchedules(actor: ActorContext) {
  return prisma.feeSchedule.findMany({
    where: { schoolId: actor.schoolId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { items: true } } },
  });
}

/**
 * Frais applicables à une classe, portée la plus précise d'abord.
 *
 * ⚠️ **Une seule ligne par nature de frais.** Si la grille déclare une scolarité
 * sur CM2 *et* une sur le cycle ÉLÉMENTAIRE, l'élève de CM2 ne doit pas payer
 * les deux : la ligne de classe l'emporte. Sans cette règle, le forecast
 * additionnerait deux scolarités et annoncerait un attendu impossible.
 *
 * ⚠️ Les frais **facultatifs** (cantine, transport) sont écartés : rien au
 * schéma ne dit quels élèves y souscrivent, et les compter gonflerait l'attendu
 * d'un montant que l'école ne percevra jamais.
 */
export function resolveFeesForClass(
  items: {
    id: string; kind: FeeKind; label: string; amount: number; cadence: FeeCadence;
    mandatory: boolean; classId: string | null; cycle: EducationalCycle | null;
  }[],
  classId: string,
  cycle: EducationalCycle,
): ResolvedFee[] {
  const best = new Map<FeeKind, ResolvedFee>();
  // Rang de précision : plus il est petit, plus la portée est fine.
  const rank = { class: 0, cycle: 1, school: 2 } as const;

  for (const it of items) {
    if (!it.mandatory) continue;

    let scope: ResolvedFee["scope"];
    if (it.classId) {
      if (it.classId !== classId) continue;
      scope = "class";
    } else if (it.cycle) {
      if (it.cycle !== cycle) continue;
      scope = "cycle";
    } else {
      scope = "school";
    }

    const candidate: ResolvedFee = {
      itemId: it.id, kind: it.kind, label: it.label,
      amount: it.amount, cadence: it.cadence, scope,
    };
    const current = best.get(it.kind);
    if (!current || rank[scope] < rank[current.scope]) best.set(it.kind, candidate);
  }

  return [...best.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}

/**
 * Attendu annuel d'un élève, à partir des frais résolus.
 *
 * ⚠️ **La cadence est convertie en attendu ANNUEL** : un frais mensuel compte
 * ×10 (année scolaire sénégalaise, octobre → juillet), un frais trimestriel ×3.
 * Ces deux facteurs sont les seules hypothèses de calcul de tout le module, et
 * elles sont ici, nommées, plutôt que dispersées.
 */
export const MONTHS_PER_YEAR = 10;
export const TERMS_PER_YEAR = 3;

export function annualAmount(fee: ResolvedFee): number {
  switch (fee.cadence) {
    case "MONTHLY": return fee.amount * MONTHS_PER_YEAR;
    case "TERM": return fee.amount * TERMS_PER_YEAR;
    case "ANNUAL":
    case "ONE_OFF": return fee.amount;
  }
}

/* ═══════════════════════════ FORECAST ═══════════════════════════ */

/**
 * Montant attendu selon la grille officielle et les élèves réellement inscrits.
 *
 * ═══ CE QUE LE FORECAST N'EST PAS ═══
 *
 * Il ne lit **aucune facture** et **aucun paiement**. C'est l'attendu théorique
 * de l'établissement ; l'écart avec le facturé est l'information utile.
 *
 * ⚠️ **Le forecast est ANNUEL, pas borné à la période choisie.** Découper une
 * scolarité annuelle en « ce qui est attendu cette semaine » supposerait un
 * échéancier que le schéma ne porte pas. Afficher un forecast prorata serait
 * inventer de la précision : l'écran l'annonce comme annuel.
 *
 * Le compte d'élèves vient d'`Enrollment` (inscription réelle en classe), pas de
 * `Student` : un élève sans classe n'a pas de tarif applicable, et le forecast
 * le signale via `studentsUncovered` au lieu de l'ignorer.
 */
export async function forecast(actor: ActorContext): Promise<Forecast | null> {
  const schedule = await activeSchedule(actor);
  if (!schedule) return null;

  const classes = await prisma.class.findMany({
    where: { schoolId: actor.schoolId },
    select: {
      id: true, name: true, cycle: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: "asc" },
  });

  const lines: ForecastLine[] = [];
  let total = 0, covered = 0, uncovered = 0;

  for (const c of classes) {
    const students = c._count.enrollments;
    if (students === 0) continue;

    const fees = resolveFeesForClass(schedule.items, c.id, c.cycle);
    if (fees.length === 0) {
      // Classe peuplée qu'aucune ligne ne couvre : comptée à part, jamais à 0.
      uncovered += students;
      continue;
    }

    const perStudent = fees.reduce((s, f) => s + annualAmount(f), 0);
    const lineTotal = perStudent * students;
    lines.push({ classId: c.id, className: c.name, cycle: c.cycle, students, perStudent, total: lineTotal, fees });
    total += lineTotal;
    covered += students;
  }

  return {
    scheduleId: schedule.id,
    scheduleLabel: schedule.label,
    academicYear: schedule.academicYear,
    lines, total,
    studentsCovered: covered,
    studentsUncovered: uncovered,
  };
}

/* ═══════════════ facturé · encaissé · reste · relances ═══════════════ */

export type MoneyPicture = {
  /** SUM(Invoice.totalAmount) ÉMISES sur la période. */
  billed: number;
  billedCount: number;
  /** SUM(Payment.amount) REÇUS sur la période — définition unique du lot 11. */
  collected: number;
  /** Σ (facture non soldée − versements). Stock, sans borne de date. */
  outstanding: number;
  outstandingCount: number;
  /** Sous-ensemble du reste dont l'échéance est DÉPASSÉE. */
  toChase: number;
  toChaseCount: number;
  /** Familles distinctes concernées par une relance. */
  familiesToChase: number;
};

/**
 * Les quatre montants réels, chacun depuis sa propre source.
 *
 * ⚠️ `billed` somme `Invoice.totalAmount` — c'est légitime **ici** : la question
 * posée est « combien l'école a-t-elle réclamé ». C'est l'utiliser pour dire
 * « encaissé » qui était faux au lot 11, et `collected` vient bien des paiements.
 */
export async function moneyPicture(actor: ActorContext, period: Period): Promise<MoneyPicture> {
  const school = { schoolId: actor.schoolId };

  const [billedAgg, methods, unsettled] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...school, ...periodFilter(period, "createdAt") },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    collectedByMethod(actor, { period }),
    prisma.invoice.findMany({
      where: { ...school, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      select: { id: true, totalAmount: true, dueDate: true, studentId: true, parentId: true },
    }),
  ]);

  const paidByInvoice = new Map<string, number>();
  if (unsettled.length > 0) {
    const grouped = await prisma.payment.groupBy({
      by: ["invoiceId"],
      where: { ...school, invoiceId: { in: unsettled.map((i) => i.id) } },
      _sum: { amount: true },
    });
    for (const g of grouped) paidByInvoice.set(g.invoiceId, g._sum.amount ?? 0);
  }

  const now = new Date();
  let outstanding = 0, outstandingCount = 0, toChase = 0, toChaseCount = 0;
  const families = new Set<string>();

  for (const inv of unsettled) {
    const due = Math.max(0, inv.totalAmount - (paidByInvoice.get(inv.id) ?? 0));
    if (due === 0) continue;
    outstanding += due;
    outstandingCount += 1;

    // La relance dérive de l'ÉCHÉANCE, pas du statut : rien n'écrit OVERDUE
    // de façon fiable (`PARTIAL` n'est écrit par aucun code).
    if (inv.dueDate < now) {
      toChase += due;
      toChaseCount += 1;
      // Une facture sans élève NI parent n'appartient à aucune famille : elle
      // compte dans le montant, jamais dans le nombre de familles à relancer.
      const key = inv.parentId ?? inv.studentId;
      if (key) families.add(key);
    }
  }

  return {
    billed: billedAgg._sum.totalAmount ?? 0,
    billedCount: billedAgg._count._all,
    collected: methods.reduce((s, m) => s + m.amount, 0),
    outstanding, outstandingCount,
    toChase, toChaseCount,
    familiesToChase: families.size,
  };
}

/* ═══════════════ demandes de modification ═══════════════ */

/** Demandes tarifaires de l'école, la plus récente d'abord. */
export async function feeChangeRequests(actor: ActorContext, take = 20) {
  return prisma.feeChangeRequest.findMany({
    where: { schoolId: actor.schoolId },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      feeItem: {
        select: { id: true, label: true, kind: true, amount: true, class: { select: { name: true } } },
      },
    },
  });
}

/** Demandes en attente de décision de la direction. */
export async function pendingFeeRequests(actor: ActorContext) {
  return prisma.feeChangeRequest.count({
    where: { schoolId: actor.schoolId, status: "SUBMITTED" },
  });
}

/* ═══════════════════════ notifications ═══════════════════════ */

/**
 * Notifications non lues d'un utilisateur.
 *
 * ⚠️ Le destinataire vient d'`actor.userId`, jamais d'un argument : sans cela,
 * connaître un identifiant suffirait à lire la boîte d'un collègue.
 */
export async function unreadNotifications(actor: ActorContext, take = 10) {
  return prisma.staffNotification.findMany({
    where: { schoolId: actor.schoolId, userId: actor.userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function recentNotifications(actor: ActorContext, take = 10) {
  return prisma.staffNotification.findMany({
    where: { schoolId: actor.schoolId, userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Dépose une notification pour chaque utilisateur d'un rôle donné.
 *
 * ⚠️ **Aucun envoi.** La ligne est écrite en base et se lit dans
 * l'application — c'est tout ce que ce lot prétend faire. Le seul canal sortant
 * du dépôt est Twilio, câblé pour les parents (`Message`), pas pour le
 * personnel : annoncer un e-mail ou un SMS serait simuler un mécanisme absent.
 *
 * Les destinataires sont résolus **dans l'école de l'acteur** uniquement.
 */
export async function notifyRoles(
  actor: ActorContext,
  roles: string[],
  n: { kind: string; title: string; body: string; link?: string },
): Promise<number> {
  const recipients = await prisma.user.findMany({
    where: { schoolId: actor.schoolId, role: { in: roles as never[] } },
    select: { id: true },
  });
  if (recipients.length === 0) return 0;

  await prisma.staffNotification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      schoolId: actor.schoolId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
    })),
  });
  return recipients.length;
}

/** Formate un écart tarifaire pour un corps de notification. */
export function describeAmountChange(before: number, after: number): string {
  const fmt = (v: number) => Math.round(v).toLocaleString("fr-FR");
  const delta = after - before;
  const sign = delta > 0 ? "+" : "−";
  return `${fmt(before)} → ${fmt(after)} FCFA (${sign}${fmt(Math.abs(delta))})`;
}
