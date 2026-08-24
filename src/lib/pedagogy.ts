import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { recordAudit } from "@/lib/audit";
import { sortClasses } from "@/lib/classOrder";
import { pickCurrentTerm } from "@/lib/terms";
import { evaluationKind } from "@/lib/bulletin";
import {
  TERM_MODEL, curriculumFor, parentOf, curriculumProposal,
  type CurriculumProposal,
} from "@/lib/curriculum";

/**
 * Renvoie un coefficient par défaut basé sur l'importance générale des matières
 * dans le système sénégalais (Langue et Maths = 3, Sciences/Langues = 2, Autres = 1).
 */
function getStandardCoefficient(subjectName: string): number {
  const name = subjectName.toLowerCase();
  if (
    name.includes("math") || name.includes("calcul") || name.includes("problème") || 
    name.includes("français") || name.includes("lecture") || name.includes("orthographe") || name.includes("grammaire") || name.includes("expression")
  ) {
    return 3;
  }
  if (
    name.includes("anglais") || name.includes("arabe") || name.includes("espagnol") || 
    name.includes("physique") || name.includes("chimie") || name.includes("svt") || 
    name.includes("ist") || name.includes("histoire") || name.includes("géographie") || 
    name.includes("philosophie")
  ) {
    return 2;
  }
  return 1;
}

/**
 * **L'écriture de la configuration pédagogique.** Le pendant serveur de
 * `src/lib/curriculum.ts`, qui ne fait que décrire.
 *
 * ═══ CE MODULE N'EST PAS `seed-subjects.ts`, ET LA DIFFÉRENCE EST CAPITALE ═══
 *
 * Le script **synchronise** : il ajoute ce qui manque ET RETIRE ce qui ne
 * figure pas au programme type. C'est acceptable pour un développeur qui vise
 * une école nommée, en essai à blanc, avec `APPLY=1` — pas pour un bouton dans
 * une interface.
 *
 * `applyCurriculum()` est donc **strictement additive**. Elle ne supprime
 * jamais une matière, un rattachement, un trimestre ni une évaluation. Une
 * école qui a ajouté « Coran » ou renommé son deuxième trimestre le garde,
 * même si elle re-clique. Le modèle sénégalais est une **proposition** : une
 * proposition qui efface le travail de l'utilisateur n'en est pas une.
 *
 * ⚠️ Corollaire : la fonction est **idempotente**. La relancer ne duplique
 * rien — tout est reconnu par son nom dans l'école (`findFirst`), jamais créé
 * en aveugle. C'est ce qui permet de la brancher à la fois sur l'installation
 * d'une école neuve et sur un bouton « compléter » d'une école en route.
 */

/* ═════════════════════════════ application du modèle ═════════════════════════════ */

export type CurriculumOptions = {
  /** Créer aussi un contrôle par trimestre. Le socle, lui, s'arrête aux compositions. */
  withControls: boolean;
  /** Restreindre à ces classes. Absent = toutes les classes de l'école. */
  classIds?: string[];
};

export type CurriculumReport = {
  subjectsCreated: number;
  linksCreated: number;
  termsCreated: number;
  evaluationsCreated: number;
  /** Ce qui existait déjà et n'a pas été retouché — la preuve de l'idempotence. */
  alreadyThere: { subjects: number; links: number; terms: number; evaluations: number };
  uncovered: CurriculumProposal["uncovered"];
};

