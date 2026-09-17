/**
 * Seed de la grille officielle de coefficients du secondaire (Seconde/Terminale,
 * séries L/S), lot 18 — socle de notes Sénégal.
 *
 * ⚠️ `SubjectCoefficient` est le RÉFÉRENTIEL par (niveau, série, matière) — pas
 * `ClassSubject.coefficient`, qui reste le poids appliqué dans UNE classe
 * précise. Voir `prisma/schema.prisma`.
 *
 * ⚠️ Correctif B (14 sept.) : l'appariement se fait par CODE stable
 * (`Subject.code` — MATH, PC, SVT, FR, PHIL, HG, ANG, LV2), plus par libellé.
 * Un libellé change ("PC" → "Physique-Chimie"), un code non — lancer d'abord
 * `scripts/seed-secondary-subjects.ts` pour que ces codes existent dans
 * l'école ciblée. Ce script ne crée toujours aucune matière lui-même : une
 * matière sans ce code est signalée puis ignorée.
 *
 * Idempotent : une ligne (niveau, série, matière) déjà présente est réutilisée
 * (mise à jour de son coefficient si différent), jamais dupliquée.
 *
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-subject-coefficients.ts          -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-subject-coefficients.ts  -> écrit
 */
import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";

const GRILLE: { niveau: string; serie: string | null; matieres: Record<string, number> }[] = [
  // Collège (Moyen) : 6e et 5e (ni PC, ni LV2)
  { niveau: "6e", serie: null, matieres: { FR: 4, MATH: 3, HG: 2, ANG: 2, SVT: 2, EPS: 1 } },
  { niveau: "5e", serie: null, matieres: { FR: 4, MATH: 3, HG: 2, ANG: 2, SVT: 2, EPS: 1 } },
  // Collège (Moyen) : 4e et 3e (+ PC et LV2)
  { niveau: "4e", serie: null, matieres: { FR: 4, MATH: 3, HG: 2, ANG: 2, SVT: 2, PC: 2, LV2: 2, EPS: 1 } },
  { niveau: "3e", serie: null, matieres: { FR: 4, MATH: 3, HG: 2, ANG: 2, SVT: 2, PC: 2, LV2: 2, EPS: 1 } },

  // Lycée : Seconde
  { niveau: "Seconde", serie: "L", matieres: { FR: 5, HG: 4, ANG: 3, LV2: 2, MATH: 3, SVT: 2, PC: 2, EPS: 1 } },
  { niveau: "Seconde", serie: "S", matieres: { MATH: 5, PC: 5, SVT: 4, FR: 3, HG: 2, ANG: 2, LV2: 2, EPS: 1 } },

  // Lycée : Première
  { niveau: "Première", serie: "L1", matieres: { FR: 6, PHIL: 6, HG: 2, ANG: 3, MATH: 2, LV2: 2, EPS: 1 } },
  { niveau: "Première", serie: "L2", matieres: { FR: 5, PHIL: 6, HG: 6, ANG: 4, MATH: 2, PC: 2, EPS: 1 } },
  { niveau: "Première", serie: "S1", matieres: { MATH: 8, PC: 8, SVT: 2, FR: 2, HG: 2, ANG: 2, PHIL: 2, EPS: 1 } },
  { niveau: "Première", serie: "S2", matieres: { MATH: 5, PC: 6, SVT: 6, FR: 2, HG: 2, ANG: 2, PHIL: 2, EPS: 1 } },

  // Lycée : Terminale
  { niveau: "Terminale", serie: "L1", matieres: { MATH: 2, FR: 6, HG: 2, ANG: 3, PHIL: 6 } },
  { niveau: "Terminale", serie: "L2", matieres: { MATH: 2, PC: 2, FR: 5, HG: 6, ANG: 4, PHIL: 6 } },
  { niveau: "Terminale", serie: "S1", matieres: { MATH: 8, PC: 8, SVT: 2, FR: 2, HG: 2, ANG: 2, PHIL: 2 } },
  { niveau: "Terminale", serie: "S2", matieres: { MATH: 5, PC: 6, SVT: 6, FR: 2, HG: 2, ANG: 2, PHIL: 2 } },
];

