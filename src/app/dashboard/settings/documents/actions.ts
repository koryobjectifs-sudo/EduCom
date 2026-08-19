"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import type { DocCategory, StudentKind, EducationalCycle } from "../../../../generated/prisma/client";

/**
 * Checklist documentaire — actions serveur. Lot 13.
 *
 * ⚠️ Exigent `/dashboard/settings`, qu'**aucun rôle ne liste** : seuls OWNER et
 * ADMIN l'atteignent via `"*"`. La direction définit ce que l'établissement
 * exige, exactement comme elle définit les tarifs (lot 12.1). Aucune matrice
 * parallèle, aucun rôle cité ici.
 *
 * ⚠️ **Aucune liste de pièces n'est codée.** Ce fichier ne connaît aucun nom de
 * document : il enregistre ce que l'école déclare. Pré-remplir une liste
 * « sénégalaise » serait inventer une règle qui varie d'un établissement à
 * l'autre et d'une année à l'autre.
 */

const SETTINGS_PATH = "/dashboard/settings";

function done() {
  revalidatePath("/dashboard/settings/documents");
  revalidatePath("/dashboard/students");
}

export async function upsertRequirement(input: {
  id?: string;
  label: string;
  category: DocCategory;
  cycle?: EducationalCycle | null;
  classId?: string | null;
  academicYear?: string | null;
  studentKind?: StudentKind | null;
  validityMonths?: number | null;
  position?: number;
}) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  if (!input.label.trim()) return { error: "Le libellé de la pièce est obligatoire." };
  // Ciblage exclusif : viser une classe ET un cycle rendrait l'exigence
  // ambiguë — la classe porte déjà son cycle.
  if (input.classId && input.cycle) {
    return { error: "Une exigence vise une classe OU un cycle, pas les deux." };
  }
  if (input.validityMonths != null && (!Number.isInteger(input.validityMonths) || input.validityMonths <= 0)) {
    return { error: "La durée de validité doit être un nombre de mois positif." };
  }

  if (input.classId) {
    const c = await prisma.class.count({ where: { id: input.classId, schoolId: ctx.schoolId } });
    if (c === 0) return { error: "Classe introuvable dans votre établissement." };
  }

  const before = input.id
    ? await prisma.documentRequirement.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
        select: { id: true, label: true },
      })
    : null;
  if (input.id && !before) return { error: "Exigence introuvable." };

  const data = {
    label: input.label.trim(),
    category: input.category,
    cycle: input.cycle ?? null,
    classId: input.classId ?? null,
    academicYear: input.academicYear?.trim() || null,
    studentKind: input.studentKind ?? null,
    validityMonths: input.validityMonths ?? null,
    position: input.position ?? 0,
    schoolId: ctx.schoolId,
  };

  const row = before
    ? await prisma.documentRequirement.update({ where: { id: before.id }, data })
    : await prisma.documentRequirement.create({ data });

  await recordAudit(ctx, {
    action: before ? "documentRequirement.update" : "documentRequirement.create",
    entity: "documentRequirement",
    entityId: row.id,
    outcome: "success",
    details: { label: row.label, category: row.category, ...(before ? { labelBefore: before.label } : {}) },
  });

  done();
  return { data: { id: row.id } };
}

/**
 * Active ou désactive une exigence.
 *
 * ⚠️ Désactiver plutôt que supprimer : une exigence retirée ne doit pas faire
 * disparaître les pièces déjà reçues à ce titre, ni leur historique.
 */
export async function setRequirementActive(id: string, active: boolean) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { count } = await prisma.documentRequirement.updateMany({
    where: { id, schoolId: ctx.schoolId },
    data: { active },
  });
  if (count === 0) return { error: "Exigence introuvable dans votre établissement." };

  await recordAudit(ctx, {
    action: active ? "documentRequirement.activate" : "documentRequirement.deactivate",
    entity: "documentRequirement", entityId: id, outcome: "success", details: { active },
  });
  done();
  return { success: true };
}
