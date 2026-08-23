"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { authorizeTransition, recordTransition } from "@/lib/workflowHistory";
import { feeChangeWorkflow, FEE_REVIEW_PATH } from "@/lib/workflow";
import { notifyRoles, describeAmountChange, feeKindLabel } from "@/lib/fees";
import type { FeeKind, FeeCadence, EducationalCycle } from "../../../../generated/prisma/client";

/**
 * Référentiel tarifaire — actions serveur. Lot 12.1.
 *
 * ═══ QUI PEUT QUOI, ET D'OÙ VIENT CETTE RÈGLE ═══
 *
 * Toutes les écritures de la grille exigent `FEE_REVIEW_PATH`
 * (`/dashboard/settings`), qu'**aucun rôle ne liste** dans `ROLE_PERMISSIONS` :
 * seuls OWNER et ADMIN l'atteignent, via `"*"`. La direction est donc la source
 * de vérité des tarifs **sans qu'aucun rôle ne soit cité dans ce fichier**.
 *
 * Le gestionnaire, lui, passe par `requestFeeChange()`, qui exige seulement
 * `/dashboard/payments`. Il propose ; il n'écrit jamais la grille.
 *
 * ⚠️ Aucune de ces signatures n'accepte de `schoolId` : il vient de
 * `requireActionContext()`, donc de la session.
 */

const PAYMENTS_PATH = "/dashboard/payments";

function revalidateAll() {
  revalidatePath("/dashboard/settings/fees");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/payments");
}

/* ═════════════════════ grille : direction uniquement ═════════════════════ */

export async function createSchedule(input: { academicYear: string; label: string }) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  if (!input.academicYear.trim() || !input.label.trim()) {
    return { error: "L'année scolaire et le libellé sont obligatoires." };
  }

  const schedule = await prisma.feeSchedule.create({
    data: {
      academicYear: input.academicYear.trim(),
      label: input.label.trim(),
      schoolId: ctx.schoolId,
      createdById: ctx.userId,
    },
  });

  await recordAudit(ctx, {
    action: "feeSchedule.create",
    entity: "feeSchedule",
    entityId: schedule.id,
    outcome: "success",
    details: { academicYear: schedule.academicYear, label: schedule.label },
  });

  revalidateAll();
  return { data: { id: schedule.id } };
}

/**
 * Rend une grille officielle.
 *
 * ⚠️ **Une seule grille ACTIVE par école.** Postgres ne sait pas l'exprimer sans
 * index partiel (que Prisma ne déclare pas), donc la règle est tenue ici : les
 * autres grilles actives passent en ARCHIVED dans la **même transaction**. Sans
 * transaction, un incident entre les deux écritures laisserait deux grilles
 * actives et le forecast dépendrait de l'ordre de tri.
 */
export async function activateSchedule(id: string) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const target = await prisma.feeSchedule.findFirst({
    where: { id, schoolId: ctx.schoolId },
    select: { id: true, label: true, status: true, _count: { select: { items: true } } },
  });
  if (!target) return { error: "Grille introuvable dans votre établissement." };
  if (target._count.items === 0) {
    return { error: "Une grille sans aucune ligne tarifaire ne peut pas devenir officielle." };
  }

  await prisma.$transaction([
    prisma.feeSchedule.updateMany({
      where: { schoolId: ctx.schoolId, status: "ACTIVE", id: { not: id } },
      data: { status: "ARCHIVED" },
    }),
    prisma.feeSchedule.updateMany({
      where: { id, schoolId: ctx.schoolId },
      data: { status: "ACTIVE", activatedAt: new Date(), activatedById: ctx.userId },
    }),
  ]);

  await recordAudit(ctx, {
    action: "feeSchedule.activate",
    entity: "feeSchedule",
    entityId: id,
    outcome: "success",
    details: { label: target.label, previousStatus: target.status },
  });

  // PARTIE K — le gestionnaire travaille sur cette grille : il doit l'apprendre.
  await notifyRoles(ctx, ["ACCOUNTANT"], {
    kind: "fee.schedule.activated",
    title: "Nouvelle grille tarifaire officielle",
    body: `« ${target.label} » est désormais la grille officielle. Le forecast est recalculé à partir d'elle.`,
    link: "/dashboard/reports",
  });

  revalidateAll();
  return { success: true };
}

