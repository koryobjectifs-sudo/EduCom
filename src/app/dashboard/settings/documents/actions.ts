"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { OFFICIAL_REQUIREMENTS_BY_CYCLE } from "@/lib/officialRequirements";
import type { DocCategory, StudentKind, EducationalCycle, RequirementSource } from "../../../../generated/prisma/client";

const SETTINGS_PATH = "/dashboard/settings";

function done() {
  revalidatePath("/dashboard/settings/documents");
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/students/dossiers/review");
}

export async function upsertRequirement(input: {
  id?: string;
  label: string;
  category: DocCategory;
  cycle?: EducationalCycle | null;
  classId?: string | null;
  academicYear?: string | null;
  studentKind?: StudentKind | null;
  source?: RequirementSource;
  required?: boolean;
  pinned?: boolean;
  conditional?: string | null;
  validityMonths?: number | null;
  position?: number;
  order?: number;
}) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  if (!input.label.trim()) return { error: "Le libellé de la pièce est obligatoire." };
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
    source: input.source ?? (before?.source ?? "ETABLISSEMENT"),
    required: input.required ?? (before?.required ?? true),
    pinned: input.pinned ?? (before?.pinned ?? true),
    conditional: input.conditional ?? (before?.conditional ?? null),
    validityMonths: input.validityMonths ?? null,
    position: input.position ?? (before?.position ?? 0),
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
    entity: "documentRequirement",
    entityId: id,
    outcome: "success",
    details: { active },
  });
  done();
  return { success: true };
}

export async function toggleRequirementPinned(id: string, pinned: boolean) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { count } = await prisma.documentRequirement.updateMany({
    where: { id, schoolId: ctx.schoolId },
    data: { pinned },
  });
  if (count === 0) return { error: "Exigence introuvable." };

  done();
  return { success: true };
}

export async function toggleRequirementRequired(id: string, required: boolean) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { count } = await prisma.documentRequirement.updateMany({
    where: { id, schoolId: ctx.schoolId },
    data: { required },
  });
  if (count === 0) return { error: "Exigence introuvable." };

  done();
  return { success: true };
}

export async function deleteRequirement(id: string) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const item = await prisma.documentRequirement.findFirst({
    where: { id, schoolId: ctx.schoolId },
  });
  if (!item) return { error: "Exigence introuvable." };

  if (item.source === "OFFICIEL") {
    return {
      error: "Cette pièce est une exigence officielle réglementaire. Elle ne peut pas être supprimée, mais vous pouvez la rendre optionnelle ou la désactiver.",
    };
  }

  await prisma.documentRequirement.delete({
    where: { id },
  });

  await recordAudit(ctx, {
    action: "documentRequirement.delete",
    entity: "documentRequirement",
    entityId: id,
    outcome: "success",
    details: { label: item.label },
  });

  done();
  return { success: true };
}

export async function reorderRequirements(items: { id: string; position: number }[]) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  await prisma.$transaction(
    items.map((item) =>
      prisma.documentRequirement.updateMany({
        where: { id: item.id, schoolId: ctx.schoolId },
        data: { position: item.position },
      })
    )
  );

  done();
  return { success: true };
}

export async function applyOfficialRequirements(cycles: EducationalCycle[]) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const vises = cycles.filter((c) => OFFICIAL_REQUIREMENTS_BY_CYCLE[c]);
  if (vises.length === 0) return { error: "Aucun cycle sélectionné." };

  const existantes = await prisma.documentRequirement.findMany({
    where: { schoolId: ctx.schoolId, cycle: { in: vises } },
    select: { cycle: true, label: true },
  });
  const cle = (cycle: string | null, label: string) =>
    `${cycle ?? ""}|${label.trim().toLowerCase().replace(/\s+/g, " ")}`;
  const deja = new Set(existantes.map((r) => cle(r.cycle, r.label)));

  const aCreer = vises.flatMap((cycle) =>
    (OFFICIAL_REQUIREMENTS_BY_CYCLE[cycle] ?? [])
      .filter((r) => !deja.has(cle(cycle, r.label)))
      .map((r, i) => ({
        label: r.label,
        category: r.category,
        cycle,
        source: r.source,
        required: r.required,
        pinned: r.pinned,
        conditional: r.conditional ?? null,
        studentKind: r.studentKind ?? null,
        validityMonths: null,
        position: r.order || i + 1,
        schoolId: ctx.schoolId,
      })),
  );

  if (aCreer.length === 0) {
    return { data: { created: 0, skipped: vises.reduce((n, c) => n + (OFFICIAL_REQUIREMENTS_BY_CYCLE[c]?.length ?? 0), 0) } };
  }

  await prisma.documentRequirement.createMany({ data: aCreer });

  await recordAudit(ctx, {
    action: "documentRequirement.applyOfficial",
    entity: "documentRequirement",
    entityId: ctx.schoolId,
    details: { cycles: vises, created: aCreer.length },
  });

  done();
  return {
    data: {
      created: aCreer.length,
      skipped: vises.reduce((n, c) => n + (OFFICIAL_REQUIREMENTS_BY_CYCLE[c]?.length ?? 0), 0) - aCreer.length,
    },
  };
}