export async function applyCurriculum(
  actor: ActorContext,
  options: CurriculumOptions,
): Promise<CurriculumReport> {
  const { schoolId } = actor;

  const classes = await prisma.class.findMany({
    where: { schoolId, ...(options.classIds?.length ? { id: { in: options.classIds } } : {}) },
    select: { id: true, name: true, cycle: true },
  });

  const proposal = curriculumProposal(
    classes.map((c) => ({ id: c.id, name: c.name, cycle: String(c.cycle) })),
    { withControls: options.withControls },
  );

  const report: CurriculumReport = {
    subjectsCreated: 0, linksCreated: 0, termsCreated: 0, evaluationsCreated: 0,
    alreadyThere: { subjects: 0, links: 0, terms: 0, evaluations: 0 },
    uncovered: proposal.uncovered,
  };

  /* ── les matières, groupes d'abord (un enfant a besoin de son parent) ── */

  const idByName = new Map<string, string>();

  const ensureSubject = async (name: string, parentId: string | null): Promise<string> => {
    const cached = idByName.get(name);
    if (cached) return cached;

    const existing = await prisma.subject.findFirst({ where: { schoolId, name }, select: { id: true } });
    if (existing) {
      report.alreadyThere.subjects++;
      idByName.set(name, existing.id);
      return existing.id;
    }
    const created = await prisma.subject.create({
      data: { name, parentId, schoolId },
      select: { id: true },
    });
    report.subjectsCreated++;
    idByName.set(name, created.id);
    return created.id;
  };

  // ⚠️ On ne crée QUE les matières réellement utilisées par les classes de
  // l'école. Créer les 32 du modèle donnerait à une école primaire une liste où
  // « Philosophie » et « Physique-Chimie » traînent sans jamais servir.
  const groupsNeeded = new Set<string>();
  for (const name of proposal.subjects) {
    const parent = parentOf(name);
    if (parent) groupsNeeded.add(parent);
  }
  for (const group of groupsNeeded) await ensureSubject(group, null);
  for (const name of proposal.subjects) {
    if (groupsNeeded.has(name)) continue;
    const parent = parentOf(name);
    await ensureSubject(name, parent ? idByName.get(parent) ?? null : null);
  }

  /* ── les rattachements classe ↔ matière ── */

  for (const entry of proposal.perClass) {
    const existing = await prisma.classSubject.findMany({
      where: { classId: entry.classId },
      select: { subjectId: true },
    });
    const already = new Set(existing.map((r) => r.subjectId));

    for (const name of entry.subjects) {
      const subjectId = idByName.get(name);
      if (!subjectId) continue;
      if (already.has(subjectId)) { report.alreadyThere.links++; continue; }
      
      const coefficient = getStandardCoefficient(name);
      
      await prisma.classSubject.create({ 
        data: { 
          classId: entry.classId, 
          subjectId,
          coefficient 
        } 
      });
      report.linksCreated++;
    }
  }

  /* ── trimestres et évaluations ── */

  for (const model of TERM_MODEL) {
    let term = await prisma.term.findFirst({
      where: { schoolId, name: model.name },
      select: { id: true },
    });
    if (term) {
      report.alreadyThere.terms++;
    } else {
      // ⚠️ Aucune date. Champs identiques à `createTerm()` : nom + école.
      term = await prisma.term.create({ data: { name: model.name, schoolId }, select: { id: true } });
      report.termsCreated++;
    }

    const wanted: { name: string; type: "EXAM" | "QUIZ" }[] = [{ name: model.composition, type: "EXAM" }];
    if (options.withControls) wanted.unshift({ name: model.control, type: "QUIZ" });

    for (const ev of wanted) {
      const found = await prisma.evaluation.findFirst({
        where: { schoolId, termId: term.id, name: ev.name },
        select: { id: true },
      });
      if (found) { report.alreadyThere.evaluations++; continue; }
      // Champs identiques à `createEvaluation()` : nom + type + trimestre + école.
      await prisma.evaluation.create({
        data: { name: ev.name, type: ev.type, termId: term.id, schoolId },
      });
      report.evaluationsCreated++;
    }
  }

  await recordAudit(actor, {
    action: "apply",
    entity: "curriculum",
    details: {
      withControls: options.withControls,
      classes: classes.length,
      cree: {
        matieres: report.subjectsCreated, rattachements: report.linksCreated,
        trimestres: report.termsCreated, evaluations: report.evaluationsCreated,
      },
      existant: report.alreadyThere,
    },
  });

  return report;
}

/* ══════════════════════════ état de la configuration ══════════════════════════ */

