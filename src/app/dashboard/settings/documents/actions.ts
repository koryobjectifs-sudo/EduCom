"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { OFFICIAL_REQUIREMENTS } from "@/lib/officialRequirements";
import type { DocCategory, StudentKind, EducationalCycle } from "../../../../generated/prisma/client";

/**
 * Checklist documentaire — actions serveur. Lot 13.
 *
 * ⚠️ Exigent `/dashboard/settings`, qu'**aucun rôle ne liste** : seuls OWNER et
 * ADMIN l'atteignent via `"*"`. La direction définit ce que l'établissement
 * exige, exactement comme elle définit les tarifs (lot 12.1). Aucune matrice
 * parallèle, aucun rôle cité ici.
 *
 * ⚠️ **Aucune liste n'est IMPOSÉE.** Ce fichier enregistre ce que l'école
 * déclare. `applyOfficialRequirements()`, en bas, propose le référentiel
 * sénégalais par cycle (`src/lib/officialRequirements.ts`) — mais seulement
 * quand la direction le demande, et chaque ligne créée reste modifiable comme
 * les autres. La note précédente interdisait toute liste pré-remplie ; elle
 * laissait surtout chaque école ouvrir son premier dossier sur zéro exigence,
 * donc sur un taux de complétude incalculable.
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

/**
 * Applique le référentiel officiel sénégalais aux cycles choisis.
 *
 * ⚠️ **Idempotent, et jamais destructif.** Une exigence dont le libellé existe
 * déjà pour ce cycle est IGNORÉE, pas réécrite : la direction a pu en modifier
 * la catégorie, la validité ou le ciblage, et repasser dessus effacerait son
 * arbitrage. Rien n'est supprimé, rien n'est désactivé — seules les lignes
 * absentes sont créées.
 *
 * ⚠️ **Écriture en lot.** Vingt exigences en vingt requêtes séquentielles, c'est
 * vingt allers-retours ; `createMany` n'en fait qu'un (règle 10 du projet).
 */
export async function applyOfficialRequirements(cycles: EducationalCycle[]) {
  const auth = await requireActionContext(SETTINGS_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const vises = cycles.filter((c) => OFFICIAL_REQUIREMENTS[c]);
  if (vises.length === 0) return { error: "Aucun cycle sélectionné." };

  // Ce qui existe déjà, pour ne rien écraser. La comparaison porte sur le
  // couple (cycle, libellé normalisé) : « Photos d'identité » et « photos
  // d'identité  » sont la même exigence, et en créer deux serait un doublon
  // que personne ne remarquerait avant de voir le dossier réclamer deux fois
  // la même pièce.
  const existantes = await prisma.documentRequirement.findMany({
    where: { schoolId: ctx.schoolId, cycle: { in: vises } },
    select: { cycle: true, label: true },
  });
  const cle = (cycle: string | null, label: string) =>
    `${cycle ?? ""}|${label.trim().toLowerCase().replace(/\s+/g, " ")}`;
  const deja = new Set(existantes.map((r) => cle(r.cycle, r.label)));

  const aCreer = vises.flatMap((cycle) =>
    (OFFICIAL_REQUIREMENTS[cycle] ?? [])
      .filter((r) => !deja.has(cle(cycle, r.label)))
      .map((r, i) => ({
        label: r.label,
        category: r.category,
        cycle,
        studentKind: r.studentKind ?? null,
        validityMonths: null,
        position: i,
        schoolId: ctx.schoolId,
      })),
  );

  if (aCreer.length === 0) {
    return { data: { created: 0, skipped: vises.reduce((n, c) => n + (OFFICIAL_REQUIREMENTS[c]?.length ?? 0), 0) } };
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
      skipped: vises.reduce((n, c) => n + (OFFICIAL_REQUIREMENTS[c]?.length ?? 0), 0) - aCreer.length,
    },
  };
}
