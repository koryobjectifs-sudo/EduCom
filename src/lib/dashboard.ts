import { prisma } from "@/lib/prisma";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { configurationReadiness, schoolCalendar } from "@/lib/pedagogy";
import { monthlyForecast } from "@/lib/fees";
import { pickCurrentTerm } from "@/lib/terms";
import type { ActorContext } from "@/lib/audit";

/**
 * Socle de données du **poste de commandement** — tableau de bord.
 *
 * ═══ LE TYPE QUI INTERDIT LA FAUSSE DONNÉE ═══
 *
 * Chaque bloc du tableau de bord renvoie un `Signal<T>` : soit une valeur
 * mesurée, soit une **raison** de son absence. Un composant ne peut donc pas
 * afficher un chiffre qui n'a pas été calculé — il n'y a pas de chemin de code
 * qui le permette. C'est structurel, pas une discipline qu'on se promet de
 * tenir.
 *
 * Le lot 08 avait retiré quatre fictions du tableau de bord (objectif d'élèves
 * à 500, taux de présence à 98 %, liste de tâches en dur, flux d'activité
 * inventé). Elles étaient toutes apparues de la même façon : un composant
 * capable d'afficher une valeur qu'aucune requête ne produisait. `Signal` ferme
 * cette porte.
 *
 * ═══ CE QUI N'EST PAS MESURABLE AUJOURD'HUI, ET POURQUOI ═══
 *
 * ⚠️ **La présence n'existe pas au schéma.** Aucun modèle d'appel, d'absence ou
 * de retard — vérifié sur `prisma/schema.prisma`. Les blocs « Aujourd'hui » et
 * l'axe « Présence » de la santé de l'école sont donc câblés mais déclarés
 * indisponibles, avec la raison affichée à l'écran. Le jour où un modèle
 * `Attendance` arrive, seul `todaySignal()` change ; l'interface est prête.
 *
 * ⚠️ **L'académique dépend de `Grade`, qui peut être vide.** La moyenne n'est
 * calculée que s'il existe des notes ET au moins un trimestre. Sinon : raison
 * affichée, pas de zéro trompeur.
 */

export type Signal<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

const ok = <T,>(value: T): Signal<T> => ({ ok: true, value });
const nope = (reason: string): Signal<never> => ({ ok: false, reason });

/* ═══════════════════════ ce qui demande une action ═══════════════════════ */

/**
 * Trois niveaux, et le niveau porte une décision, pas une couleur :
 * `urgent` = quelqu'un attend, `watch` = ça se dégrade si on ne fait rien,
 * `info` = bon à savoir, aucune action attendue.
 */
export type Severity = "urgent" | "watch" | "info";

/**
 * ⚠️ `icon` est une **clé**, pas un composant. `AttentionCenter` est un module
 * `"use client"` : une fonction React ne traverse pas la frontière RSC, et lui
 * passer `TriangleAlert` produirait « Element type is invalid ». Le client
 * résout la clé dans sa propre table.
 */
export type AttentionEntry = {
  id: string;
  severity: Severity;
  label: string;
  detail: string;
  count: number;
  href: string;
  cta: string;
  icon: string;
};

/* ═══════════════════════════ santé de l'école ═══════════════════════════ */

export type HealthAxis = {
  id: "presence" | "academic" | "finance" | "staff" | "parents";
  label: string;
  /** Note sur 100, ou `null` si l'axe n'est pas mesurable. */
  score: number | null;
  /** Ce que l'axe mesure réellement, en clair. Jamais un slogan. */
  caption: string;
  /**
   * Lecture humaine de la mesure — « 0 / 6 classes avec responsable ».
   *
   * ⚠️ Un pourcentage seul est une abstraction : « Personnel — 0 % » ne dit pas
   * à une directrice ce qu'elle doit faire, là où « 0 / 6 classes avec
   * responsable » se comprend sans traduction. Le pourcentage reste pour la
   * barre ; c'est cette phrase que l'écran met en avant.
   */
  display: string | null;
  /** Ce qu'il y a à faire quand l'axe est mesuré ET mauvais. */
  action?: { label: string; href: string };
};

/* ═══════════════════════════ activité récente ═══════════════════════════ */

export type ActivityKind =
  | "payment" | "enrollment" | "message" | "document" | "reportCard";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  label: string;
  at: Date;
};

