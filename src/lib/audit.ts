import { prisma } from "@/lib/prisma";
import type { RoleType } from "@/lib/permissions";

/**
 * Journal d'activité — « qui a fait quoi, quand, sur quel objet, avec quel
 * résultat ? »
 *
 * ═══ LA TABLE EXISTAIT DÉJÀ ═══
 *
 * `AuditLog` est présente au schéma depuis le début du projet — `action`,
 * `entity`, `entityId`, `userId`, `schoolId`, `details`, `createdAt`, avec des
 * index sur `schoolId` et `userId`. Elle n'a **jamais été utilisée** : zéro
 * référence en code, zéro ligne en base.
 *
 * Ce module l'adopte au lieu d'en créer une seconde. Une table d'audit
 * parallèle aurait fragmenté l'historique dès la première écriture.
 *
 * ═══ L'ACTEUR NE VIENT JAMAIS DU CLIENT ═══
 *
 * `recordAudit` n'accepte pas d'identifiant en argument libre : elle exige un
 * `ActorContext`, le type produit par `requireActionContext()` et
 * `requireSchoolContext()`. Le `schoolId` et le `userId` sont donc toujours ceux
 * de la session. C'est la règle posée au lot 01, après avoir trouvé six actions
 * qui acceptaient un `schoolId` du client.
 *
 * ═══ UNE ÉCRITURE D'AUDIT NE DOIT JAMAIS CASSER L'ACTION MÉTIER ═══
 *
 * Décision assumée : si l'insertion échoue, on journalise l'erreur et on
 * continue. Un encaissement de paiement ne doit pas être annulé parce que sa
 * trace n'a pas pu être écrite. La conséquence est acceptée : l'audit est un
 * journal de bonne foi, pas une garantie transactionnelle. Un module qui aurait
 * besoin d'une trace **inséparable** de l'écriture métier doit inscrire la ligne
 * dans sa propre transaction Prisma, pas via ce helper.
 */

/** Contexte d'acteur, tel que résolu côté serveur. */
export type ActorContext = {
  userId: string;
  schoolId: string;
  role: RoleType | string;
};

/**
 * Acteur pour les traitements automatiques (lot 11.1).
 *
 * ⚠️ **Une transition déclenchée par une tâche ne doit jamais être attribuée à
 * un humain.** Réutiliser l'identifiant du dernier utilisateur connecté, ou
 * celui du propriétaire de l'école, ferait dire à l'historique qu'une personne a
 * agi alors qu'elle dormait.
 *
 * `AuditLog.userId` est une colonne `String` **sans clé étrangère** (vérifié au
 * lot 10) : cette valeur sentinelle s'y écrit sans contrainte à violer. Le
 * `schoolId` reste celui de l'établissement traité — l'isolation ne fléchit pas
 * parce que l'acteur est une machine.
 *
 * `isSystemActor()` permet aux écrans d'historique de l'afficher comme tel au
 * lieu de « Compte supprimé », ce que produirait une recherche infructueuse dans
 * le répertoire du personnel.
 */
export const SYSTEM_ACTOR_ID = "system";
export const SYSTEM_ACTOR_ROLE = "SYSTEM";

export function systemActor(schoolId: string): ActorContext {
  return { userId: SYSTEM_ACTOR_ID, schoolId, role: SYSTEM_ACTOR_ROLE };
}

export function isSystemActor(userId: string | null | undefined): boolean {
  return userId === SYSTEM_ACTOR_ID;
}

/**
 * Types d'objets auditables.
 *
 * Volontairement une union ouverte de chaînes connues plutôt qu'une énumération
 * Prisma : les modules à venir en ajouteront, et faire migrer une énumération en
 * production pour chaque nouveau type serait disproportionné. La colonne
 * `entity` est déjà un `String` au schéma.
 */
export type AuditEntity =
  | "student"
  | "document"
  | "payment"
  | "invoice"
  | "expense"
  | "financialStatement"
  | "reportCard"
  | "report"
  | "workflow"
  | "school"
  | "user"
  | "class"
  // Lot 12.1 — référentiel financier. `feeItem` porte l'historique des
  // montants (ancien → nouveau) : aucune table de révision n'a été créée,
  // `auditForEntity("feeItem", id)` la restitue déjà.
  | "feeSchedule"
  | "feeItem"
  | "feeChangeRequest"
  // Lot 16 — transmission d'un ensemble de dossiers. AUCUNE table de
  // transmission n'a été créée : l'acte vit ici, et une ligne `student` par
  // dossier rend le compteur « transmis » interrogeable sans lire `details`.
  | "transmission"
  // Lot 17 — diffusion d'un document. AUCUNE table non plus : l'acte vit ici,
  // et une ligne sur le document (`schoolDocument` / `studentDocument`) rend
  // « ce document a-t-il été diffusé ? » interrogeable par index.
  | "diffusion"
  // Lot 15 — centre documentaire de l'établissement. Là encore aucune table
  // d'historique : `auditForEntity("schoolDocument", id)` restitue création,
  // publication, dépublication, archivage, remplacement et téléchargement.
  | "schoolDocument"
  // Lot 13 — dossier élève. AUCUNE table d'historique n'a été créée :
  // `auditForEntity("studentDocument", id)` restitue ajout, remplacement,
  // validation, rejet et téléchargement d'une pièce.
  | "studentDocument"
  | "documentRequirement"
  // Rayons personnalisés du dossier élève (3 septembre 2026). Aucune table
  // d'historique non plus : la création d'un classeur vit ici.
  | "studentDocFolder"
  // ═══ Configuration pédagogique (22 août 2026) ═══
  //
  // AUCUNE table d'historique n'a été créée pour le calendrier scolaire, et
  // c'est le même arbitrage que pour `transmission` et `diffusion` : l'acte vit
  // ici. `auditForEntity("evaluation", id)` restitue les déplacements successifs
  // d'une composition, avec l'ancienne et la nouvelle date dans `details` — ce
  // qu'une colonne `date` seule ne pourrait jamais dire.
  //
  // ⚠️ C'est cette trace qui alimente l'avertissement de changement de planning
  // affiché aux enseignants (`src/lib/planningNotice.ts`). Sans elle, déplacer
  // une composition serait un acte SILENCIEUX : la nouvelle date remplacerait
  // l'ancienne et personne ne saurait qu'il faut prévenir qui que ce soit.
  | "term"
  | "evaluation"
  // Application du programme type. Une seule ligne par application, avec le
  // détail de ce qui a été créé et de ce qui existait déjà.
  | "curriculum";

