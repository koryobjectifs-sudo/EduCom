import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { pickCurrentTerm } from "@/lib/terms";
import { sortClasses } from "@/lib/classOrder";
import { evaluationKind, buildBulletin, type EvaluationKind, type Bulletin } from "@/lib/bulletin";
import { currentAcademicYear } from "@/lib/studentFile";

/**
 * L'espace de travail de l'enseignant — socle de `/dashboard/grades`.
 *
 * ═══ LA RÈGLE QUI GOUVERNE CE FICHIER ═══
 *
 * **Si EduCom peut savoir, EduCom ne demande pas.** L'ancien écran exigeait
 * trois décisions avant la première note : classe, trimestre, évaluation. Or les
 * trois sont déductibles :
 *
 *   · **qui enseigne** → la session ; l'utilisateur est déjà identifié ;
 *   · **quelles classes** → `TeachingAssignment`, avec `Class.teacherId` en
 *     filet tant qu'aucune affectation n'est saisie ;
 *   · **quelles matières** → l'affectation, ou toutes les matières de la classe
 *     pour un maître unique (`subjectId` nul) ;
 *   · **quel trimestre** → `pickCurrentTerm()`, source unique ;
 *   · **quelle évaluation** → celle qui est en cours de saisie, sinon la plus
 *     récente déjà commencée.
 *
 * Il ne reste **une** décision humaine : sur quelle classe je travaille. Et une
 * seconde, seulement si elle est réellement ambiguë : quelle matière, quand
 * l'enseignant en couvre plusieurs dans la même classe.
 *
 * ⚠️ **Aucune donnée n'est inventée.** Quand un élément manque — pas de
 * trimestre daté, pas d'évaluation, pas de matière rattachée — la carte porte la
 * **raison** et l'écran la montre. Jamais un compteur à zéro qui laisserait
 * croire à un suivi.
 */

/* ════════════════════════════ périmètre de saisie ════════════════════════════ */

/**
 * Quelles matières d'une classe cet utilisateur peut-il saisir ?
 *
 * ⚠️ **Source unique** : `src/app/dashboard/grades/actions.ts` importe cette
 * fonction au lieu d'en garder une copie. La règle décide qui peut écrire des
 * notes ; deux copies finiraient par diverger, et la divergence irait dans le
 * sens permissif — c'est toujours ce qui arrive.
 *
 * `"ALL"` pour la direction, pour un maître affecté sans matière précise
 * (élémentaire), et pour le professeur principal tant qu'aucune affectation
 * n'existe — sinon on l'enfermerait dehors.
 */
export async function editableSubjectIds(
  user: { id: string; role: string },
  classId: string,
  classSubjectIds: string[],
): Promise<"ALL" | Set<string>> {
  if (["OWNER", "ADMIN", "SECRETARY"].includes(user.role)) return "ALL";

  const assignments = await prisma.teachingAssignment.findMany({
    where: { classId, teacherId: user.id },
    select: { subjectId: true },
  });

  if (assignments.length === 0) {
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });
    return klass?.teacherId === user.id ? "ALL" : new Set<string>();
  }

  if (assignments.some((a) => a.subjectId === null)) return "ALL";

  return new Set(
    assignments.map((a) => a.subjectId as string).filter((id) => classSubjectIds.includes(id)),
  );
}

/* ═══════════════════════════════ types publics ═══════════════════════════════ */

export type ScopeSubject = { id: string; name: string; groupName: string | null };

export type ClassCard = {
  classId: string;
  className: string;
  cycle: string;
  studentCount: number;
  /** Les matières que CET utilisateur peut saisir dans cette classe. */
  subjects: ScopeSubject[];
  /** `true` quand il couvre toute la classe (maître unique ou direction). */
  coversAll: boolean;
  progress: {
    termId: string; termName: string;
    evaluationId: string; evaluationName: string;
    entered: number; total: number;
  } | null;
  /** Pourquoi il n'y a pas de progression. Affiché tel quel. */
  blocked: string | null;
};

export type Workspace = {
  firstName: string | null;
  lastName: string | null;
  isTeacher: boolean;
  term: { id: string; name: string; startDate: Date | null; endDate: Date | null } | null;
  termIssue: string | null;
  cards: ClassCard[];
  /** Vrai quand l'utilisateur voit tout l'établissement (direction, secrétariat). */
  wideView: boolean;
};

