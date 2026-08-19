"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { runTransition } from "@/lib/workflowHistory";
import { expenseWorkflow, type FinanceState } from "@/lib/workflow";
import { findExpense, lockingStatement, EXPENSE_CATEGORIES } from "@/lib/finance";
import type { ExpenseCategory } from "@/generated/prisma/enums";

/**
 * Actions sur les dépenses.
 *
 * ═══ LA CHAÎNE D'AUTORITÉ, DANS CET ORDRE, SANS RACCOURCI ═══
 *
 *   session → requireActionContext(chemin) → ctx.schoolId
 *          → lecture Prisma `where: { id, schoolId: ctx.schoolId }`
 *          → état réel `from` tiré de cette lecture
 *          → runTransition() → écriture métier + historique + audit
 *
 * Le lot 10 a signalé le point faible de la mécanique : `WorkflowTransition` est
 * générique, donc **elle ne peut pas vérifier l'appartenance de l'objet à
 * l'école**. C'est ce fichier qui en répond, via `findExpense()` — le seul
 * chargeur, et il exige un `ActorContext`. Aucune action ci-dessous n'accède à
 * `prisma.expense` autrement que par ce helper ou avec `schoolId` explicite.
 *
 * ⚠️ Aucune signature n'accepte de `schoolId`. Une server action est un point
 * d'entrée HTTP appelable directement : tout argument vient du client.
 *
 * ⚠️ L'état `from` n'est JAMAIS reçu en argument. Le recevoir permettrait de
 * rejouer une transition depuis un état périmé — approuver une dépense déjà
 * annulée, par exemple.
 */

const PREPARE_PATH = "/dashboard/payments/expenses";
const REVIEW_PATH = "/dashboard/payments/review";

/** Statuts dans lesquels une dépense reste modifiable par son préparateur. */
const EDITABLE: FinanceState[] = ["DRAFT", "RETURNED"];

type Result = { error: string } | { success: true };

/* ──────────────────────────── validation de saisie ──────────────────────── */

type Parsed =
  | { ok: true; data: { label: string; amount: number; spentAt: Date; category: ExpenseCategory; payee: string | null; receiptRef: string | null; note: string | null } }
  | { ok: false; error: string };

/**
 * Contrôles de saisie — tous portent sur une donnée réellement exigée.
 *
 * Rien d'artificiel : un libellé, un montant strictement positif et une date qui
 * existe. Le bénéficiaire et le justificatif restent facultatifs parce qu'une
 * dépense de caisse légitime peut n'en avoir aucun, et bloquer la saisie
 * pousserait à inventer des références.
 */
function parseForm(form: FormData): Parsed {
  const label = String(form.get("label") ?? "").trim();
  if (!label) return { ok: false, error: "Le libellé est obligatoire." };
  if (label.length > 200) return { ok: false, error: "Le libellé ne peut pas dépasser 200 caractères." };

  const rawAmount = String(form.get("amount") ?? "").replace(",", ".").trim();
  const amount = Number(rawAmount);
  if (!rawAmount || Number.isNaN(amount)) return { ok: false, error: "Le montant doit être un nombre." };
  if (amount <= 0) return { ok: false, error: "Le montant doit être supérieur à zéro." };
  if (!Number.isFinite(amount)) return { ok: false, error: "Montant invalide." };

  const rawDate = String(form.get("spentAt") ?? "").trim();
  if (!rawDate) return { ok: false, error: "La date de la dépense est obligatoire." };
  // `T12:00` et non minuit : une date saisie est un jour calendaire, et midi
  // local évite qu'un décalage de fuseau la fasse basculer la veille.
  const spentAt = new Date(`${rawDate}T12:00:00`);
  if (Number.isNaN(spentAt.getTime())) return { ok: false, error: "Date invalide." };

  const category = String(form.get("category") ?? "OTHER");
  if (!(category in EXPENSE_CATEGORIES)) return { ok: false, error: "Poste de dépense inconnu." };

  const opt = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : v.slice(0, 300);
  };

  return {
    ok: true,
    data: {
      label: label.slice(0, 200),
      amount,
      spentAt,
      category: category as ExpenseCategory,
      payee: opt("payee"),
      receiptRef: opt("receiptRef"),
      note: opt("note"),
    },
  };
}

/* ──────────────────────────────── création ──────────────────────────────── */

