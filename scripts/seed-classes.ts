/**
 * Crée un jeu de classes standard dans un établissement.
 *
 * ⚠️ GARDE-FOU AJOUTÉ LE 19 AOÛT 2026. Ce script était le plus dangereux du
 * dépôt : `prisma.school.findFirst()` **sans `orderBy`**, aucun essai à blanc,
 * aucune confirmation, et `prisma.class.create()` en boucle — donc `npm run
 * script -- scripts/seed-classes.ts` créait douze classes dans un établissement
 * arbitraire, et les recréait en double à chaque exécution.
 *
 * Il exige désormais l'établissement ET une confirmation, et il est idempotent.
 *
 *   npm run script -- scripts/seed-classes.ts                        → refuse
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-classes.ts        → essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-classes.ts → écrit
 */
import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";

/** Le cycle est renseigné : sans lui, les écrans qui trient par cycle ne voient rien. */
const CLASSES = [
  { name: "Petite Section", cycle: "MATERNELLE" },
  { name: "Moyenne Section", cycle: "MATERNELLE" },
  { name: "Grande Section", cycle: "MATERNELLE" },
  { name: "CP", cycle: "ELEMENTAIRE" },
  { name: "CE1", cycle: "ELEMENTAIRE" },
  { name: "CE2", cycle: "ELEMENTAIRE" },
  { name: "CM1", cycle: "ELEMENTAIRE" },
  { name: "CM2", cycle: "ELEMENTAIRE" },
  { name: "6ème", cycle: "COLLEGE" },
  { name: "5ème", cycle: "COLLEGE" },
  { name: "4ème", cycle: "COLLEGE" },
  { name: "3ème", cycle: "COLLEGE" },
] as const;

async function main() {
  const cible = await resoudreCible("des CLASSES de démonstration");
  if (!cible) return;

  let crees = 0, deja = 0;
  for (const c of CLASSES) {
    // Idempotent : relancer ne duplique plus rien.
    const existe = await prisma.class.findFirst({
      where: { schoolId: cible.id, name: c.name },
      select: { id: true },
    });
    if (existe) { deja++; console.log(`  ${c.name.padEnd(16)} déjà présente`); continue; }
    if (APPLY) {
      await prisma.class.create({
        data: { name: c.name, cycle: c.cycle as never, schoolId: cible.id },
      });
    }
    crees++;
    console.log(`  ${c.name.padEnd(16)} ${APPLY ? "créée" : "serait créée"}`);
  }

  console.log(`\n${deja} déjà présente(s), ${crees} ${APPLY ? "créée(s)" : "à créer"}.`);
  if (!APPLY && crees > 0) console.log("Essai à blanc : rien écrit. Relancer avec APPLY=1.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
