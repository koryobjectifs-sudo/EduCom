"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { applyCurriculum } from "@/lib/pedagogy";
import { recordPlanningChange } from "@/lib/planningNotice";

/**
 * Actions de la configuration pédagogique.
 *
 * ⚠️ **Toutes passent par `requireActionContext("/dashboard/settings/pedagogie")`.**
 * Une server action est un point d'entrée HTTP à part entière : elle s'appelle
 * sans passer par l'écran qui l'invoque. Le `schoolId` vient donc de la session,
 * jamais des arguments, et le rôle est vérifié contre la MÊME table que la
 * navigation (`src/lib/permissions.ts`) — direction et secrétariat, pas les
 * enseignants : déplacer une composition ou repondérer une matière change le
 * bulletin de toute une classe.
 *
 * ⚠️ **Rien n'est réécrit ici de ce qui existe ailleurs.** Le rattachement des
 * matières, les dates de trimestre et les affectations vivent déjà dans
 * `src/app/dashboard/grades/actions.ts` ; l'écran de configuration les importe
 * directement. Ce fichier ne contient que ce qui n'existait nulle part.
 */

const CHEMIN = "/dashboard/settings/pedagogie";

/** Les écrans que la configuration pédagogique alimente, tous invalidés ensemble. */
function revalidateAcademique() {
  revalidatePath(CHEMIN);
  revalidatePath("/dashboard/grades");
  revalidatePath("/dashboard/grades/bulletin");
  revalidatePath("/dashboard/grades/saisie");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard");
}

/* ═══════════════════════════ appliquer le programme ═══════════════════════════ */

/**
 * Applique le modèle sénégalais — **sans jamais rien supprimer**.
 *
 * Voir `src/lib/pedagogy.ts` : l'opération est additive et idempotente. La
 * relancer sur une école déjà configurée ne duplique rien et n'efface aucune
 * personnalisation ; elle comble seulement les trous.
 */
export async function applyCurriculumAction(options: { withControls: boolean; classIds?: string[] }) {
  const auth = await requireActionContext(CHEMIN);
  if (!auth.ok) return { error: auth.error };

  try {
    const report = await applyCurriculum(auth.ctx, {
      withControls: options.withControls,
      classIds: options.classIds,
    });
    revalidateAcademique();
    return { data: report };
  } catch (error: any) {
    return { error: error.message ?? "Le programme n'a pas pu être appliqué." };
  }
}

/* ═════════════════════════════ le coefficient ═════════════════════════════ */

/**
 * Le poids d'une matière dans une classe.
 *
 * ⚠️ **Borné à ]0, 20].** Un coefficient nul ferait disparaître la matière de la
 * moyenne sans la retirer du bulletin — l'élève verrait une note qui ne compte
 * pas, sans que rien ne l'explique. Un coefficient négatif retrancherait des
 * points. Aucun des quatre bulletins réels analysés ne dépasse 5 ; la borne
 * haute est large exprès, mais elle existe pour arrêter une faute de frappe
 * (« 20 » saisi dans la colonne coefficient au lieu du barème).
 */