export type ReadinessStep = {
  id: "classes" | "programme" | "coefficients" | "trimestres" | "calendrier" | "evaluations" | "enseignants" | "affectations";
  label: string;
  /** Ce que l'étape produit concrètement. Jamais un slogan. */
  purpose: string;
  /** Mesure réelle, lisible sans traduction : « 6 / 6 classes ». */
  display: string;
  state: "done" | "partial" | "todo";
  /**
   * Une étape non faite empêche-t-elle de saisir une note aujourd'hui ?
   *
   * ⚠️ Distinction volontaire : le WIN d'EduCom est « saisir des notes et voir
   * un bulletin ». Les dates et les affectations améliorent le produit sans
   * bloquer ce chemin — les présenter comme bloquantes ferait croire à une
   * configuration obligatoire de trois heures avant la première valeur.
   */
  blocking: boolean;
  href: string;
  /** Ce qu'il reste à faire, en une phrase. `null` quand c'est fait. */
  todo: string | null;
};

export type ConfigurationReadiness = {
  steps: ReadinessStep[];
  /** Étapes faites / total — pour une barre, pas pour un jugement. */
  done: number;
  total: number;
  /** Vrai quand plus rien n'empêche un enseignant de saisir une note. */
  canEnterGrades: boolean;
  /** Le premier obstacle réel, ou `null`. */
  firstBlocker: ReadinessStep | null;
};

/**
 * **Où en est la configuration pédagogique de cette école ?**
 *
 * ⚠️ **Tout est mesuré, rien n'est déclaré.** Aucune colonne « configuration
 * terminée » n'a été ajoutée au schéma, et c'est un choix : un drapeau se coche
 * puis ment. Une école qui supprime ses trois trimestres redeviendrait
 * « configurée » aux yeux d'un booléen, alors que plus aucune note n'est
 * saisissable. Ici la réponse se recalcule à chaque lecture, donc elle ne peut
 * pas se désynchroniser de la réalité.
 */