/** Résultat de l'action. Répond au « avec quel résultat ? ». */
export type AuditOutcome = "success" | "failure" | "denied";

export type AuditEntry = {
  /** Verbe de l'action, en minuscules : `create`, `update`, `submit`, `approve`… */
  action: string;
  entity: AuditEntity;
  /** Identifiant de l'objet. Absent pour une action de liste ou d'export. */
  entityId?: string | null;
  outcome?: AuditOutcome;
  /**
   * Contexte libre, sérialisé en JSON dans la colonne `details` (un `String?`).
   *
   * ⚠️ Ne jamais y mettre de secret, de mot de passe ni de jeton : cette colonne
   * est lue par les écrans d'historique.
   */
  details?: Record<string, unknown>;
};

/**
 * Construit la ligne à insérer, sans l'insérer.
 *
 * Exposé pour que `workflowHistory.ts` puisse écrire l'audit **dans la même
 * transaction** que l'historique de transition : les deux lignes décrivent le
 * même acte, et n'en avoir qu'une donnerait un historique faux. Les appelants
 * ordinaires utilisent `recordAudit()`.
 */
export function auditData(actor: ActorContext, entry: AuditEntry) {
  return {
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    userId: actor.userId,
    schoolId: actor.schoolId,
    details: serialiseDetails(actor, entry),
  };
}

/**
 * Inscrit une ligne d'audit.
 *
 * Ne lève jamais. Renvoie `true` si la trace a été écrite, `false` sinon —
 * l'appelant peut l'ignorer sans risque.
 */
export async function recordAudit(actor: ActorContext, entry: AuditEntry): Promise<boolean> {
  try {
    await prisma.auditLog.create({ data: auditData(actor, entry) });
    return true;
  } catch (error) {
    // Journalisé mais non propagé : voir l'avertissement en tête de fichier.
    console.error("[audit] écriture impossible :", error);
    return false;
  }
}

/**
 * Sérialise le contexte dans `details`.
 *
 * Le rôle de l'acteur y est conservé : il peut changer avec le temps, et un
 * historique doit dire avec quel rôle l'action a été faite, pas quel rôle la
 * personne porte aujourd'hui.
 */
function serialiseDetails(actor: ActorContext, entry: AuditEntry): string {
  return JSON.stringify({
    role: actor.role,
    outcome: entry.outcome ?? "success",
    ...(entry.details ?? {}),
  });
}

/* ─────────────────────────────── lecture ─────────────────────────────── */

export type AuditRecord = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string;
  createdAt: Date;
  role?: string;
  outcome?: string;
  details: Record<string, unknown>;
};

/** Décode la colonne `details`, sans jamais lever sur un JSON abîmé. */
function decode(row: {
  id: string; action: string; entity: string; entityId: string | null;
  userId: string; details: string | null; createdAt: Date;
}): AuditRecord {
  let parsed: Record<string, unknown> = {};
  try {
    if (row.details) parsed = JSON.parse(row.details) as Record<string, unknown>;
  } catch {
    // Une ligne d'historique illisible ne doit pas casser l'écran qui l'affiche.
    parsed = { raw: row.details };
  }
  const { role, outcome, ...rest } = parsed as { role?: string; outcome?: string };
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    userId: row.userId,
    createdAt: row.createdAt,
    role,
    outcome,
    details: rest as Record<string, unknown>,
  };
}

/**
 * Historique d'un objet précis.
 *
 * ⚠️ Le `schoolId` est **toujours** appliqué, même si `entityId` est déjà unique :
 * sans lui, connaître un identifiant suffirait à lire l'historique d'un autre
 * établissement. Quatre fuites de ce type ont été trouvées dans ce projet ; ce
 * helper ne permet pas de les reproduire, la signature exigeant le contexte.
 */
export async function auditForEntity(
  actor: ActorContext,
  entity: AuditEntity,
  entityId: string,
  take = 50,
): Promise<AuditRecord[]> {
  const rows = await prisma.auditLog.findMany({
    where: { schoolId: actor.schoolId, entity, entityId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(decode);
}

/** Activité récente de l'établissement, tous objets confondus. */
export async function recentAudit(actor: ActorContext, take = 50): Promise<AuditRecord[]> {
  const rows = await prisma.auditLog.findMany({
    where: { schoolId: actor.schoolId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(decode);
}
