"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";

/**
 * Crée un sondage.
 *
 * ⚠️ L'action n'authentifiait pas l'appelant et écrivait un `schoolId` **codé
 * en dur** (`"school-1"`), identifiant qui ne correspond à aucune école réelle
 * — la création échouait donc sur violation de clé étrangère, ou rattachait le
 * sondage à un établissement fantôme. Le `schoolId` vient de la session.
 *
 * L'action renvoie désormais `{ data }` ou `{ error }` au lieu de laisser
 * remonter l'exception Prisma : l'appelant doit pouvoir distinguer un refus
 * d'autorisation d'un échec technique.
 */
export async function createSurvey(data: {
  title: string;
  description: string;
  questions: any[];
}) {
  const auth = await requireActionContext("/dashboard/communications");
  if (!auth.ok) return { error: auth.error };

  if (auth.ctx.role === "TEACHER" || auth.ctx.role === "ACCOUNTANT") {
    return { error: "Vous n'avez pas les droits pour créer un sondage." };
  }

  try {
    const survey = await prisma.survey.create({
      data: {
        title: data.title,
        description: data.description,
        questions: data.questions,
        schoolId: auth.ctx.schoolId,
      }
    });

    return { data: survey };
  } catch (error: any) {
    console.error("Error creating survey:", error);
    return { error: "Une erreur est survenue lors de la création du sondage." };
  }
}
