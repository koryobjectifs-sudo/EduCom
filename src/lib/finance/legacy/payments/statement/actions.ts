"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { runTransition } from "@/lib/workflowHistory";
import { financialStatementWorkflow, type FinanceState } from "@/lib/workflow";
import {
  findStatement, overlappingStatement, financeSnapshot, resolvePeriod, type PeriodParams,
} from "@/lib/finance";

/**
 * Actions sur l'état financier de période.
 *
 * Même chaîne d'autorité que les dépenses : session → `ctx.schoolId` → lecture
 * filtrée → état réel → `runTransition()`. `findStatement()` est le seul
 * chargeur, et il exige un `ActorContext`.
 *
 * ═══ POURQUOI LES TOTAUX SONT FIGÉS ICI, À LA SOUMISSION ═══
 *
 * Tant que l'état est en préparation, ses chiffres sont recalculés à chaque
 * affichage — c'est ce qu'on veut, le gestionnaire voit la réalité vivante. Au
 * moment de la soumission, ils sont **écrits en base**.
 *
 * Sans cela, la direction approuverait des chiffres qui bougeraient ensuite :
 * `Invoice.status` peut changer après coup, ce qui modifierait le « reste à
 * encaisser » d'un état déjà approuvé. Un document approuvé doit porter les
 * chiffres qui ont été approuvés — sinon la signature ne vaut rien.
 *
 * ⚠️ Le figement et le changement d'état partent dans la MÊME transaction Prisma.
 * Un état `SUBMITTED` sans instantané serait un document vide ; un instantané
 * sans changement d'état serait un brouillon aux chiffres morts.
 */

const PREPARE_PATH = "/dashboard/payments/statement";
const REVIEW_PATH = "/dashboard/payments/review";

type Result = { error: string } | { success: true; id?: string };

/* ──────────────────────────────── création ──────────────────────────────── */

/**
 * Ouvre un état pour une période.
 *
 * La période vient des mêmes paramètres que l'écran (`kind`, `from`, `to`,
 * `termId`) et est résolue **côté serveur** par `resolvePeriod()`. Les bornes ne
 * sont donc jamais fournies par le client : seul le *choix* de période l'est, et
 * il est validé.
 */
export async function createStatement(params: PeriodParams): Promise<Result> {
  const auth = await requireActionContext(PREPARE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { period, notice } = await resolvePeriod(ctx, params);
  // Un trimestre sans dates retombe sur le mois courant : ouvrir un état sur une
  // période que l'utilisateur n'a pas choisie serait trompeur.
  if (notice) return { error: notice };

  const clash = await overlappingStatement(ctx, period);
  if (clash) {
    return { error: `Un état existe déjà pour « ${clash.periodLabel} », qui recouvre cette période. Abandonnez-le d'abord ou choisissez une autre période.` };
  }

  try {
    const created = await prisma.financialStatement.create({
      data: {
        periodKind: period.kind,
        periodFrom: period.from,
        periodTo: period.to,
        periodLabel: period.label,
        status: "DRAFT",
        schoolId: ctx.schoolId,
        createdById: ctx.userId,
      },
      select: { id: true },
    });
    await recordAudit(ctx, {
      action: "financialStatement.create",
      entity: "financialStatement",
      entityId: created.id,
      details: { periode: period.label, kind: period.kind },
    });
    revalidatePath(PREPARE_PATH);
    return { success: true, id: created.id };
  } catch (error) {
    console.error("[statement] création impossible :", error);
    return { error: "Erreur lors de l'ouverture de l'état." };
  }
}

/** Mot du gestionnaire à la direction. Modifiable tant que l'état n'est pas transmis. */
export async function saveStatementComment(statementId: string, comment: string): Promise<Result> {
  const auth = await requireActionContext(PREPARE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const st = await findStatement(ctx, statementId);
  if (!st) return { error: "État introuvable." };
  if (st.status !== "DRAFT" && st.status !== "RETURNED") {
    return { error: "Cet état est verrouillé : il a été transmis ou clôturé." };
  }

  const value = comment.trim().slice(0, 2000) || null;
  await prisma.financialStatement.update({
    where: { id: statementId, schoolId: ctx.schoolId },
    data: { comment: value },
  });
  revalidatePath(PREPARE_PATH);
  return { success: true };
}

/* ──────────────────────────────── transitions ──────────────────────────────── */

async function transitionStatement(
  statementId: string,
  to: FinanceState,
  comment?: string | null,
): Promise<Result> {
  // Authentification seule : le droit exact dépend de la transition, et
  // `canTransition()` le résout via le chemin déclaré par la machine.
  const auth = await requireActionContext();
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const st = await findStatement(ctx, statementId);
  if (!st) return { error: "État introuvable." };

  const from = st.status as FinanceState;
  const now = new Date();

  // ═══ Le figement n'a lieu qu'à l'entrée en revue ═══
  let snapshotData: Record<string, number> = {};
  if (to === "SUBMITTED") {
    const period = {
      kind: st.periodKind as "day" | "week" | "month" | "term" | "custom",
      from: st.periodFrom,
      to: st.periodTo,
      label: st.periodLabel,
    };
    const snap = await financeSnapshot(ctx, period);

    // Condition métier réelle, pas artificielle : une dépense encore en
    // brouillon ou renvoyée ne serait comptée dans aucun total, donc l'état
    // transmis serait incomplet à l'insu de tous.
    if (snap.expenseOpenCount > 0) {
      return {
        error: `${snap.expenseOpenCount} dépense${snap.expenseOpenCount > 1 ? "s" : ""} de la période ${snap.expenseOpenCount > 1 ? "sont" : "est"} encore en brouillon ou à corriger. Transmettez-les ou annulez-les avant de soumettre l'état.`,
      };
    }
    if (snap.collectedCount === 0 && snap.expenseApprovedCount === 0) {
      return { error: "Aucun encaissement ni dépense approuvée sur cette période : il n'y a rien à transmettre." };
    }

    snapshotData = {
      collectedTotal: snap.collected,
      expenseTotal: snap.expenseApproved,
      receivableTotal: snap.receivable,
      balance: snap.balance,
    };
  }

  const extra =
    to === "SUBMITTED" ? { submittedAt: now, submittedById: ctx.userId, returnedReason: null, ...snapshotData } :
    to === "APPROVED"  ? { approvedAt: now, approvedById: ctx.userId } :
    to === "RETURNED"  ? { returnedReason: comment?.trim() ?? null } :
    {};

  const res = await runTransition(
    ctx,
    financialStatementWorkflow,
    { entityId: statementId, from, to, comment },
    () =>
      // Instantané et changement d'état dans une seule écriture : voir l'encadré.
      prisma.financialStatement.update({
        where: { id: statementId, schoolId: ctx.schoolId },
        data: { status: to, ...extra },
      }),
  );

  if (!res.ok) return { error: res.error };

  revalidatePath(PREPARE_PATH);
  revalidatePath(REVIEW_PATH);
  return { success: true };
}

export async function submitStatement(statementId: string): Promise<Result> {
  return transitionStatement(statementId, "SUBMITTED");
}

export async function cancelStatement(statementId: string): Promise<Result> {
  return transitionStatement(statementId, "CANCELLED");
}

export async function approveStatement(statementId: string): Promise<Result> {
  return transitionStatement(statementId, "APPROVED");
}

export async function returnStatement(statementId: string, reason: string): Promise<Result> {
  return transitionStatement(statementId, "RETURNED", reason);
}
