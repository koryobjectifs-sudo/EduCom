import { prisma } from "@/lib/prisma";
import { hasAccess, RoleType, roleLabel } from "@/lib/permissions";
import type { ActorContext } from "@/lib/audit";
import { isSystemActor, SYSTEM_ACTOR_ID } from "@/lib/audit";
import type { StatusDomain } from "@/lib/status";
import type { Period } from "@/lib/period";
import { periodFilter, previousPeriod } from "@/lib/period";
import { financeSnapshot, collectedByMethod, invoiceScope, formatAmount } from "@/lib/finance";
import { comparisonPeriod } from "@/lib/terms";
import { forecast, moneyPicture, feeChangeRequests, unreadNotifications, activeSchedule, feeKindLabel } from "@/lib/fees";
import { teacherClassIds } from "@/lib/studentScope";

/**
 * Moteur de rapports — lot 12.
 *
 * ═══ UN RAPPORT EST UNE VUE DE MÉTIER, PAS « LE RAPPORT DE L'ÉCOLE » ═══
 *
 * Le comptable, la secrétaire, l'enseignant, la direction et le parent ne
 * regardent pas les mêmes chiffres. L'écran précédent en affichait trois,
 * identiques pour tout le monde, dont deux étaient faux (voir plus bas). Chaque
 * rôle reçoit ici les sections de **son** travail, et rien d'autre.
 *
 * ═══ TROIS RÈGLES QUI GOUVERNENT TOUT CE FICHIER ═══
 *
 * 1. **Aucune métrique inventée.** Si le schéma ne porte pas la donnée, elle
 *    n'est pas affichée : elle est déclarée dans `unavailable` avec sa raison.
 *    Une carte KPI vide vaut mieux qu'une carte KPI fausse.
 *
 * 2. **Aucune comparaison fabriquée.** `previous` vaut `null` dès que la période
 *    précédente n'est pas calculable (trimestre sans ordre déclaré) ou que la
 *    donnée n'a pas de date exploitable. L'écran affiche alors « — », pas 0 %.
 *
 * 3. **`schoolId` dans chaque `where`, sans exception.** Aucune signature de ce
 *    fichier n'accepte de `schoolId` : il vient de `ActorContext`, donc de la
 *    session. C'est la règle posée au lot 00 et durcie au lot 11.1.
 *
 * ═══ CE QUE L'ANCIEN ÉCRAN CALCULAIT FAUX ═══
 *
 * `reports/page.tsx` sommait `Invoice.totalAmount` des factures `PAID` pour dire
 * « encaissé », et groupait ces factures par `Invoice.createdAt` pour tracer un
 * « flux de trésorerie ». Deux erreurs documentées au lot 11 :
 *   - `totalAmount` n'est pas un registre d'argent (deux factures à 0 en base
 *     ont pourtant reçu 110 000 FCFA) ;
 *   - la date d'un encaissement est `Payment.createdAt`, pas la date d'émission
 *     de la facture.
 * Tout l'argent de ce fichier passe donc par `collectedByMethod()` et
 * `financeSnapshot()` — la définition unique du module financier.
 */

/* ══════════════════════════════ types ══════════════════════════════ */

export type ReportAudience = "direction" | "finance" | "secretariat" | "teaching" | "family";

export type MetricFormat = "amount" | "count";

export type Metric = {
  key: string;
  label: string;
  value: number;
  format: MetricFormat;
  /**
   * Même mesure sur la période précédente.
   * `null` = **non calculable**, jamais « zéro ». L'écran doit le distinguer.
   */
  previous: number | null;
  hint?: string;
};

/** Donnée que le schéma ne permet pas de produire, et pourquoi. */
export type Unavailable = { label: string; reason: string };

/** Ligne de traçabilité : qui, quoi, quand, état. */
export type TraceRow = {
  id: string;
  who: string | null;
  what: string;
  when: Date;
  state: { domain: StatusDomain; value: string } | null;
  amount: number | null;
};

export type ReportSection = {
  id: string;
  title: string;
  description?: string;
  metrics: Metric[];
  rows: TraceRow[];
  /** Message d'état vide propre à la section. */
  emptyLabel?: string;
  unavailable: Unavailable[];
};

/**
 * Regroupement de sections par service — lot 12.1.
 *
 * ⚠️ **Un employé ne reçoit QUE son groupe.** Les autres ne sont pas rendus :
 * ils n'existent pas dans l'objet renvoyé, donc pas dans le DOM. Les masquer en
 * CSS aurait laissé les données dans la page — un `view-source` suffirait à lire
 * les finances de l'école depuis un compte enseignant.
 */
export type ReportGroup = {
  id: "finance" | "secretariat" | "teaching" | "family" | "other";
  title: string;
  description?: string;
  sections: ReportSection[];
};

export type Report = {
  audience: ReportAudience;
  title: string;
  description: string;
  /** Groupes réellement rendus. Un employé n'en a qu'un ; la direction, quatre. */
  groups: ReportGroup[];
  /** Vrai si la période précédente est calculable — pilote l'affichage global. */
  comparable: boolean;
  comparisonLabel: string | null;
  /**
   * Résumé global — direction uniquement (`null` pour un employé).
   * Les chiffres qui traversent les services, avant le détail par service.
   */
  summary: ReportSection | null;
  /** Notifications non lues de l'acteur, affichées en tête. */
  notifications: { id: string; title: string; body: string; link: string | null; createdAt: Date }[];
};

/* ═══════════════════════ rôle → rapport ═══════════════════════ */

