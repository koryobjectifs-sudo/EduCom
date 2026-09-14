/**
 * Cas de référence obligatoire du lot 18/2 (cahier des charges Kory) : rejoue
 * le calcul secondaire pur (aucune base de données) et vérifie qu'il tombe
 * exactement sur 321.50 points / 25 coefficients = 12.86.
 *
 * Ne dépend d'aucune donnée en base — se relance sans configuration, en
 * régression, à chaque évolution de `src/lib/notes/secondaire.ts`.
 *
 *   npx tsx scripts/verify-notes-secondaire-reference.ts
 */
import { calculerEleveSecondaire } from "../src/lib/notes/secondaire";

const matieres = [
  { subjectId: "math", name: "Maths", coefficient: 5, devoirs: [13.0], composition: 11.0 },
  { subjectId: "pc", name: "Sciences Phys", coefficient: 6, devoirs: [14.5], composition: 13.0 },
  { subjectId: "svt", name: "SVT", coefficient: 6, devoirs: [12.0], composition: 14.0 },
  { subjectId: "fr", name: "Français", coefficient: 2, devoirs: [11.0], composition: 10.5 },
  { subjectId: "phil", name: "Philosophie", coefficient: 2, devoirs: [10.0], composition: 12.0 },
  { subjectId: "hg", name: "Hist-Géo", coefficient: 2, devoirs: [15.0], composition: 14.0 },
  { subjectId: "ang", name: "Anglais", coefficient: 2, devoirs: [13.5], composition: 15.0 },
];

const resultat = calculerEleveSecondaire("eleve-test", matieres);

for (const m of resultat.matieres) {
  console.log(`  ${m.name.padEnd(15)} coef ${m.coefficient}  MD ${m.md}  MM ${m.mm}  P ${m.points}`);
}
console.log(`\n  Total points        : ${resultat.totalPoints}`);
console.log(`  Total coefficients  : ${resultat.totalCoefficients}`);
console.log(`  Moyenne générale    : ${resultat.moyenneGenerale}`);

const attendu = { totalPoints: 321.5, totalCoefficients: 25, moyenneGenerale: 12.86 };
const ok =
  resultat.totalPoints === attendu.totalPoints &&
  resultat.totalCoefficients === attendu.totalCoefficients &&
  resultat.moyenneGenerale === attendu.moyenneGenerale;

console.log(`\n  ${ok ? "✅ CONFORME au cas de référence (321.50 / 25 = 12.86)" : "❌ DIVERGENCE du cas de référence"}`);
if (!ok) process.exit(1);
