/**
 * Résolution de l'établissement cible d'un script d'écriture — 19 août 2026.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * Quatre scripts d'alimentation visaient la PREMIÈRE école de la base
 * (`prisma.school.findFirst()`). C'est un défaut discret : tant qu'une seule
 * école existe, le raccourci est invisible. La base en compte trois, dont une
 * qui porte 133 élèves RÉELS — et `scripts/seed-classes.ts` créait douze
 * classes sans essai à blanc, sans confirmation, sans même dire où.
 *
 * Un script d'alimentation doit donc répondre à deux questions AVANT d'écrire :
 * **dans quel établissement**, et **est-ce voulu**. Ce module impose les deux,
 * en un seul endroit, pour qu'aucun script ne réinvente son propre garde-fou.
 *
 *   npm run script -- scripts/<script>.ts                        → refuse, liste les écoles
 *   SCHOOL_ID=<uuid> npm run script -- scripts/<script>.ts        → essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/<script>.ts → écrit
 */
import { prisma as defaultPrisma } from "../src/lib/prisma";

export const APPLY = process.env.APPLY === "1";

export type Cible = { id: string; name: string; eleves: number };

/**
 * Client minimal attendu. Plusieurs scripts instancient leur propre
 * `PrismaClient` (adaptateur `pg` explicite) : leur imposer celui du module
 * ouvrirait un second pool de connexions pour rien.
 */
type ClientEcoles = {
  school: {
    findMany: (a: unknown) => Promise<{ id: string; name: string; _count: { students: number } }[]>;
    findUnique: (a: unknown) => Promise<{ id: string; name: string; _count: { students: number } } | null>;
  };
};

/**
 * Renvoie l'établissement visé, ou `null` après avoir expliqué le refus.
 *
 * ⚠️ Le décompte d'élèves affiché est le décompte RÉEL, relu à l'instant : c'est
 * lui qui doit faire hésiter avant d'injecter des données de démonstration.
 */
export async function resoudreCible(
  quoi: string,
  client: ClientEcoles = defaultPrisma as unknown as ClientEcoles,
): Promise<Cible | null> {
  const id = process.env.SCHOOL_ID?.trim();

  if (!id) {
    const ecoles = await client.school.findMany({
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { createdAt: "asc" },
    });
    console.log(`\n⚠️ REFUS : ce script écrit ${quoi}.\n`);
    if (ecoles.length === 0) {
      console.log("Aucun établissement en base : rien à viser.\n");
      return null;
    }
    console.log("Indiquez explicitement l'établissement cible :\n");
    for (const e of ecoles) {
      console.log(`  SCHOOL_ID=${e.id}  → ${e.name} (${e._count.students} élève(s) RÉELS)`);
    }
    console.log("\nPuis ajoutez APPLY=1 pour écrire réellement.\n");
    return null;
  }

  const ecole = await client.school.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  if (!ecole) {
    console.log(`\n⚠️ Aucun établissement avec l'identifiant ${id}.\n`);
    return null;
  }

  const cible = { id: ecole.id, name: ecole.name, eleves: ecole._count.students };
  console.log(`\nCible : ${cible.name} (${cible.id}) — ${cible.eleves} élève(s) déjà présent(s).`);
  console.log(APPLY ? "Mode : ÉCRITURE RÉELLE\n" : "Mode : ESSAI À BLANC — APPLY=1 pour écrire\n");
  return cible;
}
