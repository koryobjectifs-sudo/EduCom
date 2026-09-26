import { prisma } from "@/lib/prisma";
import { notifier } from "@/lib/notifications";

/**
 * Notifications aux familles, par métier — 26 sept. 2026.
 * Cloche de l'espace famille + notification du téléphone (Web Push).
 * `kind` commence par « famille. » : ces lignes n'apparaissent QUE dans
 * l'espace famille (voir `notif-actions.ts`).
 *
 * Jamais bloquant : un échec de notification n'annule pas l'acte métier.
 */
export const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export async function notifierParentsEleves(
  schoolId: string,
  studentIds: string[],
  contenu: (eleve: { id: string; firstName: string }) => { title: string; body: string; url: string; kind: string; tag?: string },
): Promise<void> {
  try {
    const eleves = await prisma.student.findMany({
      where: { id: { in: [...new Set(studentIds)] }, schoolId, parentId: { not: null } },
      select: { id: true, firstName: true, parentId: true },
    });
    for (const e of eleves) {
      await notifier(schoolId, [e.parentId!], contenu(e));
    }
  } catch (err) {
    console.error("[famille] notification impossible :", (err as Error).message);
  }
}