/**
 * Rapport correspondant à un rôle.
 *
 * ⚠️ Ce n'est **pas** une table de permissions. L'accès à `/dashboard/reports`
 * reste décidé par `hasAccess()` seul ; cette fonction ne dit que *quelle vue*
 * montrer à quelqu'un qui est déjà entré. Un rôle inconnu renvoie `null` et la
 * page redirige — elle n'invente pas une vue par défaut.
 */
export function audienceForRole(role: RoleType | string): ReportAudience | null {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "direction";
    case "ACCOUNTANT":
      return "finance";
    case "SECRETARY":
    case "ASSISTANT":
      return "secretariat";
    case "TEACHER":
      return "teaching";
    case "PARENT":
      return "family";
    default:
      return null;
  }
}

/* ═══════════════════════ utilitaires internes ═══════════════════════ */

const metric = (
  key: string,
  label: string,
  value: number,
  format: MetricFormat,
  previous: number | null,
  hint?: string,
): Metric => ({ key, label, value, format, previous, hint });

/**
 * Répertoire des acteurs cités dans les lignes de traçabilité.
 *
 * Un identifiant brut ne dit rien à un directeur. Les comptes supprimés et
 * l'acteur système (`SYSTEM_ACTOR_ID`) sont traités explicitement : afficher
 * « Compte supprimé » pour le balayage automatique des impayés serait faux.
 */