/* ═════════════════════════════ l'instantané ═════════════════════════════ */

export type TodayFacts = {
  presentRate: number;
  absentRate: number;
  lateCount: number;
  staffPresentRate: number;
  anomalies: string[];
};

export type FinanceFacts = {
  recoveryRate: number | null;
  collected: number;
  outstanding: number;
  expected: number;
  lateFamilies: number;
  overdueAmount: number;
};

export type AcademicFacts = {
  average: number;
  termName: string;
  delta: number | null;
  movements: { label: string; direction: "up" | "down"; detail: string }[];
};

export type ParentsFacts = {
  reachableRate: number;
  reachable: number;
  totalParents: number;
  unreachable: number;
  readRate: number | null;
  sent: number;
  inboundPending: number;
};

export type DashboardSnapshot = {
  firstName: string | null;
  schoolName: string | null;
  scope: { money: boolean; students: boolean; validation: boolean };
  hasDemoData: boolean;
  fresh: { enrolled: number; pending: number; classes: number };
  activation: {
    isActivated: boolean;
    progress: number;
    steps: {
      schoolConfigured: boolean;
      classesCreated: boolean;
      studentsAdded: boolean;
      teachersAdded: boolean;
      firstActionDone: boolean;
    };
  };
  brief: {
    tone: "good" | "mixed" | "attention";
    summary: string;
    priorities: { severity: Severity; title: string; detail: string; href: string }[];
    /**
     * Totaux RÉELS, tous paliers confondus.
     *
     * ⚠️ `priorities` est tronqué à 3 actions : compter dessus ferait annoncer
     * « 3 interventions attendues » à une école qui en a 5. Le hero lit ces
     * totaux, jamais la longueur du tableau affiché.
     */
    counts: { urgent: number; watch: number; info: number };
  };
  attention: AttentionEntry[];
  health: { score: Signal<number>; axes: HealthAxis[] };
  today: Signal<TodayFacts>;
  finance: Signal<FinanceFacts>;
  academic: Signal<AcademicFacts>;
  parents: Signal<ParentsFacts>;
  activity: ActivityEvent[];
  invoices: {
    id: string; title: string; status: string; totalAmount: number;
    createdAt: Date; student: string | null;
  }[];
};

/**
 * La présence, aujourd'hui.
 *
 * ⚠️ **Volontairement toujours indisponible.** Ce n'est pas un oubli : il
 * n'existe aucun modèle de présence au schéma. La fonction est isolée pour que
 * l'ajout futur d'un modèle `Attendance` ne touche que ces quelques lignes —
 * `TodayPanel` sait déjà afficher `TodayFacts`.
 */
async function todaySignal(_actor: ActorContext): Promise<Signal<TodayFacts>> {
  return nope(
    "Le suivi des présences n'est pas encore activé : aucun appel n'est enregistré dans EduCom.",
  );
}

/* ═════════════════════════════════ finance ═════════════════════════════════ */

async function financeSignal(
  actor: ActorContext,
  now: Date,
): Promise<{ signal: Signal<FinanceFacts>; overdueCount: number; lateFamilies: number }> {
  const { schoolId } = actor;

  const [invoices, paid, expected] = await Promise.all([
    prisma.invoice.findMany({
      where: { schoolId },
      select: {
        id: true, totalAmount: true, status: true, dueDate: true,
        student: { select: { id: true, parentId: true } },
      },
    }),
    prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
    monthlyForecast(actor),
  ]);

  const collected = paid._sum.amount ?? 0;

  /**
   * ⚠️ Le retard se dérive de `dueDate`, jamais du seul statut `OVERDUE` : ce
   * statut n'est écrit que par le balayage de `src/lib/overdue.ts`, qui peut ne
   * pas être passé depuis ce matin. Même règle que `invoiceOverview()`.
   */
  const late = invoices.filter((i) => i.status !== "PAID" && i.dueDate < now);
  const overdueAmount = late.reduce((s, i) => s + i.totalAmount, 0);

  // Une « famille » = un parent. À défaut de parent rattaché, l'élève compte
  // pour lui-même : sinon des retards réels disparaîtraient du comptage.
  const families = new Set(
    late.map((i) => i.student?.parentId ?? (i.student ? `s:${i.student.id}` : `i:${i.id}`)),
  );

  const billed = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const outstanding = Math.max(0, expected - collected);

  if (invoices.length === 0 && collected === 0 && expected === 0) {
    return {
      signal: nope("Aucune facture émise et aucune grille tarifaire active : rien à recouvrer pour l'instant."),
      overdueCount: 0,
      lateFamilies: 0,
    };
  }

  return {
    signal: ok({
      // Le taux n'a de sens que s'il y a eu facturation. Sans base, il reste nul
      // plutôt que d'afficher 0 % ou 100 % au hasard.
      recoveryRate: billed > 0 ? Math.round((collected / billed) * 100) : null,
      collected,
      outstanding,
      expected,
      lateFamilies: families.size,
      overdueAmount,
    }),
    overdueCount: late.length,
    lateFamilies: families.size,
  };
}