/* ═════════════════════════════ résolution du contexte ═════════════════════════════ */

/**
 * L'évaluation pertinente pour une classe et un périmètre de matières.
 *
 * ⚠️ Ordre de préférence, et il n'est pas arbitraire :
 *   ① **celle qui est commencée mais pas finie** — c'est là que l'enseignant
 *      s'est arrêté, donc là qu'il revient ;
 *   ② la plus récente **déjà datée et commencée** ;
 *   ③ la dernière créée.
 *
 * Une évaluation datée dans le futur n'est jamais proposée d'office : saisir des
 * notes pour une composition qui n'a pas eu lieu n'a pas de sens.
 */
async function pickEvaluation(
  schoolId: string,
  termId: string,
  classId: string,
  subjectIds: string[],
  expectedTotal: number,
): Promise<{ id: string; name: string; date: Date | null } | null> {
  const evaluations = await prisma.evaluation.findMany({
    where: { schoolId, termId },
    select: { id: true, name: true, date: true, createdAt: true },
  });
  if (evaluations.length === 0) return null;

  const counts = await prisma.grade.groupBy({
    by: ["evaluationId"],
    where: {
      classId, termId,
      subjectId: { in: subjectIds },
      evaluationId: { in: evaluations.map((e) => e.id) },
    },
    _count: { _all: true },
  });
  const entered = new Map(counts.map((c) => [c.evaluationId as string, c._count._all]));

  const inProgress = evaluations
    .filter((e) => {
      const n = entered.get(e.id) ?? 0;
      return n > 0 && n < expectedTotal;
    })
    .sort((a, b) => (b.date?.getTime() ?? b.createdAt.getTime()) - (a.date?.getTime() ?? a.createdAt.getTime()));
  if (inProgress.length > 0) return { id: inProgress[0].id, name: inProgress[0].name, date: inProgress[0].date };

  const now = Date.now();
  const started = evaluations
    .filter((e) => e.date !== null && e.date.getTime() <= now)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  if (started.length > 0) {
    const e = started[started.length - 1];
    return { id: e.id, name: e.name, date: e.date };
  }

  const byCreation = [...evaluations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const e = byCreation[byCreation.length - 1];
  return { id: e.id, name: e.name, date: e.date };
}

/* ═══════════════════════════════ l'espace de travail ═══════════════════════════════ */

export async function teacherWorkspace(
  actor: ActorContext,
  identity: { firstName: string | null; lastName: string | null },
): Promise<Workspace> {
  const { schoolId, userId } = actor;
  const role = String(actor.role);
  const wideView = ["OWNER", "ADMIN", "SECRETARY"].includes(role);

  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  const { current } = pickCurrentTerm(terms);

  const termIssue =
    terms.length === 0
      ? "Aucun trimestre n'est encore déclaré pour cette année scolaire."
      : current && current.startDate === null
        ? `« ${current.name} » n'a pas de dates. Renseignez-les pour qu'EduCom situe la période.`
        : null;

  // ⚠️ Le filet `Class.teacherId` reste : sans affectation saisie, un professeur
  // principal se retrouverait devant un écran vide alors qu'il a une classe.
  const classes = sortClasses(
    await prisma.class.findMany({
      where: wideView
        ? { schoolId }
        : { schoolId, OR: [{ teacherId: userId }, { assignments: { some: { teacherId: userId } } }] },
      select: {
        id: true, name: true, cycle: true,
        _count: { select: { enrollments: true } },
      },
    }) as never[],
  ) as unknown as { id: string; name: string; cycle: string; _count: { enrollments: number } }[];

  const cards: ClassCard[] = [];

  for (const c of classes) {
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: c.id },
      include: { subject: { include: { parent: { select: { id: true, name: true } } } } },
    });

    const editable = await editableSubjectIds({ id: userId, role }, c.id, classSubjects.map((r) => r.subjectId));
    const coversAll = editable === "ALL";
    const mine = classSubjects.filter((r) => coversAll || (editable as Set<string>).has(r.subjectId));

    const subjects: ScopeSubject[] = mine
      .map((r) => ({ id: r.subject.id, name: r.subject.name, groupName: r.subject.parent?.name ?? null }))
      .sort((a, b) => (a.groupName ?? a.name).localeCompare(b.groupName ?? b.name, "fr") || a.name.localeCompare(b.name, "fr"));

    const studentCount = c._count.enrollments;

    // Chaque blocage porte SA raison : « rien à afficher » n'aide personne à
    // savoir quoi faire ensuite.
    let blocked: string | null = null;
    if (subjects.length === 0) {
      blocked = coversAll
        ? "Aucune matière n'est rattachée à cette classe."
        : "Aucune de vos matières n'est rattachée à cette classe.";
    } else if (studentCount === 0) {
      blocked = "Aucun élève n'est inscrit dans cette classe.";
    } else if (!current) {
      blocked = "Aucun trimestre n'est déclaré.";
    }

    let progress: ClassCard["progress"] = null;
    if (!blocked && current) {
      const subjectIds = subjects.map((s) => s.id);
      const total = studentCount * subjectIds.length;
      const evaluation = await pickEvaluation(schoolId, current.id, c.id, subjectIds, total);

      if (!evaluation) {
        blocked = `Aucune évaluation n'est ouverte sur « ${current.name} ».`;
      } else {
        const entered = await prisma.grade.count({
          where: { classId: c.id, termId: current.id, evaluationId: evaluation.id, subjectId: { in: subjectIds } },
        });
        progress = {
          termId: current.id, termName: current.name,
          evaluationId: evaluation.id, evaluationName: evaluation.name,
          entered, total,
        };
      }
    }

    cards.push({
      classId: c.id, className: c.name, cycle: String(c.cycle),
      studentCount, subjects, coversAll, progress, blocked,
    });
  }

  /**
   * ⚠️ L'ordre pédagogique (CI → CM2 → 6ème → Terminale) est le bon ordre pour
   * un **annuaire**, pas pour un plan de travail : il plaçait une classe
   * bloquée en tête alors que l'enseignant vient saisir des notes. On range
   * donc par **ce qu'il y a à faire** — reste à saisir, puis terminé, puis
   * bloqué — et l'ordre pédagogique départage à l'intérieur de chaque groupe.
   */
  const rank = (c: ClassCard) => {
    if (!c.progress) return 2;                                   // bloqué
    return c.progress.entered >= c.progress.total ? 1 : 0;       // fini / à faire
  };
  const order = new Map(cards.map((c, i) => [c.classId, i]));
  cards.sort((a, b) => rank(a) - rank(b) || order.get(a.classId)! - order.get(b.classId)!);

  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    isTeacher: role === "TEACHER",
    term: current ? { id: current.id, name: current.name, startDate: current.startDate, endDate: current.endDate } : null,
    termIssue,
    cards,
    wideView,
  };
}