async function actorNames(actor: ActorContext, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v) && !isSystemActor(v)))];
  const map = new Map<string, string>();
  map.set(SYSTEM_ACTOR_ID, "Traitement automatique");
  if (wanted.length === 0) return map;

  const users = await prisma.user.findMany({
    // `schoolId` même ici : un identifiant d'acteur venu d'une trace ne doit pas
    // permettre de lire le répertoire d'un autre établissement.
    where: { schoolId: actor.schoolId, id: { in: wanted } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  for (const u of users) {
    map.set(u.id, `${u.firstName} ${u.lastName} · ${roleLabel(u.role)}`);
  }
  return map;
}

/*
 * `teacherClassIds()` vivait ici. Le lot 13.1 l'a déplacé dans
 * `src/lib/studentScope.ts` sans en changer une ligne : le dossier élève avait
 * besoin exactement de la même réponse à « quelles classes sont les siennes »,
 * et deux copies de cette règle auraient fini par diverger — l'une bornant les
 * rapports, l'autre les pièces d'identité et de santé. Le comportement des
 * rapports est inchangé ; seul l'emplacement de la fonction l'est.
 */

/* ══════════════════ indisponibilités communes ══════════════════ */

/**
 * Métriques réclamées par le cahier des charges que le schéma **ne porte pas**.
 * Déclarées une fois, affichées à qui les attendrait.
 */
const NO_PRINT_TRACE: Unavailable = {
  label: "Bulletins imprimés",
  reason:
    "Aucune trace d'impression au schéma : `ReportCardStatus` s'arrête à APPROVED (« imprimable »), " +
    "et rien n'enregistre qu'une impression a eu lieu. Le nombre affiché serait une supposition.",
};

const NO_DOC_OWNER: Unavailable = {
  label: "Documents par élève ou par famille",
  reason:
    "`DocumentRequest` ne porte ni `studentId` ni `parentId` — seulement un nom, une description et un statut. " +
    "Impossible de dire de qui relève une demande, donc impossible de lister les documents manquants d'un dossier.",
};

const NO_ATTENDANCE: Unavailable = {
  label: "Assiduité (absences, retards)",
  reason: "Aucun modèle de présence au schéma. Les bulletins scannés en comptent deux sortes, la base aucune.",
};

/* ══════════════════════════ FINANCE ══════════════════════════ */

/**
 * Sections financières. Sert le comptable **et** la direction.
 *
 * ⚠️ Toutes les valeurs viennent de `financeSnapshot()`, y compris celles de la
 * période précédente : appeler l'instantané deux fois garantit que la
 * comparaison porte sur exactement la même définition. Recalculer « encaissé »
 * à la main ici aurait recréé le doublon qui a produit deux totaux différents au
 * lot 11.
 */
async function financeSections(actor: ActorContext, period: Period): Promise<ReportSection[]> {
  // Lot 12.1 : la période de comparaison passe par `comparisonPeriod()`, qui
  // résout le trimestre précédent en base (ordre par `startDate`) et délègue au
  // calcul pur pour les quatre granularités calendaires.
  const prev = await comparisonPeriod(actor, period);

  const [snap, prevSnap, statements] = await Promise.all([
    financeSnapshot(actor, period),
    prev ? financeSnapshot(actor, prev) : Promise.resolve(null),
    prisma.financialStatement.findMany({
      where: { schoolId: actor.schoolId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true, periodLabel: true, status: true, balance: true, updatedAt: true,
        createdById: true, submittedById: true, approvedById: true,
      },
    }),
  ]);

  const names = await actorNames(
    actor,
    statements.flatMap((s) => [s.approvedById, s.submittedById, s.createdById]),
  );

  const resume: ReportSection = {
    id: "finance-resume",
    title: "Résumé financier",
    description: "Encaissements réels et dépenses approuvées de la période.",
    metrics: [
      metric("collected", "Encaissé", snap.collected, "amount", prevSnap?.collected ?? null,
        "Somme des versements enregistrés (Payment.amount), pas le montant facturé."),
      metric("expense", "Dépenses approuvées", snap.expenseApproved, "amount", prevSnap?.expenseApproved ?? null,
        "Seules les dépenses APPROUVÉES entrent dans le solde."),
      metric("balance", "Solde", snap.balance, "amount", prevSnap?.balance ?? null,
        "Encaissé moins dépenses approuvées. Rien d'autre."),
      metric("overdue", "Créances échues", snap.overdue, "amount", null,
        "Reste dû des factures dont l'échéance est passée, toutes périodes confondues — une comparaison de période n'aurait pas de sens."),
    ],
    rows: [],
    unavailable: [],
  };

  const encaissements: ReportSection = {
    id: "finance-encaissements",
    title: "Encaissements par moyen de paiement",
    metrics: snap.byMethod.map((m) =>
      metric(`m-${m.method}`, m.label, m.amount, "amount", null, `${m.count} versement${m.count > 1 ? "s" : ""}`),
    ),
    rows: [],
    emptyLabel: "Aucun encaissement sur cette période.",
    unavailable: [],
  };

  const depenses: ReportSection = {
    id: "finance-depenses",
    title: "Dépenses par poste",
    description: "Réparties uniquement sur les dépenses approuvées.",
    metrics: snap.byCategory.map((c) =>
      metric(`c-${c.category}`, c.label, c.amount, "amount", null, `${c.count} dépense${c.count > 1 ? "s" : ""}`),
    ),
    rows: [],
    emptyLabel: "Aucune dépense approuvée sur cette période.",
    unavailable: [],
  };

  const etats: ReportSection = {
    id: "finance-etats",
    title: "États financiers",
    description: "Qui a préparé, transmis ou validé, et quand.",
    metrics: [
      metric("st-submitted", "Transmis, en attente", snap.expenseSubmitted, "amount", null,
        `${snap.expenseSubmittedCount} dépense(s) transmise(s) non encore tranchée(s)`),
      metric("st-open", "Encore chez le gestionnaire", snap.expenseOpen, "amount", null,
        `${snap.expenseOpenCount} brouillon(s) ou renvoi(s)`),
    ],
    rows: statements.map((s) => ({
      id: s.id,
      // L'acteur affiché est le dernier à avoir agi : approbation, sinon dépôt,
      // sinon création. C'est la lecture utile — « où en est-ce, par qui ».
      who: names.get(s.approvedById ?? s.submittedById ?? s.createdById) ?? null,
      what: `État ${s.periodLabel}`,
      when: s.updatedAt,
      state: { domain: "financialStatement", value: String(s.status) },
      amount: s.balance,
    })),
    emptyLabel: "Aucun état financier enregistré.",
    unavailable: [],
  };

  /* ─────────────── PARTIE H/I — forecast et distinction ─────────────── */

  const [fc, money, requests] = await Promise.all([
    forecast(actor),
    moneyPicture(actor, period),
    feeChangeRequests(actor, 8),
  ]);

  /**
   * ⚠️ Les cinq nombres ci-dessous viennent de cinq sources différentes et ne
   * sont JAMAIS dérivés l'un de l'autre. Le forecast est le seul qui ne lise
   * aucune facture ; il est aussi le seul qui soit ANNUEL, ce que le libellé et
   * l'indice disent explicitement — proratiser une scolarité annuelle sur une
   * semaine inventerait une précision que le schéma ne porte pas.
   */
  const distinction: ReportSection = {
    id: "finance-distinction",
    title: "Attendu, facturé, encaissé, reste",
    description:
      "Quatre montants, quatre sources. Le forecast vient de la grille officielle et ne lit aucune facture ; " +
      "le facturé et l'encaissé sont bornés à la période ; le reste et les relances sont des stocks.",
    metrics: [
      fc
        ? metric("forecast", "Forecast (attendu annuel)", fc.total, "amount", null,
            `Grille « ${fc.scheduleLabel} » × ${fc.studentsCovered} élève(s) inscrit(s). Attendu ANNUEL, non proratisé sur la période.`)
        : metric("forecast", "Forecast (attendu annuel)", 0, "amount", null,
            "Aucune grille tarifaire officielle : activez-en une dans Réglages › Grille tarifaire."),
      metric("billed", "Facturé sur la période", money.billed, "amount", null,
        `${money.billedCount} facture(s) émise(s) — somme des montants réclamés.`),
      metric("collected2", "Encaissé sur la période", money.collected, "amount", null,
        "Somme des versements réellement reçus."),
      metric("outstanding", "Reste à encaisser", money.outstanding, "amount", null,
        `${money.outstandingCount} facture(s) non soldée(s), toutes échéances confondues.`),
    ],
    rows: [],
    unavailable: fc && fc.studentsUncovered > 0
      ? [{
          label: `${fc.studentsUncovered} élève(s) hors grille`,
          reason: "Ces élèves sont inscrits dans une classe qu'aucune ligne tarifaire ne couvre. Ils ne sont donc PAS comptés dans le forecast — les inclure à zéro aurait faussé l'attendu.",
        }]
      : [],
  };

  const relances: ReportSection = {
    id: "finance-relances",
    title: "À relancer",
    description: "Sous-ensemble du reste dont l'échéance est dépassée. Une facture due le mois prochain n'appelle aucune relance.",
    metrics: [
      metric("toChase", "Montant échu non réglé", money.toChase, "amount", null),
      metric("toChaseCount", "Factures échues", money.toChaseCount, "count", null),
      metric("families", "Familles à relancer", money.familiesToChase, "count", null,
        "Familles distinctes. Une facture sans élève ni parent compte dans le montant, jamais dans ce nombre."),
    ],
    rows: [],
    emptyLabel: "Aucune facture échue — rien à relancer.",
    unavailable: [],
  };

  const detail: ReportSection = {
    id: "finance-grille",
    title: "Grille tarifaire officielle",
    description: fc ? `« ${fc.scheduleLabel} » — année ${fc.academicYear}.` : undefined,
    metrics: fc
      ? fc.lines.map((l) =>
          metric(`fc-${l.classId}`, l.className, l.total, "amount", null,
            `${l.students} élève(s) × ${formatAmount(l.perStudent)} FCFA — ${l.fees.map((f) => feeKindLabel(f.kind)).join(", ")}`))
      : [],
    rows: [],
    emptyLabel: "Aucune grille tarifaire officielle n'est active pour cet établissement.",
    unavailable: [],
  };

  const demandes: ReportSection = {
    id: "finance-demandes",
    title: "Demandes de modification tarifaire",
    description: "Le gestionnaire propose, la direction tranche. Une demande refusée ne modifie pas la grille.",
    metrics: [],
    rows: requests.map((r) => ({
      id: r.id,
      who: null,
      what: `${r.feeItem.label}${r.feeItem.class ? ` (${r.feeItem.class.name})` : ""} : ${formatAmount(r.currentAmount)} → ${formatAmount(r.proposedAmount)} FCFA — ${r.reason}`,
      when: r.updatedAt,
      state: { domain: "expense" as StatusDomain, value: String(r.status) },
      amount: r.proposedAmount - r.currentAmount,
    })),
    emptyLabel: "Aucune demande de modification tarifaire.",
    unavailable: [],
  };

  return [resume, distinction, relances, detail, encaissements, depenses, etats, demandes];
}

/* ══════════════════════ SECRÉTARIAT ══════════════════════ */

async function secretariatSections(actor: ActorContext, period: Period): Promise<ReportSection[]> {
  const prev = await comparisonPeriod(actor, period);
  const school = { schoolId: actor.schoolId };

  // Le secrétariat voit l'espace de validation ; l'assistant non. La portée est
  // décidée depuis `hasAccess()`, pas depuis une seconde table de rôles.
  const seesValidation = hasAccess(actor.role, "/dashboard/documents/validation");

  const [
    enrolled, pending, newStudents, prevNewStudents,
    enrolments, prevEnrolments,
    docsByStatus, reportCards, submittedRC, prevSubmittedRC,
    messagesOut, prevMessagesOut, messagesIn,
  ] = await Promise.all([
    prisma.student.count({ where: { ...school, status: "ENROLLED" } }),
    prisma.student.count({ where: { ...school, status: "PENDING" } }),
    prisma.student.count({ where: { ...school, ...periodFilter(period, "createdAt") } }),
    prev ? prisma.student.count({ where: { ...school, ...periodFilter(prev, "createdAt") } }) : Promise.resolve(null),
    prisma.enrollment.count({ where: { class: school, ...periodFilter(period, "createdAt") } }),
    prev ? prisma.enrollment.count({ where: { class: school, ...periodFilter(prev, "createdAt") } }) : Promise.resolve(null),
    prisma.documentRequest.groupBy({ by: ["status"], where: school, _count: { _all: true } }),
    prisma.reportCard.groupBy({ by: ["status"], where: school, _count: { _all: true } }),
    prisma.reportCard.count({ where: { ...school, submittedAt: { gte: period.from, lt: period.to } } }),
    prev
      ? prisma.reportCard.count({ where: { ...school, submittedAt: { gte: prev.from, lt: prev.to } } })
      : Promise.resolve(null),
    prisma.message.count({ where: { ...school, direction: "OUTBOUND", ...periodFilter(period, "createdAt") } }),
    prev
      ? prisma.message.count({ where: { ...school, direction: "OUTBOUND", ...periodFilter(prev, "createdAt") } })
      : Promise.resolve(null),
    prisma.message.count({ where: { ...school, direction: "INBOUND", ...periodFilter(period, "createdAt") } }),
  ]);

  const docCount = (s: string) => docsByStatus.find((d) => d.status === s)?._count._all ?? 0;
  const rcCount = (s: string) => reportCards.find((r) => r.status === s)?._count._all ?? 0;

  const dossiers: ReportSection = {
    id: "secr-dossiers",
    title: "Dossiers élèves",
    metrics: [
      // Un effectif est un état à l'instant présent, pas un flux : le comparer à
      // « l'effectif de la période précédente » exigerait un historique
      // d'inscriptions daté que le schéma ne conserve pas.
      metric("enrolled", "Élèves inscrits", enrolled, "count", null, "Effectif actuel, toutes périodes confondues."),
      metric("newStudents", "Dossiers créés", newStudents, "count", prevNewStudents),
      metric("enrolments", "Inscriptions en classe", enrolments, "count", prevEnrolments),
      metric("pending", "Admissions à valider", pending, "count", null, "Élèves au statut « En attente »."),
    ],
    rows: [],
    unavailable: [NO_ATTENDANCE],
  };

  const documents: ReportSection = {
    id: "secr-documents",
    title: "Demandes de documents",
    description: "Réparties par état de traitement.",
    metrics: [
      metric("doc-pending", "En attente", docCount("PENDING"), "count", null),
      metric("doc-progress", "En cours", docCount("IN_PROGRESS"), "count", null),
      metric("doc-done", "Traitées", docCount("COMPLETED"), "count", null),
    ],
    rows: [],
    emptyLabel: "Aucune demande de document enregistrée.",
    // `DocumentRequest.createdAt` existe, mais le modèle n'a aucun lien vers un
    // élève : filtrer par période donnerait un flux sans dire de qui il relève.
    unavailable: [NO_DOC_OWNER],
  };

  const sections: ReportSection[] = [dossiers, documents];

  if (seesValidation) {
    const rcRows = await prisma.reportCard.findMany({
      where: { ...school, status: { in: ["SUBMITTED", "RETURNED", "APPROVED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true, status: true, updatedAt: true, submittedById: true, validatedById: true,
        student: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
    });
    const names = await actorNames(actor, rcRows.flatMap((r) => [r.submittedById, r.validatedById]));

    sections.push({
      id: "secr-bulletins",
      title: "Bulletins",
      description: "Ce que le secrétariat doit relire, et ce qui est déjà validé.",
      metrics: [
        metric("rc-submitted", "Déposés à relire", rcCount("SUBMITTED"), "count", null),
        metric("rc-returned", "Renvoyés pour correction", rcCount("RETURNED"), "count", null),
        metric("rc-approved", "Approuvés", rcCount("APPROVED"), "count", null),
        metric("rc-period", "Déposés sur la période", submittedRC, "count", prevSubmittedRC,
          "Compté sur `submittedAt`, la date réelle du dépôt."),
      ],
      rows: rcRows.map((r) => ({
        id: r.id,
        who: names.get(r.submittedById ?? r.validatedById ?? "") ?? null,
        what: `${r.student.firstName} ${r.student.lastName} · ${r.class.name}`,
        when: r.updatedAt,
        state: { domain: "reportCard" as StatusDomain, value: String(r.status) },
        amount: null,
      })),
      emptyLabel: "Aucun bulletin déposé.",
      unavailable: [NO_PRINT_TRACE],
    });
  }

  sections.push({
    id: "secr-communications",
    title: "Communications",
    metrics: [
      metric("msg-out", "Messages envoyés", messagesOut, "count", prevMessagesOut),
      metric("msg-in", "Messages reçus", messagesIn, "count", null),
    ],
    rows: [],
    emptyLabel: "Aucun message sur cette période.",
    unavailable: [],
  });

  return sections;
}

/* ═══════════════════════ ENSEIGNANT ═══════════════════════ */

async function teachingSections(actor: ActorContext, period: Period): Promise<ReportSection[]> {
  const prev = await comparisonPeriod(actor, period);
  const classIds = await teacherClassIds(actor);

  // Aucune classe couverte : on renvoie une section honnête plutôt que des
  // compteurs à zéro qui laisseraient croire à un travail vide.
  if (classIds.length === 0) {
    return [{
      id: "teach-classes",
      title: "Mes classes",
      metrics: [],
      rows: [],
      emptyLabel:
        "Aucune classe ne vous est rattachée — ni affectation (TeachingAssignment), ni titularité. " +
        "Demandez au secrétariat de vous affecter à une classe.",
      unavailable: [],
    }];
  }

  const inClasses = { classId: { in: classIds } };

  const [classes, students, gradesPeriod, prevGradesPeriod, gradesTotal, rcByStatus] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: actor.schoolId, id: { in: classIds } },
      select: { id: true, name: true, _count: { select: { enrollments: true } } },
      orderBy: { name: "asc" },
    }),
    // ⚠️ Deux verrous plutôt qu'un. `classIds` vient déjà de `teacherClassIds()`,
    // donc de l'école de l'acteur ; mais `Enrollment` n'a pas de `schoolId` propre,
    // et la portée reposerait alors sur la seule provenance d'un tableau. Le filtre
    // sur la relation `class` rend l'isolation lisible dans la requête elle-même.
    prisma.enrollment.count({ where: { ...inClasses, class: { schoolId: actor.schoolId } } }),
    // `Grade.teacherId` est renseigné à la saisie : le rapport d'un enseignant
    // ne compte QUE ses propres saisies, pas celles d'un collègue sur la même classe.
    prisma.grade.count({ where: { ...inClasses, teacherId: actor.userId, ...periodFilter(period, "createdAt") } }),
    prev
      ? prisma.grade.count({ where: { ...inClasses, teacherId: actor.userId, ...periodFilter(prev, "createdAt") } })
      : Promise.resolve(null),
    prisma.grade.count({ where: { ...inClasses, teacherId: actor.userId } }),
    prisma.reportCard.groupBy({
      by: ["status"],
      where: { schoolId: actor.schoolId, ...inClasses },
      _count: { _all: true },
    }),
  ]);

  const rcCount = (s: string) => rcByStatus.find((r) => r.status === s)?._count._all ?? 0;

  const rcRows = await prisma.reportCard.findMany({
    where: { schoolId: actor.schoolId, ...inClasses },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true, status: true, updatedAt: true, validatedById: true, returnedReason: true,
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true } },
    },
  });
  const names = await actorNames(actor, rcRows.map((r) => r.validatedById));

  return [
    {
      id: "teach-classes",
      title: "Mes classes",
      metrics: [
        metric("classes", "Classes couvertes", classes.length, "count", null,
          classes.map((c) => `${c.name} (${c._count.enrollments})`).join(" · ")),
        metric("students", "Élèves concernés", students, "count", null),
      ],
      rows: [],
      unavailable: [],
    },
    {
      id: "teach-notes",
      title: "Saisie des notes",
      description: "Vos saisies uniquement — les notes d'un collègue sur la même classe ne sont pas comptées ici.",
      metrics: [
        metric("grades-period", "Notes saisies sur la période", gradesPeriod, "count", prevGradesPeriod),
        metric("grades-total", "Notes saisies au total", gradesTotal, "count", null),
      ],
      rows: [],
      emptyLabel: "Aucune note saisie sur cette période.",
      unavailable: [],
    },
    {
      id: "teach-bulletins",
      title: "Bulletins de mes classes",
      description: "Ce qu'il vous reste à traiter, et ce qui est parti au secrétariat.",
      metrics: [
        metric("rc-draft", "Saisie en cours", rcCount("DRAFT"), "count", null, "Encore modifiables."),
        metric("rc-returned", "À corriger", rcCount("RETURNED"), "count", null, "Renvoyés par le secrétariat."),
        metric("rc-validated", "Validés", rcCount("VALIDATED"), "count", null),
        metric("rc-submitted", "Déposés", rcCount("SUBMITTED"), "count", null),
        metric("rc-approved", "Approuvés", rcCount("APPROVED"), "count", null),
      ],
      rows: rcRows.map((r) => ({
        id: r.id,
        who: names.get(r.validatedById ?? "") ?? null,
        what: `${r.student.firstName} ${r.student.lastName} · ${r.class.name}`
          + (r.returnedReason ? ` — motif : ${r.returnedReason}` : ""),
        when: r.updatedAt,
        state: { domain: "reportCard" as StatusDomain, value: String(r.status) },
        amount: null,
      })),
      emptyLabel: "Aucun bulletin ouvert sur vos classes.",
      unavailable: [NO_PRINT_TRACE],
    },
  ];
}