/** Garde-fous officiels : Terminale S1 à 26 (avec SVT coef 2), Terminale S2 à 25. */
function verifierTotaux() {
  for (const bloc of GRILLE) {
    const total = Object.values(bloc.matieres).reduce((a, b) => a + b, 0);
    const serieStr = (bloc.serie || "-").padEnd(3);
    console.log(`  ${bloc.niveau.padEnd(9)} ${serieStr} → total coefficients : ${total}`);
    if (bloc.niveau === "Terminale" && bloc.serie === "S1" && total !== 26) {
      throw new Error(`Terminale S1 doit totaliser 26 coefficients, trouvé ${total}`);
    }
    if (bloc.niveau === "Terminale" && bloc.serie === "S2" && total !== 25) {
      throw new Error(`Terminale S2 doit totaliser 25 coefficients, trouvé ${total}`);
    }
  }
}

async function main() {
  verifierTotaux();

  const cible = await resoudreCible("les COEFFICIENTS officiels du secondaire (Seconde/Terminale, L/S)", prisma as never);
  if (!cible) return;
  const schoolId = cible.id;

  const matieresIntrouvables = new Set<string>();
  let lignesCreees = 0;
  let lignesMajees = 0;

  for (const bloc of GRILLE) {
    for (const [code, coefficient] of Object.entries(bloc.matieres)) {
      const subject = await prisma.subject.findFirst({
        where: { schoolId, code },
        select: { id: true, name: true },
      });

      if (!subject) {
        matieresIntrouvables.add(code);
        console.log(`  ${bloc.niveau} ${(bloc.serie || "-").padEnd(3)} ${code.padEnd(5)} coef ${coefficient}   ⚠ code introuvable, ignoré`);
        continue;
      }

      const existante = await prisma.subjectCoefficient.findFirst({
        where: { schoolId, niveau: bloc.niveau, serie: bloc.serie, subjectId: subject.id },
        select: { id: true, coefficient: true },
      });

      if (existante) {
        if (existante.coefficient === coefficient) {
          console.log(`  ${bloc.niveau} ${(bloc.serie || "-").padEnd(3)} ${code.padEnd(5)} (${subject.name}) coef ${coefficient}   existe déjà`);
        } else {
          lignesMajees++;
          console.log(`  ${bloc.niveau} ${(bloc.serie || "-").padEnd(3)} ${code.padEnd(5)} (${subject.name}) coef ${existante.coefficient} → ${coefficient}   à mettre à jour`);
          if (APPLY) {
            await prisma.subjectCoefficient.update({ where: { id: existante.id }, data: { coefficient } });
          }
        }
        continue;
      }

      lignesCreees++;
      console.log(`  ${bloc.niveau} ${(bloc.serie || "-").padEnd(3)} ${code.padEnd(5)} (${subject.name}) coef ${coefficient}   + à créer`);
      if (APPLY) {
        await prisma.subjectCoefficient.create({
          data: { niveau: bloc.niveau, serie: bloc.serie, subjectId: subject.id, coefficient, schoolId },
        });
      }
    }
  }

  console.log(`\n  ${lignesCreees} ligne(s) créée(s), ${lignesMajees} mise(s) à jour ${APPLY ? "" : "(à confirmer)"}.`);
  if (matieresIntrouvables.size > 0) {
    console.log(`  Codes du barème officiel absents de l'école : ${[...matieresIntrouvables].join(", ")}`);
    console.log("  → lancer scripts/seed-secondary-subjects.ts d'abord pour les poser.");
  }
  if (!APPLY) console.log("\nEssai à blanc : rien écrit. Relance avec APPLY=1.");
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