export async function createExpense(form: FormData): Promise<Result> {
  const auth = await requireActionContext(PREPARE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const parsed = parseForm(form);
  if (!parsed.ok) return { error: parsed.error };

  // Verrou de période : on n'antidate pas une dépense dans une période déjà
  // arrêtée, sinon l'état soumis à la direction cesserait de correspondre.
  const locked = await lockingStatement(ctx, parsed.data.spentAt);
  if (locked) {
    return { error: `La période « ${locked.periodLabel} » a déjà été transmise à la direction. Impossible d'y ajouter une dépense.` };
  }

  try {
    const created = await prisma.expense.create({
      data: { ...parsed.data, schoolId: ctx.schoolId, createdById: ctx.userId, status: "DRAFT" },
      select: { id: true, label: true, amount: true },
    });
    await recordAudit(ctx, {
      action: "expense.create",
      entity: "expense",
      entityId: created.id,
      details: { label: created.label, amount: created.amount, category: parsed.data.category },
    });
  } catch (error) {
    console.error("[expense] création impossible :", error);
    return { error: "Erreur lors de l'enregistrement de la dépense." };
  }

  revalidatePath(PREPARE_PATH);
  revalidatePath("/dashboard/payments/statement");
  return { success: true };
}

/* ─────────────────────────────── modification ─────────────────────────────── */

export async function updateExpense(expenseId: string, form: FormData): Promise<Result> {
  const auth = await requireActionContext(PREPARE_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const existing = await findExpense(ctx, expenseId);
  if (!existing) return { error: "Dépense introuvable." };

  // L'état réel décide, pas ce que l'écran croyait afficher.
  if (!EDITABLE.includes(existing.status as FinanceState)) {
    return { error: "Cette dépense est verrouillée : elle a été transmise ou clôturée." };
  }

  const parsed = parseForm(form);
  if (!parsed.ok) return { error: parsed.error };

  // Deux verrous : la période d'origine et la nouvelle date.
  for (const at of [existing.spentAt, parsed.data.spentAt]) {
    const locked = await lockingStatement(ctx, at);
    if (locked) return { error: `La période « ${locked.periodLabel} » a déjà été transmise à la direction.` };
  }

  try {
    await prisma.expense.update({
      // `schoolId` dans le `where` de l'écriture aussi : `existing` le prouve
      // déjà, mais une écriture d'argent ne se contente pas d'une preuve
      // antérieure. Deux verrous plutôt qu'un.
      where: { id: expenseId, schoolId: ctx.schoolId },
      data: parsed.data,
    });
    await recordAudit(ctx, {
      action: "expense.update",
      entity: "expense",
      entityId: expenseId,
      details: { avant: { label: existing.label, amount: existing.amount }, apres: { label: parsed.data.label, amount: parsed.data.amount } },
    });
  } catch (error) {
    console.error("[expense] modification impossible :", error);
    return { error: "Erreur lors de la modification." };
  }

  revalidatePath(PREPARE_PATH);
  revalidatePath("/dashboard/payments/statement");
  return { success: true };
}

/* ──────────────────────────────── transitions ──────────────────────────────── */

/**
 * Fait passer une dépense d'un état à l'autre.
 *
 * Une seule fonction pour les cinq transitions : la machine décide de ce qui est
 * permis, pas une cascade de `if`. Le chemin de permission exigé dépend de la
 * transition demandée — `runTransition()` le résout via `canTransition()`, donc
 * l'appelant ne peut pas choisir un chemin plus permissif.
 */
async function transitionExpense(expenseId: string, to: FinanceState, comment?: string | null): Promise<Result> {
  // Le garde d'entrée est l'authentification seule : le droit précis vient de la
  // transition. Exiger PREPARE_PATH ici bloquerait la direction, qui ne l'a pas ;
  // exiger REVIEW_PATH bloquerait le comptable. `canTransition()` tranche.
  const auth = await requireActionContext();
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const expense = await findExpense(ctx, expenseId);
  if (!expense) return { error: "Dépense introuvable." };

  const from = expense.status as FinanceState;
  const now = new Date();

  // Colonnes de trace propres à chaque issue, en plus de l'historique générique.
  const extra =
    to === "SUBMITTED" ? { submittedAt: now, submittedById: ctx.userId, returnedReason: null } :
    to === "APPROVED"  ? { approvedAt: now, approvedById: ctx.userId } :
    to === "RETURNED"  ? { returnedReason: comment?.trim() ?? null } :
    {};

  const res = await runTransition(
    ctx,
    expenseWorkflow,
    { entityId: expenseId, from, to, comment },
    () =>
      prisma.expense.update({
        where: { id: expenseId, schoolId: ctx.schoolId },
        data: { status: to, ...extra },
      }),
  );

  if (!res.ok) return { error: res.error };

  revalidatePath(PREPARE_PATH);
  revalidatePath(REVIEW_PATH);
  revalidatePath("/dashboard/payments/statement");
  return { success: true };
}

export async function submitExpense(expenseId: string): Promise<Result> {
  return transitionExpense(expenseId, "SUBMITTED");
}

export async function cancelExpense(expenseId: string): Promise<Result> {
  return transitionExpense(expenseId, "CANCELLED");
}

export async function approveExpense(expenseId: string): Promise<Result> {
  return transitionExpense(expenseId, "APPROVED");
}

/** Le motif est obligatoire : un refus doit s'expliquer. `runTransition` le vérifie. */
export async function returnExpense(expenseId: string, reason: string): Promise<Result> {
  return transitionExpense(expenseId, "RETURNED", reason);
}
