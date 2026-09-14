/**
 * Seed de la grille officielle de coefficients du secondaire (Seconde/Terminale,
 * séries L/S), lot 18 — socle de notes Sénégal.
 *
 * ⚠️ `SubjectCoefficient` est le RÉFÉRENTIEL par (niveau, série, matière) — pas
 * `ClassSubject.coefficient`, qui reste le poids appliqué dans UNE classe
 * précise. Voir `prisma/schema.prisma`.
 *
 * Ce script ne CRÉE aucune matière : il apparie par nom exact à un `Subject`
 * déjà existant dans l'école ciblée, et signale (sans écrire) toute matière du
 * barème officiel introuvable — créer une matière au nom potentiellement
 * divergent de l'existant (« Maths » vs « Mathématiques ») serait une décision
 * de contenu, pas de modèle.
 *
 * Idempotent : une ligne (niveau, série, matière) déjà présente est réutilisée
 * (mise à jour de son coefficient si différent), jamais dupliquée.
 *
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-subject-coefficients.ts          -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-subject-coefficients.ts  -> écrit
 */
import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";

const GRILLE: { niveau: string; serie: string; matieres: Record<string, number> }[] = [
  { niveau: "Seconde", serie: "L", matieres: { "Maths": 3, "PC": 2, "SVT": 2, "Français": 5, "Hist-Géo": 4, "Anglais": 3, "LV2": 2 } },
  { niveau: "Seconde", serie: "S", matieres: { "Maths": 5, "PC": 5, "SVT": 4, "Français": 3, "Hist-Géo": 2, "Anglais": 2, "LV2": 2 } },
  { niveau: "Terminale", serie: "L1", matieres: { "Maths": 2, "Français": 6, "Hist-Géo": 2, "Anglais": 3, "Philo": 6 } },
  { niveau: "Terminale", serie: "L2", matieres: { "Maths": 2, "PC": 2, "Français": 5, "Hist-Géo": 6, "Anglais": 4, "Philo": 6 } },
  { niveau: "Terminale", serie: "S1", matieres: { "Maths": 8, "PC": 8, "Français": 2, "Hist-Géo": 2, "Anglais": 2, "Philo": 2 } },
  { niveau: "Terminale", serie: "S2", matieres: { "Maths": 5, "PC": 6, "SVT": 6, "Français": 2, "Hist-Géo": 2, "Anglais": 2, "Philo": 2 } },
];

/** Garde-fou du cahier des charges : Terminale S2 doit totaliser 25. */
function verifierTotaux() {
  for (const bloc of GRILLE) {
    const total = Object.values(bloc.matieres).reduce((a, b) => a + b, 0);
    console.log(`  ${bloc.niveau} ${bloc.serie.padEnd(3)} → total coefficients : ${total}`);
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
    for (const [nomMatiere, coefficient] of Object.entries(bloc.matieres)) {
      const subject = await prisma.subject.findFirst({
        where: { schoolId, name: nomMatiere },
        select: { id: true },
      });

      if (!subject) {
        matieresIntrouvables.add(nomMatiere);
        console.log(`  ${bloc.niveau} ${bloc.serie.padEnd(3)} ${nomMatiere.padEnd(12)} coef ${coefficient}   ⚠ matière introuvable, ignorée`);
        continue;
      }

      const existante = await prisma.subjectCoefficient.findFirst({
        where: { schoolId, niveau: bloc.niveau, serie: bloc.serie, subjectId: subject.id },
        select: { id: true, coefficient: true },
      });

      if (existante) {
        if (existante.coefficient === coefficient) {
          console.log(`  ${bloc.niveau} ${bloc.serie.padEnd(3)} ${nomMatiere.padEnd(12)} coef ${coefficient}   existe déjà`);
        } else {
          lignesMajees++;
          console.log(`  ${bloc.niveau} ${bloc.serie.padEnd(3)} ${nomMatiere.padEnd(12)} coef ${existante.coefficient} → ${coefficient}   à mettre à jour`);
          if (APPLY) {
            await prisma.subjectCoefficient.update({ where: { id: existante.id }, data: { coefficient } });
          }
        }
        continue;
      }

      lignesCreees++;
      console.log(`  ${bloc.niveau} ${bloc.serie.padEnd(3)} ${nomMatiere.padEnd(12)} coef ${coefficient}   + à créer`);
      if (APPLY) {
        await prisma.subjectCoefficient.create({
          data: { niveau: bloc.niveau, serie: bloc.serie, subjectId: subject.id, coefficient, schoolId },
        });
      }
    }
  }

  console.log(`\n  ${lignesCreees} ligne(s) créée(s), ${lignesMajees} mise(s) à jour ${APPLY ? "" : "(à confirmer)"}.`);
  if (matieresIntrouvables.size > 0) {
    console.log(`  Matières du barème officiel absentes de l'école : ${[...matieresIntrouvables].join(", ")}`);
    console.log("  → à créer côté Matières avant de relancer, si elles doivent exister sous ce nom exact.");
  }
  if (!APPLY) console.log("\nEssai à blanc : rien écrit. Relance avec APPLY=1.");
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