export async function archiveSchedule(id: string) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { count } = await prisma.feeSchedule.updateMany({
    where: { id, schoolId: ctx.schoolId },
    data: { status: "ARCHIVED" },
  });
  if (count === 0) return { error: "Grille introuvable dans votre établissement." };

  await recordAudit(ctx, {
    action: "feeSchedule.archive", entity: "feeSchedule", entityId: id, outcome: "success", details: {},
  });
  revalidateAll();
  return { success: true };
}

/* ═════════════════════ lignes tarifaires ═════════════════════ */

export async function upsertFeeItem(input: {
  id?: string;
  scheduleId: string;
  kind: FeeKind;
  label: string;
  amount: number;
  cadence: FeeCadence;
  mandatory: boolean;
  classId?: string | null;
  cycle?: EducationalCycle | null;
}) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { error: "Le montant doit être un nombre positif." };
  }
  // Portée exclusive : une ligne vaut pour une classe OU un cycle OU l'école.
  // Accepter les deux rendrait la résolution ambiguë (voir `resolveFeesForClass`).
  if (input.classId && input.cycle) {
    return { error: "Une ligne vise une classe OU un cycle, pas les deux." };
  }

  const schedule = await prisma.feeSchedule.findFirst({
    where: { id: input.scheduleId, schoolId: ctx.schoolId },
    select: { id: true, status: true },
  });
  if (!schedule) return { error: "Grille introuvable dans votre établissement." };

  // La classe citée doit appartenir à l'école : sinon un identifiant suffirait
  // à rattacher un tarif à la classe d'un autre établissement.
  if (input.classId) {
    const c = await prisma.class.count({ where: { id: input.classId, schoolId: ctx.schoolId } });
    if (c === 0) return { error: "Classe introuvable dans votre établissement." };
  }

  const before = input.id
    ? await prisma.feeItem.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
        select: { id: true, amount: true, label: true, kind: true },
      })
    : null;
  if (input.id && !before) return { error: "Ligne tarifaire introuvable." };

  const data = {
    kind: input.kind,
    label: input.label.trim(),
    amount: input.amount,
    cadence: input.cadence,
    mandatory: input.mandatory,
    classId: input.classId ?? null,
    cycle: input.cycle ?? null,
    scheduleId: schedule.id,
    schoolId: ctx.schoolId,
  };

  const item = before
    ? await prisma.feeItem.update({ where: { id: before.id }, data })
    : await prisma.feeItem.create({ data });

  // PARTIE G — l'ancienne valeur n'est jamais effacée silencieusement.
  // Pas de table de révision : `AuditLog` porte déjà l'avant/après, et
  // `auditForEntity("feeItem", id)` restitue l'historique complet.
  await recordAudit(ctx, {
    action: before ? "feeItem.update" : "feeItem.create",
    entity: "feeItem",
    entityId: item.id,
    outcome: "success",
    details: before
      ? { label: item.label, amountBefore: before.amount, amountAfter: item.amount }
      : { label: item.label, amount: item.amount, kind: item.kind },
  });

  // PARTIE J/K — un tarif officiel qui change modifie le forecast du gestionnaire.
  if (before && before.amount !== item.amount && schedule.status === "ACTIVE") {
    await notifyRoles(ctx, ["ACCOUNTANT"], {
      kind: "fee.updated",
      title: `Tarif modifié — ${feeKindLabel(item.kind)}`,
      body: `« ${item.label} » : ${describeAmountChange(before.amount, item.amount)}. Le forecast est recalculé.`,
      link: "/dashboard/reports",
    });
  }

  revalidateAll();
  return { data: { id: item.id } };
}

