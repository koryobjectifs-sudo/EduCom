import { prisma } from "@/lib/prisma";
import { acteurPeut } from "@/lib/grants";
import type { ActorContext } from "@/lib/audit";

/**
 * Mentions de groupe — 26 sept. 2026 (demande de Kory : « @parents de CM2,
 * @profs… »). Un groupe se mentionne comme une personne ; seuls ses membres
 * qui VOIENT le message sont prévenus (intersection avec l'audience, faite
 * dans `lib/mentions.ts`).
 *
 * ═══ RÈGLES (seule autorité) ═══
 * Direction, secrétariat : @parents, @equipe, @profs, @direction, et pour
 *   chaque classe @parents-<classe> et @profs-<classe>.
 * Enseignant : @equipe, @profs, @direction, et @parents-/@profs- de SES classes.
 * Comptable, assistant : @equipe, @profs, @direction.
 * Parent : aucun groupe.
 *
 * Identifiant : `groupe:` suivi des règles d'audience séparées par `|`
 * (mêmes règles que les canaux, `lib/audience.ts`).
 */
export const PREFIXE_GROUPE = "groupe:";
export type GroupeMention = { id: string; nom: string; detail: string; regles: string[] };

const TOUT = ["OWNER", "ADMIN", "SECRETARY"];
const slug = (t: string) => t.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}'-]/gu, "");

export async function groupesMentionnables(actor: ActorContext, classIds: string[], toutesClasses: boolean): Promise<GroupeMention[]> {
  if (actor.role === "PARENT") return [];
  const g = (regles: string[], nom: string, detail: string): GroupeMention => ({ id: `${PREFIXE_GROUPE}${regles.join("|")}`, nom, detail, regles });
  const groupes: GroupeMention[] = [
    g(["PERSONNEL"], "equipe", "Groupe · tout le personnel"),
    g(["ROLE:TEACHER"], "profs", "Groupe · tous les enseignants"),
    g(["ROLE:OWNER", "ROLE:ADMIN"], "direction", "Groupe · la direction"),
  ];
  // Accès en plus « Écrire à toute l'école » : mêmes groupes que le secrétariat.
  const toutes = TOUT.includes(actor.role) || (await acteurPeut(actor, "ECRIRE_ECOLE"));
  if (toutes) groupes.unshift(g(["PARENTS"], "parents", "Groupe · tous les parents de l'école"));
  if (!toutes && actor.role !== "TEACHER") return groupes;
  const classes = await prisma.class.findMany({
    where: { schoolId: actor.schoolId, ...(toutes || toutesClasses ? {} : { id: { in: classIds } }) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  for (const c of classes) {
    groupes.push(g([`PARENTS_CLASSE:${c.id}`], `parents-${slug(c.name)}`, `Groupe · parents de la classe ${c.name}`));
    groupes.push(g([`PROFS_CLASSE:${c.id}`], `profs-${slug(c.name)}`, `Groupe · enseignants de la classe ${c.name}`));
  }
  return groupes;
}