/* ════════════════════════════════ académique ════════════════════════════════ */

/**
 * Moyenne de l'établissement sur le trimestre le plus récent, et écart avec le
 * précédent.
 *
 * ⚠️ Chaque note est ramenée sur 20 par son propre `max` avant d'être moyennée,
 * et pondérée par son coefficient. Additionner des notes sur 10 et sur 20 sans
 * les normaliser produit une moyenne qui ne veut rien dire — et personne ne
 * s'en apercevrait à l'écran.
 */
async function academicSignal(actor: ActorContext): Promise<Signal<AcademicFacts>> {
  const { schoolId } = actor;

  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  if (terms.length === 0) {
    return nope("Aucun trimestre n'est encore déclaré : la moyenne de l'établissement ne peut pas être située dans le temps.");
  }

  /**
   * ⚠️ La règle du « trimestre courant » vit dans `src/lib/terms.ts`, et nulle
   * part ailleurs. Elle a été écrite deux fois, et la copie d'ici s'est trompée :
   * un trimestre sans dates devenait le trimestre courant (les `NULL` sortent en
   * dernier d'un `ORDER BY ASC` sous Postgres) et effaçait la moyenne réelle.
   */
  const { current, previous } = pickCurrentTerm(terms);
  if (!current) {
    return nope("Aucun trimestre exploitable.");
  }

  const grades = await prisma.grade.findMany({
    where: { class: { schoolId }, termId: { in: previous ? [current.id, previous.id] : [current.id] } },
    select: {
      value: true, max: true, coefficient: true, termId: true,
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });
  if (grades.length === 0) {
    return nope("Aucune note n'a encore été saisie : la performance académique se calculera dès les premières évaluations.");
  }

  /** Moyenne pondérée, sur 20, d'un lot de notes. */
  const mean = (rows: typeof grades) => {
    let num = 0, den = 0;
    for (const g of rows) {
      if (!g.max || g.max <= 0) continue;
      const coef = g.coefficient > 0 ? g.coefficient : 1;
      num += (g.value / g.max) * 20 * coef;
      den += coef;
    }
    return den > 0 ? num / den : null;
  };

  const currentRows = grades.filter((g) => g.termId === current.id);
  const currentMean = mean(currentRows);
  if (currentMean === null) {
    return nope(`Aucune note exploitable sur « ${current.name} ».`);
  }

  const previousMean = previous ? mean(grades.filter((g) => g.termId === previous.id)) : null;

  // Mouvements par couple classe × matière, uniquement si les deux trimestres
  // sont renseignés — un « mouvement » sans point de comparaison n'existe pas.
  const movements: AcademicFacts["movements"] = [];
  if (previous && previousMean !== null) {
    const keys = new Map<string, { className: string; subject: string }>();
    for (const g of grades) {
      keys.set(`${g.class.id}|${g.subject.id}`, { className: g.class.name, subject: g.subject.name });
    }
    for (const [key, meta] of keys) {
      const [classId, subjectId] = key.split("|");
      const pick = (termId: string) =>
        grades.filter((g) => g.class.id === classId && g.subject.id === subjectId && g.termId === termId);
      const a = mean(pick(current.id));
      const b = mean(pick(previous.id));
      if (a === null || b === null) continue;
      const diff = a - b;
      if (Math.abs(diff) < 1) continue; // moins d'un point sur 20 : du bruit
      movements.push({
        label: `${meta.className} — ${meta.subject}`,
        direction: diff > 0 ? "up" : "down",
        detail: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pt vs ${previous.name}`,
      });
    }
    movements.sort((x, y) => Math.abs(parseFloat(y.detail)) - Math.abs(parseFloat(x.detail)));
  }

  return ok({
    average: Math.round((currentMean / 20) * 100),
    termName: current.name,
    delta:
      previousMean !== null
        ? Math.round(((currentMean - previousMean) / 20) * 100)
        : null,
    movements: movements.slice(0, 3),
  });
}

/* ═════════════════════════════ parents & familles ═════════════════════════════ */

/**
 * ⚠️ Le **taux de familles joignables** est la donnée la plus utile de ce bloc,
 * et la seule qui soit pleinement fiable aujourd'hui : elle se lit sur
 * `User.phone`. Le taux de lecture, lui, dépend de `Message.status`, qu'aucun
 * canal n'écrit encore (`src/lib/channels.ts` a un registre vide) — il n'est
 * donc renvoyé que s'il existe réellement des messages sortants.
 */
async function parentsSignal(actor: ActorContext): Promise<Signal<ParentsFacts>> {
  const { schoolId } = actor;

  const [totalParents, reachable, sent, read, inbound] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: "PARENT" } }),
    prisma.user.count({ where: { schoolId, role: "PARENT", phone: { not: null } } }),
    prisma.message.count({ where: { schoolId, direction: "OUTBOUND" } }),
    prisma.message.count({ where: { schoolId, direction: "OUTBOUND", status: "READ" } }),
    prisma.message.count({ where: { schoolId, direction: "INBOUND" } }),
  ]);

  if (totalParents === 0) {
    return nope("Aucun compte famille n'est encore rattaché à l'établissement.");
  }

  return ok({
    reachableRate: Math.round((reachable / totalParents) * 100),
    reachable,
    totalParents,
    unreachable: totalParents - reachable,
    readRate: sent > 0 ? Math.round((read / sent) * 100) : null,
    sent,
    inboundPending: inbound,
  });
}

/* ═══════════════════════════ santé de l'établissement ═══════════════════════════ */

/**
 * Le score global n'est publié que si **au moins trois axes sur cinq** sont
 * réellement mesurés.
 *
 * ⚠️ C'est la garde la plus importante de ce fichier. Un « 89 / 100 » calculé
 * sur un seul axe disponible aurait l'air d'un diagnostic complet alors qu'il ne
 * regarde qu'un cinquième de l'école — précisément le genre de chiffre qui
 * inspire une confiance qu'il ne mérite pas. En dessous du seuil, la vue reste
 * synthétique et le dit.
 */
const HEALTH_MIN_AXES = 3;

function buildHealth(
  finance: Signal<FinanceFacts>,
  academic: Signal<AcademicFacts>,
  parents: Signal<ParentsFacts>,
  today: Signal<TodayFacts>,
  staff: { classes: number; withTeacher: number },
): { score: Signal<number>; axes: HealthAxis[] } {
  const staffScore = staff.classes > 0 ? Math.round((staff.withTeacher / staff.classes) * 100) : null;

  const axes: HealthAxis[] = [
    {
      id: "presence",
      label: "Présence",
      score: today.ok ? today.value.presentRate : null,
      caption: today.ok ? "Élèves présents aujourd'hui" : "Suivi des présences non activé dans EduCom",
      // Le pourcentage est déjà à droite de la ligne : le répéter ici n'ajoute
      // rien et vole la place de l'explication.
      display: null,
    },
    {
      id: "academic",
      label: "Académique",
      score: academic.ok ? academic.value.average : null,
      caption: academic.ok ? `Moyenne — ${academic.value.termName}` : "Aucune note saisie pour l'instant",
      display: null,
      action: academic.ok ? undefined : { label: "Saisir des notes", href: "/dashboard/grades" },
    },
    {
      id: "finance",
      label: "Finance",
      score: finance.ok ? finance.value.recoveryRate : null,
      caption:
        finance.ok && finance.value.recoveryRate !== null
          ? "Part des montants facturés déjà encaissés"
          : "Aucune facture émise pour l'instant",
      display: null,
      action: finance.ok && finance.value.recoveryRate !== null ? undefined : { label: "Facturer", href: "/dashboard/payments" },
    },
    {
      id: "staff",
      label: "Personnel",
      score: staffScore,
      caption: staff.classes > 0 ? "Classes dotées d'un responsable désigné" : "Aucune classe créée",
      display: staff.classes > 0
        ? `${staff.withTeacher} / ${staff.classes} classe${staff.classes > 1 ? "s" : ""} avec responsable`
        : null,
      // Un axe mesuré ET insuffisant porte son action : c'est là que le score
      // cesse d'être une statistique pour devenir une décision.
      action: staffScore !== null && staffScore < 100 ? { label: "Affecter", href: "/dashboard/classes" } : undefined,
    },
    {
      id: "parents",
      label: "Parents",
      score: parents.ok ? parents.value.reachableRate : null,
      caption: parents.ok ? "Familles disposant d'un numéro de téléphone" : "Aucune famille rattachée",
      display: parents.ok
        ? `${parents.value.reachable} / ${parents.value.totalParents} famille${parents.value.totalParents > 1 ? "s" : ""} joignable${parents.value.totalParents > 1 ? "s" : ""}`
        : null,
      action:
        parents.ok && parents.value.unreachable > 0
          ? { label: "Compléter", href: "/dashboard/team" }
          : undefined,
    },
  ];

  const measured = axes.filter((a) => a.score !== null);
  if (measured.length < HEALTH_MIN_AXES) {
    return {
      score: nope(
        `Score global disponible dès que ${HEALTH_MIN_AXES} des ${axes.length} axes seront mesurables (${measured.length} aujourd'hui).`,
      ),
      axes,
    };
  }

  const avg = measured.reduce((s, a) => s + (a.score as number), 0) / measured.length;
  return { score: ok(Math.round(avg)), axes };
}

/* ════════════════════════════════ l'assemblage ════════════════════════════════ */

export async function dashboardSnapshot(
  actor: ActorContext,
  identity: { firstName: string | null; schoolName: string | null },
): Promise<DashboardSnapshot> {
  const { schoolId } = actor;
  const role = actor.role as RoleType;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const scope = {
    money: hasAccess(role, "/dashboard/payments"),
    students: hasAccess(role, "/dashboard/students"),
    validation: hasAccess(role, "/dashboard/documents/validation"),
    // Direction et secrétariat : les seuls à pouvoir agir sur la configuration
    // pédagogique. Annoncer un manque à qui ne peut pas le combler est du bruit.
    pedagogie: hasAccess(role, "/dashboard/settings/pedagogie"),
  };

  const [
    enrolled, pending, classes, classesWithTeacher,
    submittedReportCards, docRequests, docsToReview,
    recentPayments, recentStudents, recentMessages, recentDocs, recentReportCards,
    invoices,
    financeBundle, academic, parents, today, readiness, calendrier,
    teachersCount, gradesCount,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: "ENROLLED" } }),
    prisma.student.count({ where: { schoolId, status: "PENDING" } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId, teacherId: { not: null } } }),
    prisma.reportCard.count({ where: { schoolId, status: "SUBMITTED" } }),
    prisma.documentRequest.count({ where: { schoolId, status: "PENDING" } }),
    prisma.schoolDocument.count({ where: { schoolId, status: "REVIEW" } }),
    prisma.payment.findMany({
      where: { schoolId },
      select: { id: true, amount: true, createdAt: true, invoice: { select: { student: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.student.findMany({
      where: { schoolId }, select: { id: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.message.findMany({
      where: { schoolId, direction: "INBOUND" },
      select: { id: true, createdAt: true, parent: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.schoolDocument.findMany({
      where: { schoolId, status: "PUBLISHED" },
      select: { id: true, title: true, publishedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }, take: 5,
    }),
    prisma.reportCard.findMany({
      where: { schoolId },
      select: { id: true, status: true, updatedAt: true, student: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" }, take: 5,
    }),
    prisma.invoice.findMany({
      where: { schoolId },
      select: {
        id: true, title: true, status: true, totalAmount: true, createdAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    financeSignal(actor, now),
    academicSignal(actor),
    parentsSignal(actor),
    todaySignal(actor),
    /**
     * ⚠️ **Mesurée, jamais déclarée.** `configurationReadiness()` recalcule
     * l'état réel à chaque lecture (voir `src/lib/pedagogy.ts`) : aucune
     * colonne « configuration terminée » n'existe, donc rien ne peut se
     * désynchroniser de la base.
     */
    configurationReadiness(actor),
    /**
     * Le calendrier pédagogique — pour que « la composition est dans cinq
     * jours » se lise sur l'ACCUEIL, et non dans un écran de réglages qu'on
     * n'ouvre qu'une fois par trimestre.
     */
    schoolCalendar(actor, now),
    prisma.user.count({ where: { schoolId, role: "TEACHER" } }),
    prisma.grade.count({ where: { class: { schoolId } } }),
  ]);

  const newStudents = recentStudents.filter((s) => s.createdAt >= thirtyDaysAgo).length;

  /* ── ce qui demande une action ── */
  const attention: AttentionEntry[] = [];

  if (scope.money && financeBundle.overdueCount > 0) {
    const amount = financeBundle.signal.ok ? financeBundle.signal.value.overdueAmount : 0;
    attention.push({
      id: "overdue",
      severity: "urgent",
      label: "Paiements en retard",
      detail: `${financeBundle.lateFamilies} famille${financeBundle.lateFamilies > 1 ? "s" : ""} · ${amount.toLocaleString("fr-FR")} FCFA à recouvrer`,
      count: financeBundle.overdueCount,
      href: "/dashboard/payments",
      cta: "Relancer",
      icon: "alert",
    });
  }
  if (scope.students && pending > 0) {
    attention.push({
      id: "admissions",
      severity: "watch",
      label: "Admissions à valider",
      detail: `${pending} dossier${pending > 1 ? "s" : ""} en attente de décision`,
      count: pending,
      href: "/dashboard/students",
      cta: "Examiner",
      icon: "userPlus",
    });
  }
  /**
   * ⚠️ **Sévérité `urgent`, et c'est délibéré.** Tant qu'une étape bloquante
   * manque, aucun enseignant de l'établissement ne peut saisir la moindre note :
   * ce n'est pas « à surveiller », c'est un arrêt de production. L'entrée
   * disparaît d'elle-même dès que la configuration est complète — elle n'a pas
   * de bouton « ignorer », parce qu'ignorer ne débloquerait rien.
   */
  if (scope.pedagogie && !readiness.canEnterGrades) {
    const manquantes = readiness.steps.filter((s) => s.blocking && s.state !== "done");
    attention.push({
      id: "pedagogie",
      severity: "urgent",
      label: "Configuration pédagogique incomplète",
      detail:
        readiness.firstBlocker?.todo ??
        `${manquantes.length} étape${manquantes.length > 1 ? "s" : ""} empêche${manquantes.length > 1 ? "nt" : ""} la saisie des notes`,
      count: manquantes.length,
      href: "/dashboard/settings/pedagogie",
      cta: "Configurer",
      icon: "graduation",
    });
  }
  if (scope.validation && submittedReportCards > 0) {
    attention.push({
      id: "reportcards",
      severity: "watch",
      label: "Bulletins à relire",
      detail: `${submittedReportCards} bulletin${submittedReportCards > 1 ? "s" : ""} transmis par les enseignants`,
      count: submittedReportCards,
      href: "/dashboard/documents/validation",
      cta: "Relire",
      icon: "clipboard",
    });
  }
  if (docsToReview > 0) {
    attention.push({
      id: "docsreview",
      severity: "watch",
      label: "Documents à valider",
      detail: `${docsToReview} document${docsToReview > 1 ? "s" : ""} en attente de publication`,
      count: docsToReview,
      href: "/dashboard/documents/centre",
      cta: "Valider",
      icon: "folder",
    });
  }
  // Une classe sans enseignant est un angle mort d'organisation : personne
  // n'est responsable de la saisie des notes pour ces élèves.
  const orphanClasses = classes - classesWithTeacher;
  if (scope.students && classes > 0 && orphanClasses > 0) {
    attention.push({
      id: "orphanclasses",
      severity: "watch",
      label: "Classes sans enseignant",
      detail: `${orphanClasses} classe${orphanClasses > 1 ? "s" : ""} sans responsable désigné`,
      count: orphanClasses,
      href: "/dashboard/classes",
      cta: "Affecter",
      icon: "school",
    });
  }
  if (parents.ok && parents.value.unreachable > 0) {
    attention.push({
      id: "unreachable",
      severity: "watch",
      label: "Familles injoignables",
      detail: `${parents.value.unreachable} famille${parents.value.unreachable > 1 ? "s" : ""} sans numéro de téléphone`,
      count: parents.value.unreachable,
      href: "/dashboard/team",
      cta: "Compléter",
      icon: "phone",
    });
  }
  if (docRequests > 0) {
    attention.push({
      id: "docrequests",
      severity: "info",
      label: "Demandes de documents",
      detail: `${docRequests} demande${docRequests > 1 ? "s" : ""} enregistrée${docRequests > 1 ? "s" : ""} par l'équipe`,
      count: docRequests,
      href: "/dashboard/documents",
      cta: "Traiter",
      icon: "fileQuestion",
    });
  }
  /**
   * **La prochaine échéance académique.**
   *
   * ⚠️ Sévérité `info` — aucune action n'est attendue, c'est un repère de
   * calendrier. La monter en `watch` ferait clignoter le tableau de bord tout
   * le trimestre pour une date qui se contente d'exister.
   *
   * ⚠️ **Fenêtre de 21 jours.** Au-delà, l'information est vraie mais inutile :
   * personne ne prépare une composition deux mois à l'avance, et une ligne
   * permanente cesse d'être lue. En deçà, elle arrive trop tard pour servir.
   *
   * ⚠️ Réservée à qui suit la scolarité. Un comptable n'a rien à faire d'une
   * date de composition ; `scope.students` est déjà le critère du reste des
   * entrées académiques.
   */
  const prochaine = calendrier.upcoming[0];
  if (scope.students && prochaine?.date) {
    const jours = Math.ceil((prochaine.date.getTime() - now.getTime()) / 86_400_000);
    if (jours <= 21) {
      attention.push({
        id: "echeance",
        severity: "info",
        label: prochaine.isComposition ? "Composition à venir" : "Contrôle à venir",
        detail:
          `${prochaine.name} · ${prochaine.termName} — ` +
          (jours <= 0
            ? "aujourd'hui"
            : jours === 1
              ? "demain"
              : `dans ${jours} jours, le ${prochaine.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`),
        count: jours,
        href: "/dashboard/grades",
        cta: "Voir la saisie",
        icon: "calendar",
      });
    }
  }
  if (newStudents > 0) {
    attention.push({
      id: "newstudents",
      severity: "info",
      label: "Nouvelles inscriptions",
      detail: `${newStudents} élève${newStudents > 1 ? "s" : ""} enregistré${newStudents > 1 ? "s" : ""} sur 30 jours`,
      count: newStudents,
      href: "/dashboard/students",
      cta: "Consulter",
      icon: "userPlus",
    });
  }

  /* ── le brief ── */
  const urgent = attention.filter((a) => a.severity === "urgent");
  const watch = attention.filter((a) => a.severity === "watch");
  const tone: "good" | "mixed" | "attention" =
    urgent.length > 0 ? "attention" : watch.length > 0 ? "mixed" : "good";

  /**
   * ⚠️ La phrase de synthèse est **composée de constats mesurés**, jamais d'un
   * texte d'ambiance. Chaque fragment ci-dessous correspond à une valeur
   * effectivement calculée plus haut ; s'il n'y a rien à dire, la phrase est
   * courte plutôt que remplie.
   */
  const bits: string[] = [];
  if (enrolled > 0) {
    bits.push(`${enrolled} élève${enrolled > 1 ? "s" : ""} inscrit${enrolled > 1 ? "s" : ""} sur ${classes} classe${classes > 1 ? "s" : ""}`);
  }
  if (financeBundle.signal.ok && financeBundle.signal.value.recoveryRate !== null) {
    bits.push(`${financeBundle.signal.value.recoveryRate} % des factures recouvrées`);
  }
  if (academic.ok) {
    bits.push(`moyenne de ${academic.value.average} % sur ${academic.value.termName}`);
  }

  const summary =
    bits.length === 0
      ? "Votre école n'a pas encore assez de données enregistrées pour établir une synthèse. Commencez par inscrire vos élèves."
      : tone === "attention"
        ? `${capitalize(bits.join(", "))}. ${urgent.length} point${urgent.length > 1 ? "s" : ""} demande${urgent.length > 1 ? "nt" : ""} une intervention aujourd'hui.`
        : tone === "mixed"
          ? `${capitalize(bits.join(", "))}. Rien d'urgent, mais ${watch.length} situation${watch.length > 1 ? "s sont" : " est"} à surveiller.`
          : `${capitalize(bits.join(", "))}. Aucun point bloquant détecté ce matin.`;

  /**
   * ⚠️ Actions et informations sont **prélevées séparément**, jamais dans une
   * file commune tronquée à trois. Avec un `slice(0, 3)` global, trois urgences
   * effaçaient les informations, et deux informations pouvaient occuper les
   * places d'actions réelles. Le hero compte les actions ; il ne peut plus
   * annoncer un nombre que la liste contredit.
   */
  const priorities = [
    ...[...urgent, ...watch].slice(0, 3),
    ...attention.filter((a) => a.severity === "info").slice(0, 2),
  ].map((a) => ({ severity: a.severity, title: a.label, detail: a.detail, href: a.href }));

  /* ── activité ── */
  const activity: ActivityEvent[] = [
    ...(scope.money
      ? recentPayments.map((p) => ({
          id: `pay-${p.id}`,
          kind: "payment" as const,
          label: p.invoice?.student
            ? `Paiement de ${p.amount.toLocaleString("fr-FR")} FCFA — ${p.invoice.student.firstName} ${p.invoice.student.lastName}`
            : `Paiement de ${p.amount.toLocaleString("fr-FR")} FCFA reçu`,
          at: p.createdAt,
        }))
      : []),
    ...recentStudents.map((s) => ({
      id: `stu-${s.id}`, kind: "enrollment" as const,
      label: `Nouvel élève enregistré — ${s.firstName} ${s.lastName}`, at: s.createdAt,
    })),
    ...recentMessages.map((m) => ({
      id: `msg-${m.id}`, kind: "message" as const,
      label: m.parent ? `Message reçu de ${m.parent.firstName} ${m.parent.lastName}` : "Message reçu d'une famille",
      at: m.createdAt,
    })),
    ...recentDocs.map((d) => ({
      id: `doc-${d.id}`, kind: "document" as const,
      label: `Document publié — ${d.title}`, at: d.publishedAt ?? d.updatedAt,
    })),
    ...(scope.validation
      ? recentReportCards.map((r) => ({
          id: `rc-${r.id}`, kind: "reportCard" as const,
          label: `Bulletin ${String(r.status).toLowerCase()} — ${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`.trim(),
          at: r.updatedAt,
        }))
      : []),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  const stepsConfig = {
    schoolConfigured: true,
    classesCreated: classes > 0,
    studentsAdded: enrolled > 0,
    teachersAdded: classesWithTeacher > 0 || teachersCount > 0,
    firstActionDone: submittedReportCards > 0 || gradesCount > 0,
  };
  const stepValues = Object.values(stepsConfig);
  const completedSteps = stepValues.filter(Boolean).length;
  const progress = Math.round((completedSteps / stepValues.length) * 100);
  const isActivated = stepsConfig.studentsAdded && stepsConfig.firstActionDone;
  
  const hasDemoData = await prisma.class.count({ where: { schoolId, name: { endsWith: "\u200B" } } }) > 0;

  return {
    firstName: identity.firstName,
    schoolName: identity.schoolName,
    scope,
    hasDemoData,
    fresh: { enrolled, pending, classes },
    activation: {
      isActivated,
      progress,
      steps: stepsConfig,
    },
    brief: {
      tone, summary, priorities,
      counts: {
        urgent: urgent.length,
        watch: watch.length,
        info: attention.filter((a) => a.severity === "info").length,
      },
    },
    attention,
    health: buildHealth(financeBundle.signal, academic, parents, today, {
      classes, withTeacher: classesWithTeacher,
    }),
    today,
    finance: financeBundle.signal,
    academic,
    parents,
    activity,
    invoices: invoices.map((i) => ({
      id: i.id, title: i.title, status: String(i.status), totalAmount: i.totalAmount,
      createdAt: i.createdAt,
      student: i.student ? `${i.student.firstName} ${i.student.lastName}` : null,
    })),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