/* ═════════════ ENSEIGNEMENT — vue consolidée (direction) ═════════════ */

/**
 * Enseignement à l'échelle de l'établissement.
 *
 * ⚠️ Distincte de `teachingSections()`, qui est bornée aux classes d'UN
 * enseignant. La direction doit voir l'ensemble ; un enseignant ne doit jamais
 * voir le travail d'un collègue (PARTIE C). Deux fonctions, deux portées — les
 * confondre en ajoutant un drapeau aurait fini par exposer l'une à l'autre.
 */
async function teachingOverviewSections(actor: ActorContext, period: Period): Promise<ReportSection[]> {
  const prev = await comparisonPeriod(actor, period);
  const school = { schoolId: actor.schoolId };

  const [classes, teachers, gradesPeriod, prevGrades, rcByStatus, assignments] = await Promise.all([
    prisma.class.count({ where: school }),
    prisma.user.count({ where: { ...school, role: "TEACHER" } }),
    prisma.grade.count({ where: { class: school, ...periodFilter(period, "createdAt") } }),
    prev ? prisma.grade.count({ where: { class: school, ...periodFilter(prev, "createdAt") } }) : Promise.resolve(null),
    prisma.reportCard.groupBy({ by: ["status"], where: school, _count: { _all: true } }),
    prisma.teachingAssignment.count({ where: school }),
  ]);

  const rc = (st: string) => rcByStatus.find((r) => r.status === st)?._count._all ?? 0;

  return [
    {
      id: "teach-overview",
      title: "Classes et enseignants",
      metrics: [
        metric("t-classes", "Classes", classes, "count", null),
        metric("t-teachers", "Enseignants", teachers, "count", null),
        metric("t-assign", "Affectations saisies", assignments, "count", null,
          assignments === 0
            ? "Aucune affectation : chaque enseignant retombe sur le filet « professeur principal »."
            : undefined),
      ],
      rows: [],
      unavailable: [],
    },
    {
      id: "teach-grades-overview",
      title: "Saisie des notes",
      metrics: [metric("t-grades", "Notes saisies sur la période", gradesPeriod, "count", prevGrades,
        "Toutes classes de l'établissement.")],
      rows: [],
      emptyLabel: "Aucune note saisie sur cette période.",
      unavailable: [],
    },
    {
      id: "teach-rc-overview",
      title: "Bulletins — éléments à traiter",
      metrics: [
        metric("t-draft", "Saisie en cours", rc("DRAFT"), "count", null),
        metric("t-validated", "Validés", rc("VALIDATED"), "count", null),
        metric("t-submitted", "Déposés au secrétariat", rc("SUBMITTED"), "count", null),
        metric("t-returned", "Renvoyés pour correction", rc("RETURNED"), "count", null),
        metric("t-approved", "Approuvés", rc("APPROVED"), "count", null),
      ],
      rows: [],
      unavailable: [NO_PRINT_TRACE],
    },
  ];
}

