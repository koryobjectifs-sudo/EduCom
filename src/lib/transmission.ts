import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { recordAudit, auditForEntity } from "@/lib/audit";
import { studentWhereFor } from "@/lib/studentScope";
import { studentExportPlan, dossierState, type DossierState } from "@/lib/exportDossier";

/**
 * Transmission des dossiers — lot 16.
 *
 * ═══ EDUCOM NE TRANSMET RIEN, ET NE PRÉTEND PAS LE CONTRAIRE ═══
 *
 * ⚠️ **Aucune intégration avec une administration n'existe.** Ni inspection, ni
 * académie, ni ministère : rien dans ce dépôt n'ouvre une connexion vers un
 * système officiel. Écrire « dossier transmis à l'Inspection » serait le
 * mensonge le plus coûteux possible — une directrice croirait sa classe en règle
 * à la veille d'un contrôle.
 *
 * Ce que le module fait réellement : **enregistrer qu'un humain a transmis**,
 * avec son nom, la date, la liste des dossiers et la méthode. La seule méthode
 * disponible aujourd'hui s'appelle `TRANSMISSION_MANUELLE`, et l'écran l'écrit.
 *
 * ═══ AUCUNE TABLE NOUVELLE ═══
 *
 * ⚠️ `AuditLog` porte déjà « qui / quoi / quand / avec quel résultat ». Une
 * transmission y écrit **deux sortes de lignes**, et c'est délibéré :
 *
 *   1. une ligne `transmission` : l'acte complet, avec sa liste de dossiers ;
 *   2. une ligne `student` par dossier concerné.
 *
 * La seconde n'est pas une redondance : `details` est stocké sérialisé, donc
 * non interrogeable. Sans ligne par élève, compter « 72 dossiers transmis »
 * exigerait de relire et d'analyser tout le journal. Avec elle, c'est un
 * `groupBy` indexé — un compteur exact, pas une estimation.
 */

/** Seule méthode réellement disponible. Nommée pour ne pas laisser croire à une autre. */
export const MANUAL_METHOD = "TRANSMISSION_MANUELLE";

export const TRANSMISSION_METHODS: Record<string, string> = {
  TRANSMISSION_MANUELLE: "Transmission manuelle (remise, courriel, clé USB…)",
};

/** Action d'audit portée par la ligne « un dossier a été transmis ». */
export const TRANSMITTED_ACTION = "student.dossier.transmis";

/**
 * Enregistre une transmission déclarée par un humain.
 *
 * ⚠️ Les identifiants sont filtrés par le périmètre AVANT d'être écrits : sans
 * quoi on pourrait déclarer transmis le dossier d'un élève qu'on n'a pas le
 * droit de voir, et polluer les compteurs d'un autre service.
 */
export async function recordTransmission(
  actor: ActorContext,
  input: { studentIds: string[]; destination?: string | null; note?: string | null },
): Promise<{ transmissionId: string; students: { id: string; name: string }[] } | { error: string }> {
  const unique = [...new Set(input.studentIds)].filter(Boolean).slice(0, 200);
  if (unique.length === 0) return { error: "Aucun dossier sélectionné." };

  const scope = await studentWhereFor(actor);
  const students = await prisma.student.findMany({
    where: { AND: [scope, { id: { in: unique }, schoolId: actor.schoolId }] },
    select: { id: true, firstName: true, lastName: true },
  });
  if (students.length === 0) return { error: "Aucun des dossiers sélectionnés ne vous est accessible." };

  const transmissionId = crypto.randomUUID();
  const list = students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));

  await recordAudit(actor, {
    action: "transmission.record",
    entity: "transmission",
    entityId: transmissionId,
    outcome: "success",
    details: {
      method: MANUAL_METHOD,
      destination: input.destination?.trim() || null,
      note: input.note?.trim() || null,
      count: list.length,
      students: list,
      // ⚠️ Écrit noir sur blanc dans le journal : rien n'a quitté EduCom.
      sentByEduCom: false,
    },
  });

  // Une ligne par dossier — c'est elle qui rend le compteur interrogeable.
  for (const s of list) {
    await recordAudit(actor, {
      action: TRANSMITTED_ACTION,
      entity: "student",
      entityId: s.id,
      outcome: "success",
      details: { transmissionId, method: MANUAL_METHOD, destination: input.destination?.trim() || null },
    });
  }

  return { transmissionId, students: list };
}

/** Identifiants des élèves déjà déclarés transmis (dans le périmètre demandé). */
export async function transmittedStudentIds(actor: ActorContext, among?: string[]): Promise<Set<string>> {
  const rows = await prisma.auditLog.groupBy({
    by: ["entityId"],
    where: {
      schoolId: actor.schoolId,
      entity: "student",
      action: TRANSMITTED_ACTION,
      ...(among?.length ? { entityId: { in: among } } : {}),
    },
  });
  return new Set(rows.map((r) => r.entityId).filter((v): v is string => Boolean(v)));
}