export async function configurationReadiness(actor: ActorContext): Promise<ConfigurationReadiness> {
  const { schoolId } = actor;

  const [classes, links, terms, evaluations, teachers, assignments, classesWithTeacher, customCoefficients] =
    await Promise.all([
      prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true, cycle: true } }),
      prisma.classSubject.groupBy({
        by: ["classId"],
        where: { class: { schoolId } },
        _count: { _all: true },
      }),
      prisma.term.findMany({
        where: { schoolId },
        select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
      }),
      prisma.evaluation.findMany({
        where: { schoolId },
        select: { id: true, termId: true, type: true, date: true },
      }),
      prisma.user.count({ where: { schoolId, role: "TEACHER" } }),
      prisma.teachingAssignment.groupBy({
        by: ["classId"],
        where: { schoolId },
        _count: { _all: true },
      }),
      prisma.class.findMany({ where: { schoolId, teacherId: { not: null } }, select: { id: true } }),
      prisma.classSubject.count({ where: { class: { schoolId }, coefficient: { not: 1 } } }),
    ]);

  const withSubjects = new Set(links.map((l) => l.classId));
  const datedTerms = terms.filter((t) => t.startDate !== null && t.endDate !== null);
  const termsWithComposition = new Set(
    evaluations.filter((e) => evaluationKind(e.type) === "COMPOSITION").map((e) => e.termId),
  );
  /**
   * ⚠️ **Le titulaire COMPTE, au même titre qu'une affectation.**
   *
   * `editableSubjectIds()` retombe sur `Class.teacherId` tant qu'aucune
   * affectation n'existe : une classe titularisée est donc bel et bien
   * saisissable. Ne compter que `TeachingAssignment` annonçait
   * « 0 / 2 classes affectées » à une école dont les deux classes avaient un
   * maître — une mesure qui pousse à corriger ce qui fonctionne.
   */
  const parAffectation = new Set(assignments.map((a) => a.classId));
  const parTitulaire = new Set(classesWithTeacher.map((c) => c.id));
  const responsibleClasses = classes.filter((c) => parAffectation.has(c.id) || parTitulaire.has(c.id)).length;
  const seulementTitulaire = classes.filter((c) => !parAffectation.has(c.id) && parTitulaire.has(c.id)).length;

  const step = (s: ReadinessStep): ReadinessStep => s;
  const nClasses = classes.length;

  const steps: ReadinessStep[] = [
    step({
      id: "classes",
      label: "Classes",
      purpose: "Ce sont elles qui portent les élèves, les matières et les bulletins.",
      display: `${nClasses} classe${nClasses > 1 ? "s" : ""}`,
      state: nClasses > 0 ? "done" : "todo",
      blocking: true,
      href: "/dashboard/directory",
      todo: nClasses > 0 ? null : "Créez au moins une classe.",
    }),
    step({
      id: "programme",
      label: "Programme",
      purpose: "Les matières enseignées dans chaque classe — celles qui apparaîtront au bulletin.",
      display: `${withSubjects.size} / ${nClasses} classe${nClasses > 1 ? "s" : ""} avec un programme`,
      state: nClasses === 0 ? "todo" : withSubjects.size === nClasses ? "done" : withSubjects.size > 0 ? "partial" : "todo",
      blocking: true,
      href: "/dashboard/settings/pedagogie#programme",
      todo:
        withSubjects.size === nClasses && nClasses > 0
          ? null
          : "Appliquez le programme proposé, ou composez le vôtre classe par classe.",
    }),
    step({
      id: "coefficients",
      label: "Coefficients",
      purpose: "Le poids de chaque matière au bulletin. Tout part à 1 ; ajustez ce qui pèse plus.",
      display:
        customCoefficients > 0
          ? `${customCoefficients} matière${customCoefficients > 1 ? "s" : ""} pondérée${customCoefficients > 1 ? "s" : ""}`
          : "Toutes les matières à 1",
      // ⚠️ JAMAIS « todo ». Un coefficient de 1 partout est une configuration
      // valide et fréquente — trois des quatre bulletins réels analysés le
      // 17 août fonctionnent ainsi. La marquer « à faire » inventerait une
      // obligation, et pousserait l'école à saisir des chiffres au hasard.
      state: "done",
      blocking: false,
      href: "/dashboard/settings/pedagogie#programme",
      todo: null,
    }),
    step({
      id: "trimestres",
      label: "Trimestres",
      purpose: "Le découpage de l'année. Les notes et les bulletins s'y rattachent.",
      display: `${terms.length} trimestre${terms.length > 1 ? "s" : ""}`,
      state: terms.length >= 3 ? "done" : terms.length > 0 ? "partial" : "todo",
      blocking: true,
      href: "/dashboard/settings/pedagogie#calendrier",
      todo: terms.length >= 3 ? null : "Déclarez les trois trimestres de l'année.",
    }),
    step({
      id: "calendrier",
      label: "Dates de trimestre",
      purpose: "Elles décident quel trimestre EduCom ouvre par défaut à vos enseignants.",
      display: `${datedTerms.length} / ${terms.length || 3} daté${datedTerms.length > 1 ? "s" : ""}`,
      state: terms.length > 0 && datedTerms.length === terms.length ? "done" : datedTerms.length > 0 ? "partial" : "todo",
      // Non bloquant : sans dates, `pickCurrentTerm()` retombe sur le dernier
      // trimestre de la liste. La saisie fonctionne — elle s'ouvre simplement
      // sur la mauvaise période, et l'écran le signale.
      blocking: false,
      href: "/dashboard/settings/pedagogie#calendrier",
      todo:
        terms.length > 0 && datedTerms.length === terms.length
          ? null
          : "Renseignez début et fin de chaque trimestre — ils sont propres à votre école.",
    }),
    step({
      id: "evaluations",
      label: "Contrôles et compositions",
      purpose: "Sans évaluation ouverte, un enseignant n'a rien à remplir.",
      display: `${evaluations.length} évaluation${evaluations.length > 1 ? "s" : ""} · ${termsWithComposition.size} composition${termsWithComposition.size > 1 ? "s" : ""}`,
      state:
        terms.length > 0 && termsWithComposition.size === terms.length
          ? "done"
          : evaluations.length > 0 ? "partial" : "todo",
      blocking: true,
      // Contrôles et compositions vivent DANS le panneau calendrier : une
      // ancre `#evaluations` séparée pointerait vers un titre qui n'existe pas.
      href: "/dashboard/settings/pedagogie#calendrier",
      todo:
        terms.length > 0 && termsWithComposition.size === terms.length
          ? null
          : "Ouvrez au moins une composition par trimestre.",
    }),
    step({
      id: "enseignants",
      label: "Enseignants",
      purpose: "Les comptes qui saisiront les notes.",
      display: `${teachers} enseignant${teachers > 1 ? "s" : ""}`,
      state: teachers > 0 ? "done" : "todo",
      // La direction peut saisir elle-même (`editableSubjectIds` rend "ALL") :
      // une école sans compte enseignant fonctionne, en mode direction.
      blocking: false,
      href: "/dashboard/team",
      todo: teachers > 0 ? null : "Invitez vos enseignants pour qu'ils saisissent leurs propres notes.",
    }),
    step({
      id: "affectations",
      label: "Affectations",
      purpose: "Qui enseigne quoi, dans quelle classe. C'est ce qui borne la saisie de chacun.",
      display: `${responsibleClasses} / ${nClasses} classe${nClasses > 1 ? "s" : ""} couverte${responsibleClasses > 1 ? "s" : ""}${seulementTitulaire > 0 ? ` · ${seulementTitulaire} par son titulaire seul` : ""}`,
      state:
        nClasses === 0 ? "todo"
          : responsibleClasses === nClasses ? "done"
          : responsibleClasses > 0 ? "partial" : "todo",
      blocking: false,
      href: "/dashboard/settings/pedagogie#affectations",
      todo:
        nClasses > 0 && responsibleClasses === nClasses
          ? null
          : "Affectez un enseignant à chaque classe, pour une matière ou pour toutes.",
    }),
  ];

  const blockers = steps.filter((s) => s.blocking && s.state !== "done");

  return {
    steps,
    done: steps.filter((s) => s.state === "done").length,
    total: steps.length,
    canEnterGrades: blockers.length === 0,
    firstBlocker: blockers[0] ?? null,
  };
}

