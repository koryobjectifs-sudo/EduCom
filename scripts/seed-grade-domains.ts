/**
 * Seed des 4 domaines officiels de l'élémentaire et de leurs sous-disciplines
 * (lot 18 — socle de notes Sénégal).
 *
 * ⚠️ L'élémentaire n'a pas de coefficients : le poids d'un domaine vient du
 * nombre de sous-disciplines qu'il contient (`GradeDomain`/`GradeSubDiscipline`,
 * `prisma/schema.prisma`). Ce script pose les 4 domaines officiels et leurs
 * sous-disciplines ; l'école reste libre d'en désactiver ou d'en ajouter
 * ensuite depuis l'écran de configuration (à venir).
 *
 * Idempotent : un domaine ou une sous-discipline portant déjà ce nom est
 * réutilisé, jamais dupliqué. Le script ne supprime rien.
 *
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-grade-domains.ts          -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-grade-domains.ts  -> écrit
 */
import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";

const PLAN: { domaine: string; sousDisciplines: string[] }[] = [
  {
    domaine: "Langue et communication",
    sousDisciplines: [
      "Ressources (grammaire/conjugaison/orthographe/vocabulaire)",
      "Dictée",
      "Lecture",
      "Expression écrite",
      "Communication orale",
    ],
  },
  {
    domaine: "Mathématiques",
    sousDisciplines: [
      "Activités numériques",
      "Activités géométriques",
      "Activités de mesure",
      "Résolution de problèmes",
    ],
  },
  {
    domaine: "ESVS",
    sousDisciplines: ["Découverte du monde", "Initiation scientifique", "Vivre ensemble"],
  },
  {
    domaine: "EPAR",
    sousDisciplines: ["EPS", "Arts plastiques / Musique", "Éducation religieuse (optionnel)"],
  },
];

async function main() {
  const cible = await resoudreCible("les DOMAINES et SOUS-DISCIPLINES de l'élémentaire", prisma as never);
  if (!cible) return;
  const schoolId = cible.id;

  let domainesCrees = 0;
  let sousDisciplinesCreees = 0;

  for (let i = 0; i < PLAN.length; i++) {
    const bloc = PLAN[i];
    let domaine = await prisma.gradeDomain.findFirst({
      where: { schoolId, name: bloc.domaine },
      select: { id: true },
    });

    if (domaine) {
      console.log(`  ${bloc.domaine.padEnd(28)} existe déjà`);
    } else {
      domainesCrees++;
      console.log(`  ${bloc.domaine.padEnd(28)} + à créer`);
      if (APPLY) {
        domaine = await prisma.gradeDomain.create({
          data: { name: bloc.domaine, order: i, schoolId },
          select: { id: true },
        });
      }
    }

    for (let j = 0; j < bloc.sousDisciplines.length; j++) {
      const nom = bloc.sousDisciplines[j];
      const existante = domaine
        ? await prisma.gradeSubDiscipline.findFirst({ where: { domainId: domaine.id, name: nom }, select: { id: true } })
        : null;

      if (existante) {
        console.log(`      ${nom.padEnd(48)} existe déjà`);
        continue;
      }
      sousDisciplinesCreees++;
      console.log(`      ${nom.padEnd(48)} + à créer   (barème /10)`);
      if (APPLY && domaine) {
        await prisma.gradeSubDiscipline.create({
          data: { name: nom, order: j, scale: 10, domainId: domaine.id, schoolId },
        });
      }
    }
  }

  console.log(`\n  ${domainesCrees} domaine(s) et ${sousDisciplinesCreees} sous-discipline(s) ${APPLY ? "créé(s)" : "à créer"}.`);
  if (!APPLY) console.log("\nEssai à blanc : rien écrit. Relance avec APPLY=1.");
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