/**
 * Historique des transmissions de l'établissement.
 *
 * Relu depuis `AuditLog`, borné par `schoolId` comme tout le reste.
 */
export async function transmissionHistory(actor: ActorContext, take = 30) {
  const rows = await prisma.auditLog.findMany({
    where: { schoolId: actor.schoolId, entity: "transmission", action: "transmission.record" },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, entityId: true, userId: true, createdAt: true },
  });
  if (rows.length === 0) return [];

  // `auditForEntity()` décode `details`, qui est stocké sérialisé.
  const detailed = await Promise.all(rows.map((r) => auditForEntity(actor, "transmission", r.entityId!, 1)));
  const userIds = [...new Set(rows.map((r) => r.userId))].filter((v): v is string => Boolean(v));
  const users = userIds.length
    ? await prisma.user.findMany({ where: { schoolId: actor.schoolId, id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, role: true } })
    : [];

  return rows.map((r, i) => {
    const d = detailed[i][0]?.details ?? {};
    const u = users.find((x) => x.id === r.userId);
    return {
      id: r.entityId!,
      at: r.createdAt,
      who: u ? `${u.firstName} ${u.lastName}` : "Compte supprimé",
      role: u?.role ?? null,
      method: typeof d.method === "string" ? d.method : MANUAL_METHOD,
      destination: typeof d.destination === "string" ? d.destination : null,
      note: typeof d.note === "string" ? d.note : null,
      count: typeof d.count === "number" ? d.count : 0,
      students: Array.isArray(d.students) ? (d.students as { id: string; name: string }[]) : [],
    };
  });
}

/* ═══════════════════ tableau de préparation (§9) ═══════════════════ */

export type PreparationRow = {
  studentId: string;
  name: string;
  className: string | null;
  state: DossierState;
  required: number;
  received: number;
  missing: number;
  toVerify: number;
  transmitted: boolean;
  documents: number;
  excludedCategories: string[];
};

/**
 * État de préparation d'un ensemble d'élèves.
 *
 * ⚠️ **Les chiffres sont réels ou absents.** Chaque ligne provient d'un vrai
 * `studentExportPlan()`, donc de la complétude du lot 13 — aucune estimation,
 * aucun compteur décoratif.
 *
 * ⚠️ **Le coût est assumé et borné.** Un plan par élève, c'est quelques requêtes
 * par élève : parfait pour une classe (vingt à quarante), déraisonnable pour une
 * école entière d'un coup. L'appelant borne donc la liste — et l'écran dit sur
 * quel ensemble portent les chiffres, plutôt que d'afficher un total d'école
 * calculé sur un échantillon.
 */
export const PREPARATION_LIMIT = 60;

export async function preparationSummary(actor: ActorContext, studentIds: string[]) {
  const unique = [...new Set(studentIds)].filter(Boolean);
  const truncated = unique.length > PREPARATION_LIMIT;
  const kept = unique.slice(0, PREPARATION_LIMIT);

  const scope = await studentWhereFor(actor);
  const students = kept.length
    ? await prisma.student.findMany({
        where: { AND: [scope, { id: { in: kept }, schoolId: actor.schoolId }] },
        select: {
          id: true, firstName: true, lastName: true,
          enrollments: { select: { class: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
    : [];

  const transmitted = await transmittedStudentIds(actor, students.map((s) => s.id));

  const rows: PreparationRow[] = [];
  for (const s of students) {
    const plan = await studentExportPlan(actor, s.id);
    if (!plan) continue;
    rows.push({
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      className: s.enrollments[0]?.class.name ?? null,
      state: plan.state,
      required: plan.completeness.required,
      received: plan.completeness.received,
      missing: plan.completeness.missing,
      toVerify: plan.completeness.toVerify,
      transmitted: transmitted.has(s.id),
      documents: plan.entries.length,
      excludedCategories: plan.excludedCategories,
    });
  }

  const count = (st: DossierState) => rows.filter((r) => r.state === st).length;
  return {
    rows,
    truncated,
    limit: PREPARATION_LIMIT,
    counts: {
      ready: count("PRET"),
      incomplete: count("INCOMPLET"),
      toVerify: count("A_VERIFIER"),
      unconfigured: count("NON_CONFIGURE"),
      transmitted: rows.filter((r) => r.transmitted).length,
    },
  };
}

/** Vrai si l'état des dossiers est calculable — sinon l'écran doit le dire. */
export function dossierStateOf(c: Parameters<typeof dossierState>[0]) {
  return dossierState(c);
}