/* ═════════════════════════════ le contexte de saisie ═════════════════════════════ */

export type EntryContext = {
  klass: { id: string; name: string; cycle: string };
  subject: ScopeSubject;
  /** Toutes les matières que l'utilisateur peut saisir ici — pour le sélecteur. */
  subjectChoices: ScopeSubject[];
  term: { id: string; name: string; startDate: Date | null; endDate: Date | null };
  termChoices: { id: string; name: string }[];
  evaluation: { id: string; name: string; date: Date | null };
  evaluationChoices: { id: string; name: string; date: Date | null }[];
  rows: {
    studentId: string; firstName: string; lastName: string;
    gradeId: string | null; value: number | null; max: number; coefficient: number;
  }[];
  /**
   * **Où en est le RESTE du travail de cet utilisateur sur cette classe.**
   *
   * ⚠️ Sans cette information, l'écran de saisie est un cul-de-sac : il annonce
   * « ✓ Évaluation complète » et ne propose rien. Or un maître unique de
   * l'élémentaire a **huit matières** à remplir pour la même évaluation — le
   * renvoyer à la liste pour qu'il retrouve la suivante à la main, huit fois,
   * est exactement la friction que ce produit doit absorber.
   *
   * Calculé pour la classe, le trimestre et l'évaluation courants, borné au
   * périmètre de saisie de l'utilisateur (`editableSubjectIds`).
   */
  siblings: { id: string; name: string; groupName: string | null; filled: number; total: number }[];
  /** Barème par défaut de la matière, déduit des notes déjà saisies. */
  defaultMax: number;
  /**
   * Coefficient configuré pour cette matière dans cette classe
   * (`ClassSubject.coefficient`) — appliqué aux notes **nouvellement** saisies.
   */
  defaultCoefficient: number;
};

