import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { aCapacite, estCapacite, type Capacite } from "@/lib/capacites";

/**
 * Accès en plus d'un membre dans une école — lu une fois par requête (26 sept. 2026).
 * Pour les règles métier qui ne reçoivent qu'un acteur `{ userId, schoolId, role }`
 * (Communauté, formulaires, portée des élèves…). Échec fermé : table absente = aucun.
 */
export const grantsDe = cache(async function grantsDe(userId: string, schoolId: string): Promise<string[]> {
  try {
    return (await prisma.staffGrant.findMany({ where: { userId, schoolId }, select: { capability: true } }))
      .map((g) => g.capability)
      .filter(estCapacite);
  } catch {
    return [];
  }
});

/** L'acteur a-t-il cette capacité (métier ou accès en plus) ? */
export async function acteurPeut(actor: { userId: string; schoolId: string; role: string; grants?: string[] }, cap: Capacite): Promise<boolean> {
  if (actor.role === "PARENT") return false;
  return aCapacite(actor.role, actor.grants ?? (await grantsDe(actor.userId, actor.schoolId)), cap);
}