export async function upsertBatchFeeItems(scheduleId: string, inputs: {
  id?: string;
  kind: FeeKind;
  label: string;
  amount: number;
  cadence: FeeCadence;
  mandatory: boolean;
  classId?: string | null;
  cycle?: EducationalCycle | null;
}[]) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const schedule = await prisma.feeSchedule.findFirst({
    where: { id: scheduleId, schoolId: ctx.schoolId },
    select: { id: true, status: true },
  });
  if (!schedule) return { error: "Grille introuvable dans votre établissement." };

  let changedCount = 0;

  for (const input of inputs) {
    if (!Number.isFinite(input.amount) || input.amount < 0) continue;
    if (input.classId && input.cycle) continue;

    const before = input.id
      ? await prisma.feeItem.findFirst({
          where: { id: input.id, schoolId: ctx.schoolId },
          select: { id: true, amount: true, label: true, kind: true },
        })
      : null;

    if (before && before.amount === input.amount) {
      continue; // No change
    }

    const data = {
      kind: input.kind,
      label: input.label.trim(),
      amount: input.amount,
      cadence: input.cadence,
      mandatory: input.mandatory,
      classId: input.classId ?? null,
      cycle: input.cycle ?? null,
      scheduleId: schedule.id,
      schoolId: ctx.schoolId,
    };

    const item = before
      ? await prisma.feeItem.update({ where: { id: before.id }, data })
      : await prisma.feeItem.create({ data });

    await recordAudit(ctx, {
      action: before ? "feeItem.update" : "feeItem.create",
      entity: "feeItem",
      entityId: item.id,
      outcome: "success",
      details: before
        ? { label: item.label, amountBefore: before.amount, amountAfter: item.amount, batch: true }
        : { label: item.label, amount: item.amount, kind: item.kind, batch: true },
    });
    
    changedCount++;
  }

  if (changedCount > 0 && schedule.status === "ACTIVE") {
    await notifyRoles(ctx, ["ACCOUNTANT"], {
      kind: "fee.updated",
      title: "Mise à jour tarifaire groupée",
      body: `${changedCount} tarif(s) modifié(s). Le forecast a été recalculé.`,
      link: "/dashboard/reports",
    });
  }

  revalidateAll();
  return { success: true, count: changedCount };
}

export async function deleteFeeItem(id: string) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const item = await prisma.feeItem.findFirst({
    where: { id, schoolId: ctx.schoolId },
    select: { id: true, label: true, amount: true },
  });
  if (!item) return { error: "Ligne tarifaire introuvable." };

  await prisma.feeItem.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  await recordAudit(ctx, {
    action: "feeItem.delete", entity: "feeItem", entityId: id, outcome: "success",
    details: { label: item.label, amount: item.amount },
  });
  revalidateAll();
  return { success: true };
}

/* ═════════════ demandes de modification — le gestionnaire ═════════════ */

/**
 * Le gestionnaire propose un nouveau montant.
 *
 * Exige `/dashboard/payments` seulement : c'est son atelier. La demande naît
 * directement en `SUBMITTED` — un brouillon de demande n'aurait aucun sens,
 * la valeur d'une demande étant d'atteindre la direction.
 */
