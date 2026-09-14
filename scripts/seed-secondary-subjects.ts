/**
 * Seed du référentiel de matières du secondaire sénégalais, avec un CODE
 * stable par matière (lot 18, correctif B).
 *
 * ⚠️ `SubjectCoefficient` s'y rattache par CODE, jamais par libellé : un
 * établissement peut appeler une matière "PC", "Physique-Chimie" ou
 * "Sciences Physiques" — le code ne change pas, lui.
 *
 * Comportement par matière officielle :
 *   1. Un `Subject` porte déjà ce code            → rien à faire.
 *   2. Un `Subject` existe sous un libellé reconnu → on lui POSE le code,
 *      son libellé n'est jamais renommé (c'est le choix de l'école).
 *   3. Aucun des deux                              → on crée la matière avec
 *      son libellé officiel.
 *
 * Idempotent : rejouable sans dupliquer ni écraser un libellé existant.
 *
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-secondary-subjects.ts          -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-secondary-subjects.ts  -> écrit
 */
import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";

const REFERENTIEL: { code: string; nom: string; alias: string[] }[] = [
  { code: "MATH", nom: "Mathématiques", alias: ["Maths", "Mathématiques"] },
  { code: "PC", nom: "Physique-Chimie", alias: ["PC", "Physique-Chimie", "Sciences Physiques", "Physique Chimie"] },
  { code: "SVT", nom: "Sciences de la Vie et de la Terre", alias: ["SVT", "Sciences de la Vie et de la Terre"] },
  { code: "FR", nom: "Français", alias: ["Français", "Francais"] },
  { code: "PHIL", nom: "Philosophie", alias: ["Philo", "Philosophie"] },
  { code: "HG", nom: "Histoire-Géographie", alias: ["Hist-Géo", "Histoire-Géographie", "Histoire-Géo", "Histoire Géographie"] },
  { code: "ANG", nom: "Anglais", alias: ["Anglais"] },
  { code: "LV2", nom: "LV2", alias: ["LV2"] },
];

async function main() {
  const cible = await resoudreCible("le RÉFÉRENTIEL de matières du secondaire (codes stables)", prisma as never);
  if (!cible) return;
  const schoolId = cible.id;

  let creees = 0;
  let codees = 0;

  for (const m of REFERENTIEL) {
    const parCode = await prisma.subject.findFirst({ where: { schoolId, code: m.code }, select: { id: true, name: true } });
    if (parCode) {
      console.log(`  ${m.code.padEnd(5)} → « ${parCode.name} »   déjà codée`);
      continue;
    }

    const parAlias = await prisma.subject.findFirst({
      where: { schoolId, code: null, name: { in: m.alias } },
      select: { id: true, name: true },
    });

    if (parAlias) {
      codees++;
      console.log(`  ${m.code.padEnd(5)} → « ${parAlias.name} »   existe sans code, + à coder`);
      if (APPLY) {
        await prisma.subject.update({ where: { id: parAlias.id }, data: { code: m.code } });
      }
      continue;
    }

    creees++;
    console.log(`  ${m.code.padEnd(5)} → « ${m.nom} »   + à créer`);
    if (APPLY) {
      await prisma.subject.create({ data: { name: m.nom, code: m.code, schoolId } });
    }
  }

  console.log(`\n  ${creees} matière(s) créée(s), ${codees} matière(s) existante(s) codée(s) ${APPLY ? "" : "(à confirmer)"}.`);
  if (!APPLY) console.log("\nEssai à blanc : rien écrit. Relance avec APPLY=1.");
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