/* ═══════════════════════ DIRECTION ═══════════════════════ */

/**
 * Sections propres à la direction : ce qui traverse les services.
 *
 * ⚠️ Ne contient PAS les sections des services — celles-ci sont assemblées en
 * groupes par `buildReport()`. Les recopier ici les aurait dupliquées dans la
 * page.
 */
async function directionCrossSections(actor: ActorContext, period: Period): Promise<{
  summary: ReportSection;
  other: ReportSection[];
}> {
  const school = { schoolId: actor.schoolId };

  const [snap, money, fc, rcSubmitted, expSubmitted, stSubmitted, feeRequests, studentsPending, audit] =
    await Promise.all([
      financeSnapshot(actor, period),
      moneyPicture(actor, period),
      forecast(actor),
      prisma.reportCard.count({ where: { ...school, status: "SUBMITTED" } }),
      prisma.expense.count({ where: { ...school, status: "SUBMITTED" } }),
      prisma.financialStatement.count({ where: { ...school, status: "SUBMITTED" } }),
      prisma.feeChangeRequest.count({ where: { ...school, status: "SUBMITTED" } }),
      prisma.student.count({ where: { ...school, status: "PENDING" } }),
      prisma.auditLog.findMany({
        where: school,
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, action: true, entity: true, userId: true, createdAt: true },
      }),
    ]);

  const names = await actorNames(actor, audit.map((a) => a.userId));

  const summary: ReportSection = {
    id: "dir-summary",
    title: "Résumé global",
    description: "Les chiffres qui traversent les services. Le détail suit, service par service.",
    metrics: [
      metric("g-forecast", "Attendu annuel (grille)", fc?.total ?? 0, "amount", null,
        fc ? `Grille « ${fc.scheduleLabel} »` : "Aucune grille officielle active."),
      metric("g-collected", "Encaissé sur la période", snap.collected, "amount", null),
      metric("g-outstanding", "Reste à encaisser", money.outstanding, "amount", null),
      metric("g-decisions", "Décisions en attente", rcSubmitted + expSubmitted + stSubmitted + feeRequests + studentsPending,
        "count", null, "Bulletins déposés, dépenses et états transmis, demandes tarifaires, admissions à valider."),
    ],
    rows: [],
    unavailable: [],
  };

  const attente: ReportSection = {
    id: "dir-attente",
    title: "En attente de décision",
    description: "Ce qui est bloqué tant que personne n'a tranché. Chaque ligne relève d'un service différent.",
    metrics: [
      metric("wf-rc", "Bulletins déposés", rcSubmitted, "count", null, "Secrétariat."),
      metric("wf-exp", "Dépenses transmises", expSubmitted, "count", null, "Direction."),
      metric("wf-st", "États financiers transmis", stSubmitted, "count", null, "Direction."),
      metric("wf-fee", "Demandes tarifaires", feeRequests, "count", null, "Direction — Réglages › Grille tarifaire."),
      metric("wf-students", "Admissions à valider", studentsPending, "count", null, "Secrétariat."),
    ],
    rows: [],
    unavailable: [],
  };

  const activite: ReportSection = {
    id: "dir-activite",
    title: "Activité tracée",
    description: "Journal des actes enregistrés, tous services confondus — qui, quoi, quand.",
    metrics: [],
    rows: audit.map((a) => ({
      id: a.id,
      who: names.get(a.userId) ?? "Compte supprimé",
      what: `${a.entity} · ${a.action}`,
      when: a.createdAt,
      state: null,
      amount: null,
    })),
    emptyLabel:
      "Aucun acte tracé. Le journal (`AuditLog`) n'est alimenté que depuis le lot 10 : " +
      "les actions antérieures n'y figurent pas.",
    unavailable: [],
  };

  return { summary, other: [attente, activite] };
}