/* ═══════════════════════════ le calendrier de l'école ═══════════════════════════ */

export type CalendarEvaluation = {
  id: string;
  name: string;
  type: string;
  isComposition: boolean;
  date: Date | null;
  termId: string;
  termName: string;
  /** Vrai quand la date sort de l'intervalle de son trimestre — une erreur de saisie. */
  outsideTerm: boolean;
};

export type SchoolCalendar = {
  terms: {
    id: string; name: string;
    startDate: Date | null; endDate: Date | null;
    /** Trimestre réellement en cours : daté ET commencé. */
    isCurrent: boolean;
    /**
     * Trimestre qu'EduCom ouvre **faute de mieux**, parce qu'aucun n'est daté.
     *
     * ⚠️ **Ce n'est PAS « en cours », et les confondre produit un écran qui se
     * contredit lui-même.** Constaté sur la capture du 22 août : le troisième
     * trimestre portait la pastille « en cours » et, deux lignes plus bas,
     * « sans dates, ce trimestre ne peut pas être choisi comme trimestre
     * courant ». Les deux venaient du même `pickCurrentTerm()` — l'un lisait son
     * résultat, l'autre sa condition. Le repli est donc nommé pour ce qu'il est.
     */
    isFallback: boolean;
    evaluations: CalendarEvaluation[];
  }[];
  /** Vrai quand aucun trimestre n'est daté : EduCom ne peut que se rabattre. */
  noDatedTerm: boolean;
  /** Les prochaines échéances datées, toutes périodes confondues. */
  upcoming: CalendarEvaluation[];
  /** Évaluations sans date — elles existent, elles ne se situent simplement pas. */
  undated: number;
};

/**
 * Le calendrier pédagogique, tel qu'il est réellement en base.
 *
 * ⚠️ **Aucune date n'est déduite ni complétée.** Une évaluation sans date reste
 * sans date : elle apparaît dans `undated`, pas placée « au milieu du
 * trimestre ». Placer une composition à une date inventée ferait planifier
 * toute une école sur une fiction.
 */
