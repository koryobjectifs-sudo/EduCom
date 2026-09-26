import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { editableSubjectIds } from "@/lib/gradeEntry";
import {
  lundiDe,
  libelleSemaine,
  pointsSuggeres,
  estVerdict,
  SUJETS_SPECIAUX,
  type ObservationVue,
  type NoteSemaine,
  type Verdict,
  type SnapshotBilan,
  type TypeObservation,
} from "@/lib/bilanRegles";

/**
 * Bilan de la semaine (v2, observations) — données et droits. 26 sept. 2026.
 * Règles de calcul : `lib/bilanRegles.ts`.
 *
 * ═══ DROITS (seule autorité) ═══
 * Voir une classe : direction et secrétariat (toutes), enseignant (ses classes :
 *   titulaire / professeur principal, ou affecté). Route refusée aux parents,
 *   comptables, assistants.
 * Observer dans une matière : celui qui peut en saisir les notes
 *   (`editableSubjectIds`). Leçons, devoirs, général : tout enseignant de la classe.
 * Envoyer le bilan de la semaine : le professeur principal (`Class.teacherId`) ;
 *   sans professeur principal, un enseignant de la classe ; toujours la direction.
 * Point du jour, envoi immédiat d'une observation : l'auteur de l'observation.
 * Matières : celles DE LA CLASSE (secondaire, `ClassSubject`) ou les
 *   sous-disciplines de l'école (élémentaire / préscolaire). Rien d'inventé.
 */