export async function setSubjectCoefficient(classId: string, subjectId: string, coefficient: number) {
  const auth = await requireActionContext(CHEMIN);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  if (!Number.isFinite(coefficient)) return { error: "Coefficient invalide." };
  if (coefficient <= 0) return { error: "Le coefficient doit être supérieur à 0." };
  if (coefficient > 20) return { error: "Le coefficient ne peut pas dépasser 20." };

  // La classe doit appartenir à l'école de la session : sans cette vérification,
  // connaître un identifiant suffirait à repondérer le bulletin d'un autre
  // établissement.
  const klass = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
  if (!klass) return { error: "Classe introuvable dans votre établissement." };

  try {
    const { count } = await prisma.classSubject.updateMany({
      where: { classId, subjectId },
      data: { coefficient },
    });
    if (count === 0) return { error: "Cette matière n'est pas rattachée à cette classe." };

    await recordAudit(auth.ctx, {
      action: "update",
      entity: "class",
      entityId: classId,
      details: { champ: "coefficient", subjectId, coefficient },
    });
    revalidateAcademique();
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/* ═══════════════════════════ la date d'une évaluation ═══════════════════════════ */

/**
 * Fixe ou retire la date d'un contrôle / d'une composition.
 *
 * ═══ POURQUOI CETTE DATE COMPTE PLUS QU'IL N'Y PARAÎT ═══
 *
 * `pickEvaluation()` (dans `src/lib/gradeEntry.ts`) l'utilise pour décider quelle
 * évaluation s'ouvre par défaut devant l'enseignant : une évaluation datée dans
 * le futur n'est **jamais** proposée d'office, parce que saisir des notes pour
 * une composition qui n'a pas eu lieu n'a pas de sens. Dater les évaluations,
 * c'est donc ranger l'année dans le bon ordre pour tout le monde à la fois.
 *
 * ⚠️ Le déplacement est **tracé** (`recordPlanningChange`) avant que la nouvelle
 * date ne remplace l'ancienne — sinon l'ancienne serait perdue et personne ne
 * pourrait être prévenu de quoi que ce soit.
 */
export async function setEvaluationDate(evaluationId: string, date: string | null) {
  const auth = await requireActionContext(CHEMIN);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const next = date ? new Date(date) : null;
  if (next && Number.isNaN(next.getTime())) return { error: "Date invalide." };

  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, schoolId },
    select: {
      id: true, name: true, date: true,
      term: { select: { name: true, startDate: true, endDate: true } },
    },
  });
  if (!evaluation) return { error: "Évaluation introuvable dans votre établissement." };

  /**
   * ⚠️ **Une date hors trimestre est refusée, pas corrigée.** Une composition du
   * 1er trimestre datée en juin ferait remonter l'évaluation dans la mauvaise
   * période sur tous les écrans — et la « corriger » d'office reviendrait à
   * décider à la place de l'école. On dit ce qui ne va pas, elle tranche.
   */
  const { startDate, endDate } = evaluation.term;
  if (next && startDate && endDate && (next < startDate || next > endDate)) {
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return {
      error: `Cette date sort de « ${evaluation.term.name} » (${fmt(startDate)} — ${fmt(endDate)}).`,
    };
  }

  try {
    await recordPlanningChange(auth.ctx, {
      entity: "evaluation",
      entityId: evaluation.id,
      name: evaluation.name,
      termName: evaluation.term.name,
      from: { start: evaluation.date },
      to: { start: next },
    });

    await prisma.evaluation.updateMany({
      where: { id: evaluationId, schoolId },
      data: { date: next },
    });

    revalidateAcademique();
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Crée un contrôle ou une composition, **avec sa date dès la création**.
 *
 * `createEvaluation()` existe déjà dans `grades/actions.ts` mais ne prend pas de
 * date : l'école devait créer puis dater en deux gestes. Celle-ci ne la double
 * pas — elle est appelée depuis l'écran de configuration, où la question « quand
 * a-t-elle lieu ? » se pose au même moment que « comment s'appelle-t-elle ? ».
 */
export async function createDatedEvaluation(input: {
  name: string;
  termId: string;
  type: "EXAM" | "QUIZ";
  date: string | null;
}) {
  const auth = await requireActionContext(CHEMIN);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const name = input.name.trim();
  if (!name) return { error: "Donnez un nom à cette évaluation." };

  const term = await prisma.term.findFirst({
    where: { id: input.termId, schoolId },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!term) return { error: "Trimestre introuvable dans votre établissement." };

  const date = input.date ? new Date(input.date) : null;
  if (date && Number.isNaN(date.getTime())) return { error: "Date invalide." };
  if (date && term.startDate && term.endDate && (date < term.startDate || date > term.endDate)) {
    return { error: `Cette date sort de « ${term.name} ».` };
  }

  // Deux évaluations de même nom dans le même trimestre rendraient les écrans
  // ambigus — « Contrôle 1 » deux fois, sans rien pour les distinguer.
  const clash = await prisma.evaluation.findFirst({
    where: { schoolId, termId: term.id, name },
    select: { id: true },
  });
  if (clash) return { error: `« ${name} » existe déjà sur ${term.name}.` };

  try {
    const created = await prisma.evaluation.create({
      data: { name, type: input.type, termId: term.id, schoolId, date },
      select: { id: true },
    });
    await recordAudit(auth.ctx, {
      action: "create",
      entity: "evaluation",
      entityId: created.id,
      details: { nom: name, type: input.type, trimestre: term.name, date: date?.toISOString() ?? null },
    });
    revalidateAcademique();
    return { data: created };
  } catch (error: any) {
    return { error: error.message };
  }
}