/* ═══════════════════════ PARENT ═══════════════════════ */

/**
 * Rapport d'une famille.
 *
 * ⚠️ **Aucun total d'établissement n'entre ici.** `financeSnapshot()` est
 * volontairement absent : il agrège toute l'école. La portée passe par
 * `invoiceScope()`, la même fonction qui protège l'écran Paiements — deux
 * chemins mènent d'un parent à une facture (lien direct, ou via l'élève), et
 * les deux sont nécessaires.
 */
async function familySections(actor: ActorContext, period: Period): Promise<ReportSection[]> {
  const scope = invoiceScope(actor);

  const [children, invoices] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId: actor.schoolId, parentId: actor.userId },
      select: {
        id: true, firstName: true, lastName: true, status: true, createdAt: true,
        enrollments: { select: { class: { select: { name: true } } }, take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.invoice.findMany({
      where: scope,
      select: { id: true, title: true, totalAmount: true, status: true, dueDate: true },
      orderBy: { dueDate: "desc" },
    }),
  ]);

  const invoiceIds = invoices.map((i) => i.id);

  // ⚠️ Un tableau vide est passé volontairement quand la famille n'a aucune
  // facture : `invoiceId: { in: [] }` ne correspond à rien, ce qui est le
  // résultat juste. L'omettre ferait remonter les encaissements de l'école.
  const [paidRows, payments] = await Promise.all([
    collectedByMethod(actor, { invoiceIds }),
    prisma.payment.findMany({
      where: { schoolId: actor.schoolId, invoiceId: { in: invoiceIds }, ...periodFilter(period, "createdAt") },
      select: { id: true, amount: true, method: true, createdAt: true, invoice: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const paidTotal = paidRows.reduce((s, m) => s + m.amount, 0);
  const billedTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const paidOnPeriod = payments.reduce((s, p) => s + p.amount, 0);

  const messages = await prisma.message.findMany({
    where: { schoolId: actor.schoolId, parentId: actor.userId, ...periodFilter(period, "createdAt") },
    select: { id: true, direction: true, status: true, content: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return [
    {
      id: "fam-enfants",
      title: "Mes enfants",
      metrics: [metric("children", "Enfants rattachés", children.length, "count", null)],
      rows: children.map((c) => ({
        id: c.id,
        who: null,
        what: `${c.firstName} ${c.lastName}${c.enrollments[0] ? ` · ${c.enrollments[0].class.name}` : ""}`,
        when: c.createdAt,
        state: { domain: "student" as StatusDomain, value: String(c.status) },
        amount: null,
      })),
      emptyLabel: "Aucun enfant n'est rattaché à votre compte.",
      unavailable: [],
    },
    {
      id: "fam-factures",
      title: "Mes factures",
      description: "Uniquement les factures de votre famille.",
      metrics: [
        metric("billed", "Total facturé", billedTotal, "amount", null,
          "⚠️ Deux factures de l'établissement portent un montant à 0 alors qu'elles ont été réglées — donnée historique non corrigée."),
        metric("paid", "Total réglé", paidTotal, "amount", null, "Somme de vos versements enregistrés, toutes périodes."),
        metric("paid-period", "Réglé sur la période", paidOnPeriod, "amount", null),
      ],
      rows: invoices.map((i) => ({
        id: i.id,
        who: null,
        what: i.title,
        when: i.dueDate,
        state: { domain: "invoice" as StatusDomain, value: String(i.status) },
        amount: i.totalAmount,
      })),
      emptyLabel: "Aucune facture ne vous est rattachée.",
      unavailable: [NO_DOC_OWNER],
    },
    {
      id: "fam-paiements",
      title: "Mes versements",
      metrics: [],
      rows: payments.map((p) => ({
        id: p.id,
        who: null,
        what: `${p.invoice?.title ?? "Facture"} · ${String(p.method)}`,
        when: p.createdAt,
        state: null,
        amount: p.amount,
      })),
      emptyLabel: "Aucun versement sur cette période.",
      unavailable: [],
    },
    {
      id: "fam-messages",
      title: "Mes messages",
      metrics: [metric("msg", "Messages sur la période", messages.length, "count", null)],
      rows: messages.map((m) => ({
        id: m.id,
        who: m.direction === "INBOUND" ? "Vous" : "L'établissement",
        what: m.content.length > 90 ? `${m.content.slice(0, 90)}…` : m.content,
        when: m.createdAt,
        state: { domain: "message" as StatusDomain, value: String(m.status) },
        amount: null,
      })),
      emptyLabel: "Aucun message sur cette période.",
      unavailable: [],
    },
  ];
}

/* ═══════════════════════ point d'entrée ═══════════════════════ */

const HEADINGS: Record<ReportAudience, { title: string; description: string }> = {
  direction: {
    title: "Rapport de direction",
    description: "Vue consolidée : finances, activité de chaque service et décisions en attente.",
  },
  finance: {
    title: "Rapport financier",
    description: "Encaissements, dépenses, créances et états transmis à la direction.",
  },
  secretariat: {
    title: "Rapport du secrétariat",
    description: "Dossiers élèves, demandes de documents, bulletins et communications.",
  },
  teaching: {
    title: "Mon rapport d'enseignement",
    description: "Vos classes, vos saisies de notes et l'état de vos bulletins.",
  },
  family: {
    title: "Mon rapport",
    description: "Les informations de votre famille : enfants, factures, versements et messages.",
  },
};

/**
 * Construit le rapport correspondant au rôle de l'acteur.
 *
 * L'appelant a déjà vérifié `hasAccess()` ; cette fonction ne réautorise rien.
 * Elle refuse en revanche de produire quoi que ce soit pour un rôle sans
 * audience déclarée, plutôt que de retomber sur une vue générique.
 */
export async function buildReport(actor: ActorContext, period: Period): Promise<Report | null> {
  const audience = audienceForRole(actor.role);
  if (!audience) return null;

  const prev = await comparisonPeriod(actor, period);
  const notes = await unreadNotifications(actor, 5);

  const groups: ReportGroup[] = [];
  let summary: ReportSection | null = null;

  if (audience === "direction") {
    // PARTIE B/N — la direction voit tout, mais rangé par service.
    const [cross, fin, sec, teach] = await Promise.all([
      directionCrossSections(actor, period),
      financeSections(actor, period),
      secretariatSections(actor, period),
      teachingOverviewSections(actor, period),
    ]);
    summary = cross.summary;
    groups.push(
      { id: "finance", title: "Finance", description: "Gestionnaire / équipe financière.", sections: fin },
      { id: "secretariat", title: "Secrétariat", description: "Dossiers, documents, bulletins, communications.", sections: sec },
      { id: "teaching", title: "Enseignement", description: "Classes, notes et bulletins de l'établissement.", sections: teach },
      {
        id: "other",
        title: "Autres métriques",
        // PARTIE N — regroupement des métriques RÉELLEMENT disponibles qui ne
        // relèvent pas d'un seul service. Rien n'y est inventé pour la remplir :
        // les deux sections présentes sont transverses par nature.
        description: "Métriques transverses, qui ne relèvent pas d'un seul service.",
        sections: cross.other,
      },
    );
  } else if (audience === "finance") {
    // PARTIE O — un seul groupe. Les autres ne sont pas construits, donc pas
    // rendus : aucune donnée pédagogique ou familiale n'atteint le DOM.
    groups.push({ id: "finance", title: "Finance", sections: await financeSections(actor, period) });
  } else if (audience === "secretariat") {
    groups.push({ id: "secretariat", title: "Secrétariat", sections: await secretariatSections(actor, period) });
  } else if (audience === "teaching") {
    groups.push({ id: "teaching", title: "Enseignement", sections: await teachingSections(actor, period) });
  } else {
    groups.push({ id: "family", title: "Ma famille", sections: await familySections(actor, period) });
  }

  return {
    audience,
    ...HEADINGS[audience],
    summary,
    // Un groupe sans aucune section n'est pas rendu du tout.
    groups: groups.filter((g) => g.sections.length > 0),
    comparable: prev !== null,
    comparisonLabel: prev?.label ?? null,
    notifications: notes.map((n) => ({
      id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt,
    })),
  };
}