const DIRECTION = ["OWNER", "ADMIN"];
const nom = (u?: { firstName: string | null; lastName: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" : "—";

export type MatiereOption = { cle: string; nom: string; groupe: string | null; editable: boolean; points: string[] };
export type EleveSemaine = {
  id: string;
  nom: string;
  aUnParent: boolean;
  verdict: Verdict | null;
  commentaire: string;
  envoyeLe: string | null;
  vuLe: string | null;
};
export type SemaineClasse = {
  classe: { id: string; nom: string; elementaire: boolean };
  semaine: string;
  libelleSemaine: string;
  matieres: MatiereOption[];
  eleves: EleveSemaine[];
  observations: ObservationVue[];
  notes: (NoteSemaine & { studentId: string; date: string })[];
  peutObserver: boolean;
  peutEnvoyer: boolean;
  principal: string | null;
  moi: string;
};

export async function classesDuBilan(actor: ActorContext) {
  const tout = DIRECTION.includes(actor.role) || actor.role === "SECRETARY";
  return prisma.class.findMany({
    where: {
      schoolId: actor.schoolId,
      ...(tout ? {} : { OR: [{ teacherId: actor.userId }, { assignments: { some: { teacherId: actor.userId } } }] }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Semaine demandée (ISO), bornée : pas de semaine future, 26 semaines en arrière au plus. */
export function semaineValide(brut: unknown): Date {
  const actuelle = lundiDe();
  if (typeof brut !== "string") return actuelle;
  const d = new Date(brut);
  if (Number.isNaN(d.getTime())) return actuelle;
  const l = lundiDe(d);
  if (l > actuelle || l.getTime() < actuelle.getTime() - 26 * 7 * 86400_000) return actuelle;
  return l;
}

export async function chargerSemaineClasse(actor: ActorContext, classId: string, semaine: Date): Promise<SemaineClasse | null> {
  const autorisees = await classesDuBilan(actor);
  if (!autorisees.some((c) => c.id === classId)) return null;
  const classe = await prisma.class.findFirst({
    where: { id: classId, schoolId: actor.schoolId },
    select: { id: true, name: true, cycle: true, teacherId: true, teacher: { select: { firstName: true, lastName: true } } },
  });
  if (!classe) return null;
  const elementaire = classe.cycle === "ELEMENTAIRE" || classe.cycle === "PRESCOLAIRE";
  const fin = new Date(semaine.getTime() + 7 * 86400_000);
  const direction = DIRECTION.includes(actor.role);

  const [inscriptions, moi, affecte] = await Promise.all([
    prisma.enrollment.findMany({ where: { classId }, select: { student: { select: { id: true, firstName: true, lastName: true, parentId: true } } } }),
    prisma.user.findUnique({ where: { id: actor.userId }, select: { firstName: true, lastName: true } }),
    actor.role === "TEACHER"
      ? prisma.teachingAssignment.findFirst({ where: { classId, teacherId: actor.userId }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  const enseignant = actor.role === "TEACHER" && (classe.teacherId === actor.userId || Boolean(affecte));
  const peutObserver = direction || enseignant;
  const peutEnvoyer = direction || (classe.teacherId ? classe.teacherId === actor.userId : enseignant);

  // Matières de la classe (rien d'inventé) + droit d'observer chacune.
  let brutes: { cle: string; nom: string; groupe: string | null }[] = [];
  if (elementaire) {
    const sd = await prisma.gradeSubDiscipline.findMany({
      where: { schoolId: actor.schoolId, isActive: true, domain: { isActive: true } },
      select: { id: true, name: true, order: true, domain: { select: { name: true, order: true } } },
    });
    brutes = sd
      .sort((a, b) => a.domain.order - b.domain.order || a.order - b.order)
      .map((x) => ({ cle: x.id, nom: x.name, groupe: x.domain.name }));
  } else {
    const cs = await prisma.classSubject.findMany({
      where: { classId },
      select: { subject: { select: { id: true, name: true } } },
      orderBy: { subject: { name: "asc" } },
    });
    brutes = cs.map((x) => ({ cle: x.subject.id, nom: x.subject.name, groupe: null }));
  }
  const droit =
    !peutObserver || actor.role === "SECRETARY"
      ? new Set<string>()
      : await editableSubjectIds({ id: actor.userId, role: actor.role }, classId, elementaire ? [] : brutes.map((b) => b.cle));
  const editable = (cle: string) => droit === "ALL" || (droit instanceof Set && droit.has(cle));

  const eleves = inscriptions.map((i) => i.student).sort((a, b) => nom(a).localeCompare(nom(b), "fr"));
  const ids = eleves.map((e) => e.id);

  const [obs, grades, recaps, dejaUtilises] = await Promise.all([
    prisma.studentObservation.findMany({
      where: { schoolId: actor.schoolId, classId, date: { gte: semaine, lt: fin }, studentId: { in: ids } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.grade.findMany({
      where: { classId, studentId: { in: ids }, date: { gte: semaine, lt: fin } },
      select: {
        studentId: true,
        value: true,
        max: true,
        date: true,
        type: true,
        subjectId: true,
        subDisciplineId: true,
        evaluation: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.weeklyReview.findMany({ where: { schoolId: actor.schoolId, classId, weekStart: semaine, studentId: { in: ids } } }),
    prisma.studentObservation.findMany({
      where: { schoolId: actor.schoolId, subjectKey: { in: brutes.map((b) => b.cle) }, createdAt: { gte: new Date(Date.now() - 120 * 86400_000) } },
      select: { subjectKey: true, topics: true },
      take: 800,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const auteurs = new Map(
    (await prisma.user.findMany({ where: { id: { in: [...new Set(obs.map((o) => o.authorId))] } }, select: { id: true, firstName: true, lastName: true } })).map((u) => [
      u.id,
      nom(u),
    ]),
  );
  const pointsEcole = new Map<string, string[]>();
  for (const d of dejaUtilises) {
    const t = Array.isArray(d.topics) ? (d.topics as unknown[]).filter((x): x is string => typeof x === "string") : [];
    pointsEcole.set(d.subjectKey, [...(pointsEcole.get(d.subjectKey) ?? []), ...t]);
  }
  const nomMatiere = new Map(brutes.map((b) => [b.cle, b.nom]));
  const recap = new Map(recaps.map((r) => [r.studentId, r]));

  return {
    classe: { id: classe.id, nom: classe.name, elementaire },
    semaine: semaine.toISOString(),
    libelleSemaine: libelleSemaine(semaine),
    matieres: brutes.map((b) => ({ ...b, editable: editable(b.cle), points: pointsSuggeres(b.nom, pointsEcole.get(b.cle) ?? []) })),
    eleves: eleves.map((e) => {
      const r = recap.get(e.id);
      return {
        id: e.id,
        nom: nom(e),
        aUnParent: Boolean(e.parentId),
        verdict: estVerdict(r?.verdict) ? (r!.verdict as Verdict) : null,
        commentaire: r?.comment ?? "",
        envoyeLe: r?.sentAt?.toISOString() ?? null,
        vuLe: r?.seenAt?.toISOString() ?? null,
      };
    }),
    observations: obs.map((o) => ({
      id: o.id,
      studentId: o.studentId,
      subjectKey: o.subjectKey,
      subjectName: o.subjectName,
      date: o.date.toISOString(),
      kind: (o.kind === "FORT" ? "FORT" : "TRAVAIL") as TypeObservation,
      topics: Array.isArray(o.topics) ? (o.topics as unknown[]).filter((x): x is string => typeof x === "string") : [],
      note: o.gradeValue !== null && o.gradeMax ? { libelle: o.gradeLabel ?? "Note", valeur: o.gradeValue, max: o.gradeMax } : null,
      action: o.action,
      commentaire: o.comment,
      auteur: auteurs.get(o.authorId) ?? "—",
      estAMoi: o.authorId === actor.userId,
      prevenu: Boolean(o.notifiedAt),
    })),
    notes: grades
      .map((g) => {
        const cle = elementaire ? g.subDisciplineId : g.subjectId;
        if (!cle || !nomMatiere.has(cle)) return null;
        return {
          studentId: g.studentId,
          subjectKey: cle,
          matiere: nomMatiere.get(cle)!,
          libelle: g.evaluation?.name ?? (g.type === "EXAM" ? "Composition" : "Devoir"),
          valeur: g.value,
          max: g.max,
          date: g.date.toISOString(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    peutObserver,
    peutEnvoyer,
    principal: classe.teacher ? nom(classe.teacher) : null,
    moi: nom(moi),
  };
}

/** Nom de matière autorisé pour une clé (matière de la classe modifiable par l'acteur, ou sujet spécial). */
export function matiereAutorisee(s: SemaineClasse, cle: string): { nom: string } | null {
  if (cle === "LECONS" || cle === "DEVOIRS" || cle === "GENERAL") return { nom: SUJETS_SPECIAUX[cle] };
  const m = s.matieres.find((x) => x.cle === cle);
  return m && m.editable ? { nom: m.nom } : null;
}

export async function actionsPerso(schoolId: string): Promise<Record<string, string>> {
  const s = await prisma.weeklyReviewSetting.findUnique({ where: { schoolId }, select: { actions: true } }).catch(() => null);
  const a = (s?.actions ?? {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(a).filter((x): x is [string, string] => typeof x[1] === "string"));
}

/* ═══════════════════════ Côté familles ═══════════════════════ */

export type BilanFamille = { id: string; semaine: string; envoyeLe: string; snapshot: SnapshotBilan; nouveau: boolean };
export type ObservationFamille = {
  id: string;
  date: string;
  matiere: string;
  kind: TypeObservation;
  topics: string[];
  note: string | null;
  action: string | null;
  commentaire: string | null;
};

/**
 * Pour chaque enfant : les bilans ENVOYÉS (8 dernières semaines, le plus récent
 * marqué « vu ») et, pour la semaine en cours, les observations dont le parent
 * a déjà été prévenu (point du jour) — tant que le bilan n'est pas parti.
 */
export async function bilansFamille(
  schoolId: string,
  studentIds: string[],
): Promise<{ bilans: Map<string, BilanFamille[]>; semaine: Map<string, ObservationFamille[]> }> {
  const bilans = new Map<string, BilanFamille[]>();
  const semaine = new Map<string, ObservationFamille[]>();
  if (!studentIds.length) return { bilans, semaine };
  try {
    const lundi = lundiDe();
    const [rows, obs] = await Promise.all([
      prisma.weeklyReview.findMany({
        where: { schoolId, studentId: { in: studentIds }, sentAt: { not: null } },
        orderBy: { weekStart: "desc" },
        take: 8 * studentIds.length,
        select: { id: true, studentId: true, weekStart: true, sentAt: true, seenAt: true, snapshot: true },
      }),
      prisma.studentObservation.findMany({
        where: { schoolId, studentId: { in: studentIds }, notifiedAt: { not: null }, date: { gte: lundi } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    ]);
    for (const r of rows) {
      const snap = r.snapshot as SnapshotBilan | null;
      if (!snap || snap.v !== 2 || !r.sentAt) continue;
      const liste = bilans.get(r.studentId) ?? [];
      if (liste.length >= 8) continue;
      liste.push({ id: r.id, semaine: r.weekStart.toISOString(), envoyeLe: r.sentAt.toISOString(), snapshot: snap, nouveau: !r.seenAt });
      bilans.set(r.studentId, liste);
    }
    const recapCetteSemaine = new Set(rows.filter((r) => r.weekStart.getTime() === lundi.getTime()).map((r) => r.studentId));
    for (const o of obs) {
      if (recapCetteSemaine.has(o.studentId)) continue;
      semaine.set(o.studentId, [
        ...(semaine.get(o.studentId) ?? []),
        {
          id: o.id,
          date: o.date.toISOString(),
          matiere: o.subjectName,
          kind: o.kind === "FORT" ? "FORT" : "TRAVAIL",
          topics: Array.isArray(o.topics) ? (o.topics as unknown[]).filter((x): x is string => typeof x === "string") : [],
          note: o.gradeValue !== null && o.gradeMax ? `${o.gradeLabel ?? "Note"} ${o.gradeValue}/${o.gradeMax}` : null,
          action: o.action,
          commentaire: o.comment,
        },
      ]);
    }
    const aMarquer = [...bilans.values()].map((l) => l[0]).filter((x) => x?.nouveau).map((x) => x.id);
    if (aMarquer.length) await prisma.weeklyReview.updateMany({ where: { id: { in: aMarquer } }, data: { seenAt: new Date() } });
  } catch (e) {
    console.error("[bilan] lecture côté famille impossible :", (e as Error).message);
  }
  return { bilans, semaine };
}

/**
 * Rappel du vendredi (tâche quotidienne) : le professeur principal d'une classe
 * où des observations ont été notées cette semaine, et dont le bilan n'est pas
 * encore parti, reçoit un rappel. Ne fait rien les autres jours.
 */
export async function rappelerBilansDuVendredi(maintenant = new Date()): Promise<number> {
  if (maintenant.getUTCDay() !== 5) return 0;
  const lundi = lundiDe(maintenant);
  try {
    const actives = await prisma.studentObservation.groupBy({ by: ["classId"], where: { date: { gte: lundi } } });
    if (!actives.length) return 0;
    const envoyees = new Set(
      (await prisma.weeklyReview.findMany({ where: { weekStart: lundi, sentAt: { not: null } }, select: { classId: true }, distinct: ["classId"] })).map((r) => r.classId),
    );
    const classes = await prisma.class.findMany({
      where: { id: { in: actives.map((a) => a.classId).filter((id) => !envoyees.has(id)) }, teacherId: { not: null } },
      select: { id: true, name: true, schoolId: true, teacherId: true },
    });
    const { notifier } = await import("@/lib/notifications");
    for (const c of classes) {
      await notifier(c.schoolId, [c.teacherId!], {
        title: `📘 Bilan de la semaine — ${c.name}`,
        body: "Les observations de la semaine sont prêtes : relisez et envoyez le bilan aux familles.",
        url: `/dashboard/grades/bilan-semaine?classId=${c.id}`,
        tag: `rappel-bilan-${c.id}-${lundi.toISOString().slice(0, 10)}`,
        kind: "pedagogie.bilan",
      });
    }
    return classes.length;
  } catch (e) {
    console.error("[bilan] rappel du vendredi impossible :", (e as Error).message);
    return 0;
  }
}
