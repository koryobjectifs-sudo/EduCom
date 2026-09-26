import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { notifier } from "@/lib/notifications";

/**
 * Bulletins côté familles — 26 sept. 2026 (règle de Kory).
 *
 * ═══ RÈGLE (seule autorité) ═══
 * Validation du secrétariat (APPROVED) = « bon à tirer » INTERNE.
 * Puis conseil de classe, puis DISTRIBUTION décidée par la direction ou le
 * secrétariat, avec une date. Un parent ne voit le bulletin d'un trimestre
 * que si la distribution existe pour la classe de son enfant ET que sa date
 * est atteinte. Avant : rien, ni bulletin, ni notes, ni moyennes.
 *
 * Échec FERMÉ : si la table n'existe pas encore (base pas à jour), aucun
 * bulletin n'est visible côté parent.
 */
export const GERE_DISTRIBUTION = ["OWNER", "ADMIN", "SECRETARY"];
const cle = (classId: string, termId: string) => `${classId}:${termId}`;

/** Couples classe:trimestre distribués ET dont la date est atteinte. */
export async function distributionsPubliees(schoolId: string, classIds: string[]): Promise<Map<string, Date>> {
  if (!classIds.length) return new Map();
  try {
    const rows = await prisma.bulletinDistribution.findMany({
      where: { schoolId, classId: { in: classIds }, publishAt: { lte: new Date() } },
      select: { classId: true, termId: true, publishAt: true },
    });
    return new Map(rows.map((r) => [cle(r.classId, r.termId), r.publishAt]));
  } catch (e) {
    console.error("[bulletins] distributions illisibles — rien n'est montré aux parents :", (e as Error).message);
    return new Map();
  }
}

/** Trimestres distribués pour un élève (toutes ses classes), du plus récent au plus ancien. */
export async function bulletinsDistribuesEleve(schoolId: string, studentId: string) {
  const inscriptions = await prisma.enrollment.findMany({
    where: { studentId, class: { schoolId } },
    select: { classId: true },
  });
  const classIds = [...new Set(inscriptions.map((i) => i.classId))];
  const publiees = await distributionsPubliees(schoolId, classIds);
  if (!publiees.size) return [];
  const termIds = [...new Set([...publiees.keys()].map((k) => k.split(":")[1]))];
  const termes = await prisma.term.findMany({ where: { id: { in: termIds }, schoolId }, select: { id: true, name: true } });
  const nomTerme = new Map(termes.map((t) => [t.id, t.name]));
  return [...publiees.entries()]
    .map(([k, date]) => {
      const [classId, termId] = k.split(":");
      return { classId, termId, terme: nomTerme.get(termId) ?? "Trimestre", date: date.toISOString() };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Un parent peut-il voir ce bulletin ? (classe + trimestre distribués, date atteinte) */
export async function bulletinVisibleParent(schoolId: string, classId: string, termId: string): Promise<boolean> {
  return (await distributionsPubliees(schoolId, [classId])).has(cle(classId, termId));
}

/* ═══════════════════════ Écran de distribution (direction, secrétariat) ═══════════════════════ */

export type EtatClasse = {
  classId: string;
  classe: string;
  eleves: number;
  approuves: number;
  autres: number;
  pret: boolean;
  distribution: { publishAt: string; publie: boolean; notifie: boolean } | null;
};

export async function etatDistribution(actor: ActorContext, termId: string): Promise<EtatClasse[]> {
  const [classes, cartes, distributions] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: actor.schoolId },
      select: { id: true, name: true, _count: { select: { enrollments: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.reportCard.groupBy({
      by: ["classId", "status"],
      where: { schoolId: actor.schoolId, termId },
      _count: { _all: true },
    }),
    prisma.bulletinDistribution.findMany({ where: { schoolId: actor.schoolId, termId } }).catch(() => []),
  ]);
  const maintenant = new Date();
  return classes.map((c) => {
    const lignes = cartes.filter((x) => x.classId === c.id);
    const approuves = lignes.filter((x) => x.status === "APPROVED").reduce((t, x) => t + x._count._all, 0);
    const autres = lignes.filter((x) => x.status !== "APPROVED").reduce((t, x) => t + x._count._all, 0);
    const d = distributions.find((x) => x.classId === c.id);
    return {
      classId: c.id,
      classe: c.name,
      eleves: c._count.enrollments,
      approuves,
      autres,
      // Prête : au moins un bulletin, et tous approuvés par le secrétariat.
      pret: approuves > 0 && autres === 0,
      distribution: d ? { publishAt: d.publishAt.toISOString(), publie: d.publishAt <= maintenant, notifie: Boolean(d.notifiedAt) } : null,
    };
  });
}

/**
 * Prévient les parents des distributions arrivées à échéance et pas encore
 * annoncées. Idempotent (`notifiedAt`). Appelé par la tâche quotidienne, à la
 * distribution immédiate, et à l'ouverture de l'espace famille.
 */
export async function annoncerDistributionsEchues(schoolId?: string): Promise<number> {
  let dues: { id: string; schoolId: string; classId: string; termId: string }[] = [];
  try {
    dues = await prisma.bulletinDistribution.findMany({
      where: { ...(schoolId ? { schoolId } : {}), publishAt: { lte: new Date() }, notifiedAt: null },
      select: { id: true, schoolId: true, classId: true, termId: true },
      take: 200,
    });
  } catch {
    return 0;
  }
  let prevenus = 0;
  for (const d of dues) {
    // On « prend » la ligne d'abord : deux passages simultanés n'envoient pas deux fois.
    const pris = await prisma.bulletinDistribution.updateMany({ where: { id: d.id, notifiedAt: null }, data: { notifiedAt: new Date() } });
    if (!pris.count) continue;
    const [eleves, terme] = await Promise.all([
      prisma.student.findMany({
        where: { schoolId: d.schoolId, parentId: { not: null }, enrollments: { some: { classId: d.classId } } },
        select: { firstName: true, parentId: true },
      }),
      prisma.term.findUnique({ where: { id: d.termId }, select: { name: true } }),
    ]);
    const parParent = new Map<string, string[]>();
    for (const e of eleves) parParent.set(e.parentId!, [...(parParent.get(e.parentId!) ?? []), e.firstName]);
    for (const [parentId, enfants] of parParent) {
      await notifier(d.schoolId, [parentId], {
        title: `📄 Bulletin disponible — ${terme?.name ?? "trimestre"}`,
        body: `Le bulletin de ${enfants.join(", ")} est disponible dans votre espace EduCom.`,
        url: "/famille/notes",
        tag: `bulletin-${d.id}`,
        kind: "famille.bulletin",
      });
      prevenus++;
    }
  }
  return prevenus;
}