export async function schoolCalendar(actor: ActorContext, now: Date = new Date()): Promise<SchoolCalendar> {
  const { schoolId } = actor;

  const termRows = await prisma.term.findMany({
    where: { schoolId },
    select: {
      id: true, name: true, startDate: true, endDate: true, createdAt: true,
      evaluations: {
        select: { id: true, name: true, type: true, date: true },
        orderBy: [{ date: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      },
    },
  });

  const { current } = pickCurrentTerm(termRows, now);

  const dated = termRows.filter((t) => t.startDate !== null)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
  const undatedTerms = termRows.filter((t) => t.startDate === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const all: CalendarEvaluation[] = [];
  const terms = [...dated, ...undatedTerms].map((t) => {
    const evaluations: CalendarEvaluation[] = t.evaluations.map((e) => {
      const outsideTerm =
        e.date !== null && t.startDate !== null && t.endDate !== null &&
        (e.date < t.startDate || e.date > t.endDate);
      const row: CalendarEvaluation = {
        id: e.id, name: e.name, type: String(e.type),
        isComposition: evaluationKind(e.type) === "COMPOSITION",
        date: e.date, termId: t.id, termName: t.name, outsideTerm,
      };
      all.push(row);
      return row;
    });
    const estCourant = current?.id === t.id;
    const date = t.startDate !== null && t.endDate !== null;
    return {
      id: t.id, name: t.name,
      startDate: t.startDate, endDate: t.endDate,
      // Un trimestre sans dates n'est jamais « en cours » : il est, au mieux,
      // celui sur lequel on se rabat.
      isCurrent: estCourant && date && t.startDate! <= now,
      isFallback: estCourant && !(date && t.startDate! <= now),
      evaluations,
    };
  });

  return {
    terms,
    noDatedTerm: termRows.length > 0 && termRows.every((t) => t.startDate === null),
    upcoming: all
      .filter((e) => e.date !== null && e.date.getTime() >= now.getTime())
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())
      .slice(0, 5),
    undated: all.filter((e) => e.date === null).length,
  };
}

/* ═════════════════════════ les classes et leur programme ═════════════════════════ */

export type ProgrammeRow = {
  classId: string;
  className: string;
  cycle: string;
  studentCount: number;
  subjects: {
    subjectId: string; name: string; groupName: string | null;
    coefficient: number;
    /** Nombre de notes déjà saisies — un retrait deviendrait destructeur. */
    gradeCount: number;
  }[];
  /** Ce que le modèle proposerait en plus, s'il y a lieu. */
  missingFromModel: string[];
};

/** Le programme réel de chaque classe, avec ses coefficients et son écart au modèle. */
export async function programmeByClass(actor: ActorContext): Promise<ProgrammeRow[]> {
  const { schoolId } = actor;

  const classes = sortClasses(
    await prisma.class.findMany({
      where: { schoolId },
      select: {
        id: true, name: true, cycle: true,
        _count: { select: { enrollments: true } },
        subjects: {
          select: {
            subjectId: true, coefficient: true,
            subject: { select: { name: true, parent: { select: { name: true } } } },
          },
        },
      },
    }) as never[],
  ) as unknown as {
    id: string; name: string; cycle: string;
    _count: { enrollments: number };
    subjects: {
      subjectId: string; coefficient: number;
      subject: { name: string; parent: { name: string } | null };
    }[];
  }[];

  const counts = await prisma.grade.groupBy({
    by: ["classId", "subjectId"],
    where: { class: { schoolId } },
    _count: { _all: true },
  });
  const gradeCount = new Map(counts.map((c) => [`${c.classId}|${c.subjectId}`, c._count._all]));

  return classes.map((c) => {
    const attached = new Set(c.subjects.map((s) => s.subject.name));
    const model = curriculumFor(c.name, String(c.cycle));
    return {
      classId: c.id,
      className: c.name,
      cycle: String(c.cycle),
      studentCount: c._count.enrollments,
      subjects: c.subjects
        .map((s) => ({
          subjectId: s.subjectId,
          name: s.subject.name,
          groupName: s.subject.parent?.name ?? null,
          coefficient: s.coefficient,
          gradeCount: gradeCount.get(`${c.id}|${s.subjectId}`) ?? 0,
        }))
        .sort((a, b) =>
          (a.groupName ?? a.name).localeCompare(b.groupName ?? b.name, "fr") ||
          a.name.localeCompare(b.name, "fr"),
        ),
      missingFromModel: model.filter((m) => !attached.has(m)),
    };
  });
}
