import { prisma } from "@/lib/prisma";

/**
 * Audience d'un canal « à la @ » — 26 sept. 2026 (demande de Kory : inviter
 * « @tous-les-parents, @parents-CM2, @profs-CM2, @telle personne… » plutôt que
 * trois cases fixes).
 *
 * Un canal = une liste de RÈGLES + des personnes nommées (`CommunityChannelMember`).
 * On fait partie du canal si UNE règle nous concerne ou si l'on est nommé.
 * Aucune règle et personne de nommé → canal privé (créateur + direction).
 * C'est le défaut : rien n'est public par erreur.
 *
 * Règles (chaînes stockées en JSON dans `CommunityChannel.audience`) :
 *   "PARENTS"                 tous les parents de l'école
 *   "PERSONNEL"               tout le personnel
 *   "ROLE:TEACHER" …          une fonction (enseignants, secrétariat, comptabilité, direction…)
 *   "PARENTS_CLASSE:<id>"     les parents d'une classe
 *   "PROFS_CLASSE:<id>"       les enseignants d'une classe
 *
 * Anciens canaux (`kind` PARENTS / PERSONNEL / MEMBRES) : traduits en règles
 * par `reglesDuCanal` — même comportement qu'avant.
 */

export const ROLES_PERSONNEL = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "TEACHER"] as const;
const ROLES_REGLE = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN", "OWNER"];

export type Regle = string;

export function regleValide(r: unknown): r is Regle {
  if (typeof r !== "string" || r.length > 120) return false;
  if (r === "PARENTS" || r === "PERSONNEL") return true;
  const [type, valeur] = r.split(":");
  if (!valeur) return false;
  if (type === "ROLE") return ROLES_REGLE.includes(valeur);
  return type === "PARENTS_CLASSE" || type === "PROFS_CLASSE";
}

export function reglesDuCanal(c: { kind: string; audience?: unknown }): Regle[] {
  if (c.kind === "PARENTS") return ["PARENTS", "PERSONNEL"];
  if (c.kind === "PERSONNEL") return ["PERSONNEL"];
  if (c.kind === "MEMBRES") return [];
  return Array.isArray(c.audience) ? c.audience.filter(regleValide) : [];
}

/**
 * La règle concerne-t-elle cette personne ? (pure, testée sans base)
 * `classIds` : classes de SES enfants pour un parent, SES classes pour un enseignant.
 */
export function regleConcerne(regle: Regle, role: string, classIds: string[]): boolean {
  const personnel = (ROLES_PERSONNEL as readonly string[]).includes(role);
  if (regle === "PARENTS") return role === "PARENT";
  if (regle === "PERSONNEL") return personnel;
  const [type, valeur] = regle.split(":");
  if (type === "ROLE") return role === valeur;
  if (type === "PARENTS_CLASSE") return role === "PARENT" && classIds.includes(valeur);
  if (type === "PROFS_CLASSE") return role === "TEACHER" && classIds.includes(valeur);
  return false;
}

/** Toutes les personnes du canal, réparties parents / personnel (notifications, comptes, engagement). */
export async function resoudreAudience(
  schoolId: string,
  regles: Regle[],
  membres: string[],
): Promise<{ parents: string[]; personnel: string[] }> {
  const parents = new Set<string>();
  const personnel = new Set<string>();
  const roles = new Set<string>();
  const classesParents: string[] = [];
  const classesProfs: string[] = [];
  for (const r of regles) {
    if (r === "PARENTS") roles.add("PARENT");
    else if (r === "PERSONNEL") ROLES_PERSONNEL.forEach((x) => roles.add(x));
    else {
      const [type, v] = r.split(":");
      if (type === "ROLE") roles.add(v);
      if (type === "PARENTS_CLASSE") classesParents.push(v);
      if (type === "PROFS_CLASSE") classesProfs.push(v);
    }
  }

  const [parRole, eleves, affectations, titulaires, nommes] = await Promise.all([
    roles.size
      ? prisma.user.findMany({ where: { schoolId, role: { in: [...roles] as never[] } }, select: { id: true, role: true } })
      : Promise.resolve([]),
    // Les parents se rattachent à l'école par leurs enfants (le compte parent peut dépendre d'une autre école).
    roles.has("PARENT") || classesParents.length
      ? prisma.student.findMany({
          where: {
            schoolId,
            parentId: { not: null },
            ...(roles.has("PARENT") ? {} : { enrollments: { some: { classId: { in: classesParents } } } }),
          },
          select: { parentId: true },
        })
      : Promise.resolve([]),
    classesProfs.length
      ? prisma.teachingAssignment.findMany({ where: { schoolId, classId: { in: classesProfs } }, select: { teacherId: true } })
      : Promise.resolve([]),
    classesProfs.length
      ? prisma.class.findMany({ where: { schoolId, id: { in: classesProfs } }, select: { teacherId: true } })
      : Promise.resolve([]),
    membres.length ? prisma.user.findMany({ where: { id: { in: membres } }, select: { id: true, role: true } }) : Promise.resolve([]),
  ]);

  for (const u of parRole) (u.role === "PARENT" ? parents : personnel).add(u.id);
  for (const e of eleves) if (e.parentId) parents.add(e.parentId);
  for (const a of affectations) personnel.add(a.teacherId);
  for (const t of titulaires) if (t.teacherId) personnel.add(t.teacherId);
  for (const u of nommes) (u.role === "PARENT" ? parents : personnel).add(u.id);
  return { parents: [...parents], personnel: [...personnel] };
}

const LIBELLES_ROLE: Record<string, string> = {
  TEACHER: "enseignants",
  SECRETARY: "secrétariat",
  ACCOUNTANT: "comptabilité",
  ASSISTANT: "assistants",
  ADMIN: "direction",
  OWNER: "fondateur",
};

/** Libellé « @… » d'une règle, pour l'affichage. */
export function libelleRegle(regle: Regle, classes: Map<string, string>): string {
  if (regle === "PARENTS") return "@tous-les-parents";
  if (regle === "PERSONNEL") return "@tout-le-personnel";
  const [type, v] = regle.split(":");
  if (type === "ROLE") return `@${LIBELLES_ROLE[v] ?? v.toLowerCase()}`;
  const nom = (classes.get(v) ?? "classe").replace(/\s+/g, "-");
  return type === "PARENTS_CLASSE" ? `@parents-${nom}` : `@profs-${nom}`;
}