export type EntryResolution =
  | { ok: true; context: EntryContext }
  | { ok: false; reason: string; classId: string | null };

/**
 * Résout tout ce que l'enseignant n'a pas à choisir, à partir de la seule classe.
 *
 * Les paramètres facultatifs ne servent qu'aux cas exceptionnels — changer de
 * matière, de trimestre ou d'évaluation. Rien n'oblige à les fournir, et l'écran
 * ne les demande jamais d'entrée de jeu.
 */
export async function resolveEntryContext(
  actor: ActorContext,
  params: { classId: string; subjectId?: string; termId?: string; evaluationId?: string },
): Promise<EntryResolution> {
  const { schoolId, userId } = actor;
  const role = String(actor.role);

  const klass = await prisma.class.findFirst({
    where: { id: params.classId, schoolId },
    select: { id: true, name: true, cycle: true },
  });
  if (!klass) return { ok: false, reason: "Cette classe n'existe pas dans votre établissement.", classId: null };

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: klass.id },
    include: { subject: { include: { parent: { select: { id: true, name: true } } } } },
  });
  const editable = await editableSubjectIds({ id: userId, role }, klass.id, classSubjects.map((r) => r.subjectId));
  const coversAll = editable === "ALL";
  const mine = classSubjects.filter((r) => coversAll || (editable as Set<string>).has(r.subjectId));

  if (mine.length === 0) {
    return { ok: false, reason: "Aucune matière que vous puissiez saisir n'est rattachée à cette classe.", classId: klass.id };
  }

  const subjectChoices: ScopeSubject[] = mine
    .map((r) => ({ id: r.subject.id, name: r.subject.name, groupName: r.subject.parent?.name ?? null }))
    .sort((a, b) => (a.groupName ?? a.name).localeCompare(b.groupName ?? b.name, "fr") || a.name.localeCompare(b.name, "fr"));

  // Une matière demandée hors périmètre est ignorée, jamais servie.
  const subject = subjectChoices.find((s) => s.id === params.subjectId) ?? subjectChoices[0];

  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  if (terms.length === 0) {
    return { ok: false, reason: "Aucun trimestre n'est encore déclaré pour cette année scolaire.", classId: klass.id };
  }
  const { current, ordered } = pickCurrentTerm(terms);
  const term = terms.find((t) => t.id === params.termId) ?? current!;

  const enrollments = await prisma.enrollment.findMany({
    where: { classId: klass.id },
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  if (enrollments.length === 0) {
    return { ok: false, reason: "Aucun élève n'est inscrit dans cette classe.", classId: klass.id };
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { schoolId, termId: term.id },
    select: { id: true, name: true, date: true, createdAt: true },
    orderBy: [{ date: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  if (evaluations.length === 0) {
    return { ok: false, reason: `Aucune évaluation n'est ouverte sur « ${term.name} ».`, classId: klass.id };
  }

  const picked =
    evaluations.find((e) => e.id === params.evaluationId) ??
    (await pickEvaluation(schoolId, term.id, klass.id, [subject.id], enrollments.length)) ??
    evaluations[evaluations.length - 1];

  const grades = await prisma.grade.findMany({
    where: { classId: klass.id, subjectId: subject.id, termId: term.id, evaluationId: picked.id },
    select: { id: true, studentId: true, value: true, max: true, coefficient: true },
  });
  const byStudent = new Map(grades.map((g) => [g.studentId, g]));

  /**
   * ⚠️ Le barème par défaut vient des notes **déjà saisies** pour cette matière,
   * jamais d'une constante. Une école qui note sur 10 verrait sinon « / 20 »
   * s'imposer à chaque nouvelle évaluation, et les moyennes seraient fausses
   * sans que rien ne l'annonce. À défaut d'antécédent : 20, la convention
   * sénégalaise.
   */
  const previousMax = await prisma.grade.findFirst({
    where: { classId: klass.id, subjectId: subject.id },
    orderBy: { createdAt: "desc" },
    select: { max: true },
  });
  const defaultMax = previousMax?.max && previousMax.max > 0 ? previousMax.max : 20;

  /**
   * ⚠️ **Le coefficient par défaut vient de la CONFIGURATION, plus de la
   * constante 1.** C'est ce qui rend `ClassSubject.coefficient` réellement
   * opérant : une école qui règle « Composition FR » à 2 en CM2 voit ce 2
   * s'appliquer aux notes suivantes, sans avoir à le retaper élève par élève.
   *
   * ⚠️ Les notes DÉJÀ saisies gardent le leur (`g?.coefficient` ci-dessous).
   * Repondérer rétroactivement un trimestre entier en changeant un réglage
   * modifierait des moyennes déjà transmises aux familles — le nouveau poids
   * ne vaut que pour ce qui vient.
   */
  const lien = classSubjects.find((r) => r.subjectId === subject.id);
  const defaultCoefficient = lien && lien.coefficient > 0 ? lien.coefficient : 1;

  /**
   * ⚠️ **Un seul `groupBy` pour toutes les matières du périmètre**, pas une
   * requête par matière : un maître unique en couvre huit, une direction en
   * couvre dix-sept. Le compte est celui de CETTE évaluation — une matière
   * remplie au 1ᵉʳ trimestre reste à remplir sur la composition du 2ᵉ.
   */
  const remplies = await prisma.grade.groupBy({
    by: ["subjectId"],
    where: {
      classId: klass.id, termId: term.id, evaluationId: picked.id,
      subjectId: { in: subjectChoices.map((c) => c.id) },
    },
    _count: { _all: true },
  });
  const compte = new Map(remplies.map((r) => [r.subjectId, r._count._all]));
  const siblings = subjectChoices.map((c) => ({
    id: c.id,
    name: c.name,
    groupName: c.groupName,
    filled: compte.get(c.id) ?? 0,
    total: enrollments.length,
  }));

  return {
    ok: true,
    context: {
      klass: { id: klass.id, name: klass.name, cycle: String(klass.cycle) },
      subject,
      subjectChoices,
      term: { id: term.id, name: term.name, startDate: term.startDate, endDate: term.endDate },
      termChoices: ordered.map((t) => ({ id: t.id, name: t.name })),
      evaluation: { id: picked.id, name: picked.name, date: (picked as { date?: Date | null }).date ?? null },
      evaluationChoices: evaluations.map((e) => ({ id: e.id, name: e.name, date: e.date })),
      rows: enrollments.map((e) => {
        const g = byStudent.get(e.student.id);
        return {
          studentId: e.student.id,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
          gradeId: g?.id ?? null,
          value: g?.value ?? null,
          max: g?.max ?? defaultMax,
          coefficient: g?.coefficient ?? defaultCoefficient,
        };
      }),
      siblings,
      defaultMax,
      defaultCoefficient,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE TABLEAU ACADÉMIQUE — porte d'entrée de `/dashboard/grades`
   ───────────────────────────────────────────────────────────────────────────
   L'écran ne demande plus « quelle classe ? » : il montre **le travail du
   trimestre**, contrôles d'un côté, composition de l'autre, chacun avec son
   avancement réel. L'enseignant clique une ligne et tombe dans le moteur de
   saisie avec classe + matière + trimestre + évaluation déjà résolus.
   ═══════════════════════════════════════════════════════════════════════════ */

export type BoardRow = {
  key: string;
  evaluationId: string;
  evaluationName: string;
  /** Date de l'évaluation. `null` tant que l'école ne l'a pas fixée. */
  evaluationDate: Date | null;
  kind: EvaluationKind;
  classId: string;
  className: string;
  /** `null` quand la ligne couvre tout le périmètre de l'utilisateur. */
  subjectId: string | null;
  subjectLabel: string;
  entered: number;
  total: number;
  href: string;
};

export type AcademicBoard = {
  firstName: string | null;
  wideView: boolean;
  terms: { id: string; name: string; dated: boolean }[];
  termId: string | null;
  termName: string | null;
  /** Ce qui empêche d'afficher le travail. Affiché tel quel. */
  issue: string | null;
  controls: BoardRow[];
  compositions: BoardRow[];
};

/**
 * ⚠️ **Le nombre de lignes est borné volontairement.** Une direction avec
 * 13 classes × 17 matières × 5 évaluations produirait 1 105 lignes — un mur
 * illisible. Quand le périmètre d'un utilisateur dans une classe dépasse trois
 * matières (maître unique de l'élémentaire, direction), la ligne agrège **tout
 * son périmètre** sur cette classe. Un professeur de collège, lui, garde une
 * ligne par matière : c'est exactement ce qu'il veut voir.
 */
const SUBJECT_ROW_LIMIT = 3;

export async function academicBoard(
  actor: ActorContext,
  identity: { firstName: string | null },
  requestedTermId?: string,
): Promise<AcademicBoard> {
  const { schoolId, userId } = actor;
  const role = String(actor.role);
  const wideView = ["OWNER", "ADMIN", "SECRETARY"].includes(role);

  const termRows = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  const { current, ordered } = pickCurrentTerm(termRows);

  // ⚠️ Les trimestres sont proposés dans l'ordre chronologique — donc `ordered`
  // renversé : `pickCurrentTerm` place les non datés EN TÊTE pour qu'ils ne
  // puissent jamais devenir « courant », mais l'école doit les voir à leur place.
  const dated = termRows.filter((t) => t.startDate !== null)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
  const undated = termRows.filter((t) => t.startDate === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const terms = [...dated, ...undated].map((t) => ({ id: t.id, name: t.name, dated: t.startDate !== null }));

  const term = termRows.find((t) => t.id === requestedTermId) ?? current ?? null;

  const base: AcademicBoard = {
    firstName: identity.firstName, wideView, terms,
    termId: term?.id ?? null, termName: term?.name ?? null,
    issue: null, controls: [], compositions: [],
  };

  if (termRows.length === 0) {
    return { ...base, issue: "Aucun trimestre n'est encore déclaré pour cette année scolaire." };
  }
  if (!term) return { ...base, issue: "Aucun trimestre exploitable." };

  const evaluations = await prisma.evaluation.findMany({
    where: { schoolId, termId: term.id },
    select: { id: true, name: true, type: true, date: true, createdAt: true },
    orderBy: [{ date: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  if (evaluations.length === 0) {
    return { ...base, issue: `Aucune évaluation n'est ouverte sur « ${term.name} ».` };
  }

  const classes = sortClasses(
    await prisma.class.findMany({
      where: wideView
        ? { schoolId }
        : { schoolId, OR: [{ teacherId: userId }, { assignments: { some: { teacherId: userId } } }] },
      select: { id: true, name: true, cycle: true, _count: { select: { enrollments: true } } },
    }) as never[],
  ) as unknown as { id: string; name: string; _count: { enrollments: number } }[];

  if (classes.length === 0) {
    return {
      ...base,
      issue: wideView
        ? "Aucune classe n'est créée dans cet établissement."
        : "Aucune classe ne vous est encore attribuée. Contactez l'administration pour vérifier votre affectation.",
    };
  }

  const controls: BoardRow[] = [];
  const compositions: BoardRow[] = [];

  for (const c of classes) {
    if (c._count.enrollments === 0) continue;

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: c.id },
      include: { subject: { include: { parent: { select: { name: true } } } } },
    });
    const editable = await editableSubjectIds({ id: userId, role }, c.id, classSubjects.map((r) => r.subjectId));
    const mine = classSubjects.filter((r) => editable === "ALL" || (editable as Set<string>).has(r.subjectId));
    if (mine.length === 0) continue;

    const perSubject = mine.length <= SUBJECT_ROW_LIMIT;
    const scopeIds = mine.map((r) => r.subjectId);

    for (const ev of evaluations) {
      const kind = evaluationKind(ev.type);

      // Un seul comptage par évaluation et par classe, réparti ensuite.
      const counts = await prisma.grade.groupBy({
        by: ["subjectId"],
        where: { classId: c.id, termId: term.id, evaluationId: ev.id, subjectId: { in: scopeIds } },
        _count: { _all: true },
      });
      const entered = new Map(counts.map((r) => [r.subjectId, r._count._all]));

      const push = (row: BoardRow) => (kind === "COMPOSITION" ? compositions : controls).push(row);

      if (perSubject) {
        for (const r of mine) {
          const p = new URLSearchParams({ class: c.id, subject: r.subjectId, term: term.id, eval: ev.id });
          push({
            key: `${ev.id}-${c.id}-${r.subjectId}`,
            evaluationId: ev.id, evaluationName: ev.name, evaluationDate: ev.date, kind,
            classId: c.id, className: c.name,
            subjectId: r.subjectId,
            subjectLabel: r.subject.parent ? `${r.subject.parent.name} · ${r.subject.name}` : r.subject.name,
            entered: entered.get(r.subjectId) ?? 0,
            total: c._count.enrollments,
            href: `/dashboard/grades/saisie?${p.toString()}`,
          });
        }
      } else {
        const p = new URLSearchParams({ class: c.id, term: term.id, eval: ev.id });
        push({
          key: `${ev.id}-${c.id}`,
          evaluationId: ev.id, evaluationName: ev.name, evaluationDate: ev.date, kind,
          classId: c.id, className: c.name,
          subjectId: null,
          subjectLabel: `Toutes vos matières (${mine.length})`,
          entered: [...entered.values()].reduce((a, b) => a + b, 0),
          total: c._count.enrollments * mine.length,
          href: `/dashboard/grades/saisie?${p.toString()}`,
        });
      }
    }
  }

  return { ...base, controls, compositions };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LES DÉFAUTS DE L'ÉCRAN BULLETIN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Classe, trimestre et évaluation par défaut — **pour que trois sélecteurs
 * n'accueillent plus l'utilisateur avec « Choisir… ».**
 *
 * ⚠️ **Cette fonction ne décide rien de neuf.** Elle rebranche `pickCurrentTerm()`
 * et `pickEvaluation()`, déjà seules autorités sur ces deux questions, sur un
 * écran qui les ignorait. Écrire la règle une quatrième fois côté client aurait
 * reproduit le bug du 21 août : deux copies de « quel est le trimestre
 * courant ? » qui finissent par ne plus dire la même chose.
 *
 * ⚠️ Les chaînes vides sont **légitimes** et doivent le rester : une école sans
 * classe, sans trimestre ou sans évaluation n'a pas de défaut à proposer, et en
 * fabriquer un ferait ouvrir l'écran sur une période inexistante.
 */
export async function defaultSelection(
  actor: ActorContext,
  classIds: string[],
): Promise<{ classId: string; termId: string; evaluationId: string }> {
  const { schoolId, userId } = actor;
  const vide = { classId: "", termId: "", evaluationId: "" };

  // ⚠️ L'ordre reçu fait foi : la page a déjà trié pédagogiquement (CI → CM2 →
  // 6ème). Re-trier ici donnerait un défaut différent de la première ligne
  // affichée, et l'écran paraîtrait choisir au hasard.
  const classId = classIds[0];
  if (!classId) return vide;

  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, startDate: true, createdAt: true },
  });
  const { current } = pickCurrentTerm(terms);
  if (!current) return { ...vide, classId };

  const [classSubjects, headcount] = await Promise.all([
    prisma.classSubject.findMany({ where: { classId }, select: { subjectId: true } }),
    prisma.enrollment.count({ where: { classId } }),
  ]);
  const editable = await editableSubjectIds(
    { id: userId, role: String(actor.role) }, classId, classSubjects.map((r) => r.subjectId),
  );
  const scope = classSubjects
    .map((r) => r.subjectId)
    .filter((id) => editable === "ALL" || (editable as Set<string>).has(id));

  const evaluation = await pickEvaluation(
    schoolId, current.id, classId, scope, Math.max(headcount * Math.max(scope.length, 1), 1),
  );

  return { classId, termId: current.id, evaluationId: evaluation?.id ?? "" };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHARGEMENT DU BULLETIN — contrôles + composition → résultats du trimestre
   ═══════════════════════════════════════════════════════════════════════════ */

export type LoadedBulletin = {
  bulletin: Bulletin;
  klass: { id: string; name: string };
  term: { id: string; name: string };
  /** `null` quand le bulletin porte sur TOUT le trimestre. */
  evaluation: { id: string; name: string; isComposition: boolean } | null;
  academicYear: string;
  /** Les évaluations réellement agrégées, pour que l'écran puisse le dire. */
  sources: { id: string; name: string; kind: EvaluationKind }[];
};

/**
 * Assemble le bulletin d'une classe — **le seul chargeur du produit**.
 *
 * ═══ LA CAPACITÉ QUI DORMAIT ═══
 *
 * `evaluationId` est **facultatif**, et c'est tout l'enjeu :
 *
 *   · fourni    → bulletin d'UNE évaluation (comportement historique) ;
 *   · omis      → bulletin **du trimestre entier**, contrôles et composition
 *                 réunis. C'est la chaîne « évaluations → résultats » que Kory
 *                 décrit, et elle était déjà possible en base — personne ne
 *                 l'appelait ainsi.
 *
 * ⚠️ Le calcul lui-même n'est pas ici : il est dans `buildBulletin()`, et la
 * combinaison contrôles/composition dans `combineRatios()`. Ce chargeur ne fait
 * que lire et étiqueter.
 */
export async function loadBulletin(
  actor: ActorContext,
  params: { classId: string; termId: string; evaluationId?: string },
): Promise<LoadedBulletin | null> {
  const { schoolId } = actor;

  const [klass, term] = await Promise.all([
    prisma.class.findFirst({ where: { id: params.classId, schoolId }, select: { id: true, name: true } }),
    prisma.term.findFirst({ where: { id: params.termId, schoolId }, select: { id: true, name: true } }),
  ]);
  if (!klass || !term) return null;

  const evaluations = await prisma.evaluation.findMany({
    where: { schoolId, termId: term.id },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  const picked = params.evaluationId
    ? evaluations.find((e) => e.id === params.evaluationId) ?? null
    : null;
  const sourceIds = picked ? [picked.id] : evaluations.map((e) => e.id);

  const [enrollments, classSubjects, rawGrades, cards] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classId: klass.id },
      include: { student: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } } },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.classSubject.findMany({
      where: { classId: klass.id },
      include: { subject: { include: { parent: { select: { id: true, name: true } } } } },
    }),
    sourceIds.length === 0 ? Promise.resolve([]) : prisma.grade.findMany({
      where: { classId: klass.id, termId: term.id, evaluationId: { in: sourceIds } },
      select: {
        studentId: true, subjectId: true, value: true, max: true,
        coefficient: true, comment: true, evaluationId: true,
      },
    }),
    prisma.reportCard.findMany({
      where: { classId: klass.id, termId: term.id, ...(picked ? { evaluationId: picked.id } : {}) },
      select: { studentId: true, status: true, generalComment: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const kindOf = new Map(evaluations.map((e) => [e.id, evaluationKind(e.type)]));
  // Sur un bulletin de trimestre, plusieurs bulletins existent (un par
  // évaluation) : on retient le plus récemment modifié pour l'état et l'avis.
  const cardOf = new Map<string, { status: string; generalComment: string | null }>();
  for (const c of cards) {
    if (!cardOf.has(c.studentId)) cardOf.set(c.studentId, { status: c.status, generalComment: c.generalComment });
  }

  const bulletin = buildBulletin({
    students: enrollments.map((e) => ({
      id: e.student.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      dateOfBirth: e.student.dateOfBirth,
      status: cardOf.get(e.student.id)?.status ?? "DRAFT",
      generalComment: cardOf.get(e.student.id)?.generalComment ?? null,
    })),
    subjects: classSubjects.map((cs) => ({
      id: cs.subject.id,
      name: cs.subject.name,
      parentId: cs.subject.parentId,
      parent: cs.subject.parent ? { id: cs.subject.parent.id, name: cs.subject.parent.name } : null,
      // Le poids configuré pour CETTE classe : il s'affiche tant qu'aucune note
      // ne porte le sien (voir `buildBulletin()`).
      coefficient: cs.coefficient,
    })),
    grades: rawGrades.map((g) => ({
      studentId: g.studentId,
      subjectId: g.subjectId,
      value: g.value,
      max: g.max,
      coefficient: g.coefficient,
      kind: kindOf.get(g.evaluationId ?? "") ?? "CONTROL",
      comment: g.comment,
    })),
  });

  return {
    bulletin,
    klass,
    term,
    evaluation: picked ? { id: picked.id, name: picked.name, isComposition: evaluationKind(picked.type) === "COMPOSITION" } : null,
    academicYear: currentAcademicYear(),
    sources: evaluations
      .filter((e) => sourceIds.includes(e.id))
      .map((e) => ({ id: e.id, name: e.name, kind: evaluationKind(e.type) })),
  };
}