export async function requestFeeChange(input: { feeItemId: string; proposedAmount: number; reason: string }) {
  const auth = await requireActionContext(PAYMENTS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  if (!Number.isFinite(input.proposedAmount) || input.proposedAmount < 0) {
    return { error: "Le montant proposé doit être un nombre positif." };
  }
  if (!input.reason.trim()) {
    return { error: "Un motif est obligatoire — la direction doit pouvoir juger." };
  }

  const item = await prisma.feeItem.findFirst({
    where: { id: input.feeItemId, schoolId: ctx.schoolId },
    select: { id: true, label: true, amount: true, kind: true },
  });
  if (!item) return { error: "Ligne tarifaire introuvable dans votre établissement." };
  if (item.amount === input.proposedAmount) {
    return { error: "Le montant proposé est identique au montant actuel." };
  }

  const request = await prisma.feeChangeRequest.create({
    data: {
      feeItemId: item.id,
      currentAmount: item.amount,
      proposedAmount: input.proposedAmount,
      reason: input.reason.trim(),
      status: "SUBMITTED",
      requestedById: ctx.userId,
      schoolId: ctx.schoolId,
    },
  });

  // La transition passe par la machine plutôt qu'à côté : `authorizeTransition`
  // revérifie le chemin `preparePath` et journalise un éventuel refus. La
  // demande naît en DRAFT et part aussitôt — c'est la transition déclarée.
  const move = await authorizeTransition(ctx, feeChangeWorkflow, {
    entityId: request.id, from: "DRAFT", to: "SUBMITTED", comment: request.reason,
  });
  if (!move.ok) {
    await prisma.feeChangeRequest.deleteMany({ where: { id: request.id, schoolId: ctx.schoolId } });
    return { error: move.error };
  }
  await recordTransition(ctx, feeChangeWorkflow, {
    entityId: request.id, from: "DRAFT", to: "SUBMITTED", comment: request.reason,
  });

  // La direction doit savoir qu'une décision l'attend.
  await notifyRoles(ctx, ["OWNER", "ADMIN"], {
    kind: "fee.request.submitted",
    title: "Demande de modification tarifaire",
    body: `« ${item.label} » : ${describeAmountChange(item.amount, input.proposedAmount)}. Motif : ${request.reason}`,
    link: "/dashboard/settings/fees",
  });

  revalidateAll();
  return { data: { id: request.id } };
}

/**
 * La direction tranche.
 *
 * ⚠️ **Acceptée → la grille officielle est modifiée dans la même transaction**
 * que la demande. Écrire la décision sans le tarif (ou l'inverse) laisserait la
 * grille et son historique en désaccord.
 *
 * ⚠️ **Refusée → la grille n'est pas touchée.** Le montant proposé reste
 * consultable dans la demande : refuser n'efface pas ce qui a été demandé.
 */
export async function decideFeeChange(input: { id: string; accept: boolean; comment?: string }) {
  const auth = await requireActionContext(FEE_REVIEW_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const request = await prisma.feeChangeRequest.findFirst({
    where: { id: input.id, schoolId: ctx.schoolId },
    include: { feeItem: { select: { id: true, label: true, kind: true, amount: true } } },
  });
  if (!request) return { error: "Demande introuvable dans votre établissement." };

  const to = input.accept ? "APPROVED" : "RETURNED";

  // `authorizeTransition` porte les trois contrôles d'un coup : la transition
  // existe dans la machine, le rôle couvre `reviewPath`, et le commentaire est
  // présent quand la transition l'exige (RETURNED est `commentRequired`, donc
  // un refus non motivé est rejeté ici — pas besoin de le revérifier à la main).
  const move = await authorizeTransition(ctx, feeChangeWorkflow, {
    entityId: request.id, from: request.status as never, to: to as never, comment: input.comment,
  });
  if (!move.ok) return { error: move.error };

  const now = new Date();
  const amountBefore = request.feeItem.amount;

  await prisma.$transaction([
    prisma.feeChangeRequest.updateMany({
      where: { id: request.id, schoolId: ctx.schoolId },
      data: {
        status: to,
        decidedById: ctx.userId,
        decidedAt: now,
        decisionReason: input.comment?.trim() || null,
      },
    }),
    // Le tarif ne bouge QUE sur acceptation.
    ...(input.accept
      ? [prisma.feeItem.updateMany({
          where: { id: request.feeItemId, schoolId: ctx.schoolId },
          data: { amount: request.proposedAmount },
        })]
      : []),
  ]);

  await recordTransition(ctx, feeChangeWorkflow, {
    entityId: request.id,
    from: request.status as never,
    to: to as never,
    comment: input.comment,
  });

  if (input.accept) {
    await recordAudit(ctx, {
      action: "feeItem.update",
      entity: "feeItem",
      entityId: request.feeItemId,
      outcome: "success",
      details: {
        label: request.feeItem.label,
        amountBefore,
        amountAfter: request.proposedAmount,
        viaRequest: request.id,
      },
    });
  }

  // PARTIE K — le demandeur apprend la décision, quelle qu'elle soit.
  await notifyRoles(ctx, ["ACCOUNTANT"], {
    kind: "fee.request.decided",
    title: input.accept ? "Demande tarifaire acceptée" : "Demande tarifaire refusée",
    body: input.accept
      ? `« ${request.feeItem.label} » : ${describeAmountChange(amountBefore, request.proposedAmount)}. Le forecast est recalculé.`
      : `« ${request.feeItem.label} » reste à ${Math.round(amountBefore).toLocaleString("fr-FR")} FCFA. Motif : ${input.comment}`,
    link: "/dashboard/reports",
  });

  revalidateAll();
  return { success: true };
}

/* ═════════════════════ notifications ═════════════════════ */

/** Marque une notification comme lue. Le destinataire est celui de la session. */
export async function markNotificationRead(id: string) {
  const auth = await requireActionContext();
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { count } = await prisma.staffNotification.updateMany({
    // `userId` ET `schoolId` : on ne marque jamais lu le message d'un collègue.
    where: { id, userId: ctx.userId, schoolId: ctx.schoolId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) return { error: "Notification introuvable." };
  revalidatePath("/dashboard/reports");
  return { success: true };
}
