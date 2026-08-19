"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";

/**
 * Enregistre une demande de nouveau type de document.
 *
 * ⚠️ L'action n'authentifiait pas l'appelant et rattachait la demande à
 * `prisma.school.findFirst()` — un commentaire assumait d'ailleurs le
 * raccourci « prototype ». Sans `orderBy`, Postgres ne garantit pas quelle
 * école remonte : la demande partait dans un établissement arbitraire.
 */
export async function submitDocumentRequest(name: string, description: string) {
  const auth = await requireActionContext("/dashboard/documents");
  if (!auth.ok) return { error: auth.error };

  try {
    await prisma.documentRequest.create({
      data: {
        name,
        description,
        schoolId: auth.ctx.schoolId,
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting document request:", error);
    return { error: "Une erreur est survenue lors de l'envoi de la demande." };
  }
}
