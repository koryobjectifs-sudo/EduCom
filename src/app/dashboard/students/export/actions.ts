"use server";

import { revalidatePath } from "next/cache";
import { requireActionContext } from "@/lib/actionContext";
import { multiExportPlan } from "@/lib/exportDossier";
import { recordTransmission, preparationSummary, transmissionHistory } from "@/lib/transmission";

/**
 * Préparation et transmission des exports — actions serveur. Lot 16.
 *
 * ⚠️ Un seul chemin : `/dashboard/students`, celui du dossier élève. Exporter,
 * c'est lire un dossier — aucun droit nouveau n'est créé, aucune matrice
 * parallèle. `PARENT` et `ACCOUNTANT` ne l'ont pas : ils n'exportent donc rien,
 * sans qu'une seule ligne ne les mentionne.
 */

const READ_PATH = "/dashboard/students";

/** Résumé avant export : ce qui partirait, ce qui manque, ce qui est écarté. */
export async function prepareExport(studentIds: string[]) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { ctx } = auth;

  const { plans, requested, accessible } = await multiExportPlan(ctx, studentIds);
  if (plans.length === 0) return { error: "Aucun dossier exportable parmi la sélection." };

  return {
    data: {
      requested,
      accessible,
      students: plans.map((p) => ({
        studentId: p.studentId,
        name: p.studentName,
        state: p.state,
        documents: p.entries.length,
        missing: p.missing,
        totalBytes: p.totalBytes,
        excludedCategories: p.excludedCategories,
      })),
      documentCount: plans.reduce((n, p) => n + p.entries.length, 0),
      // ⚠️ Somme des tailles RÉELLES enregistrées en base — jamais une estimation.
      totalBytes: plans.reduce((n, p) => n + p.totalBytes, 0),
      missingTotal: plans.reduce((n, p) => n + p.missing.length, 0),
    },
  };
}

/** Tableau de préparation d'un ensemble d'élèves (une classe, en pratique). */
export async function preparationTable(studentIds: string[]) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  return { data: await preparationSummary(auth.ctx, studentIds) };
}

/**
 * Enregistre une transmission **déclarée par un humain**.
 *
 * ⚠️ EduCom n'envoie rien. Cette action consigne qu'une personne a transmis, à
 * la main, tel jour, tels dossiers. La méthode est `TRANSMISSION_MANUELLE`, la
 * seule qui existe — et l'écran l'affiche telle quelle.
 */
export async function markTransmitted(input: { studentIds: string[]; destination?: string; note?: string }) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };

  const r = await recordTransmission(auth.ctx, input);
  if ("error" in r) return { error: r.error };

  revalidatePath("/dashboard/students/export");
  return { data: { transmissionId: r.transmissionId, count: r.students.length } };
}

/** Historique des transmissions de l'établissement. */
export async function listTransmissions() {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const rows = await transmissionHistory(auth.ctx, 30);
  return { data: rows.map((r) => ({ ...r, at: r.at.toISOString() })) };
}
