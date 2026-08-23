/**
 * Crée les trimestres et leurs évaluations pour un établissement.
 *
 * ═══ AUCUNE DATE N'EST ÉCRITE, ET C'EST VOULU ═══
 *
 * Un calendrier scolaire est propre à chaque école : dates de rentrée, de
 * congés, de compositions. Poser des dates « par défaut » ici reviendrait à
 * inventer le calendrier de l'établissement — et ces dates serviraient ensuite
 * à décider quel trimestre est courant, donc à orienter la saisie des notes sur
 * une période fausse. `Term.startDate` et `Term.endDate` restent donc `null`,
 * exactement comme le fait `createTerm()` depuis l'onglet Configuration.
 * L'école les renseigne elle-même, via `setTermDates()`.
 *
 * ⚠️ CONSÉQUENCE À CONNAÎTRE. `pickCurrentTerm()` ne peut désigner comme
 * « courant » qu'un trimestre DÉJÀ COMMENCÉ, ce qui exige une date. Sans
 * aucune date, elle retombe sur le dernier trimestre de la liste. Le produit
 * reste utilisable — les trois trimestres restent sélectionnables et les écrans
 * affichent « · sans dates » — mais le trimestre présélectionné n'est pas
 * celui qu'on attendrait. C'est un signal, pas une panne.
 *
 * ═══ AUCUNE LOGIQUE PARALLÈLE ═══
 *
 * Les écritures reproduisent champ pour champ celles de `createTerm()` et
 * `createEvaluation()` (`src/app/dashboard/grades/actions.ts`). Ce script
 * n'existe que parce que ces actions sont des server actions : elles exigent
 * une session HTTP et ne sont pas appelables hors requête.
 *
 * Idempotent : un trimestre ou une évaluation portant déjà ce nom est réutilisé,
 * jamais dupliqué. Le script ne supprime rien.
 *
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-terms.ts          -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-terms.ts  -> écrit
 */
import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";
import { pickCurrentTerm } from "../src/lib/terms";
import { evaluationKind } from "../src/lib/bulletin";

/** Libellés fournis par l'école. Aucun n'est déduit ni reformulé. */
const PLAN: { trimestre: string; evaluations: { nom: string; type: "QUIZ" | "EXAM" }[] }[] = [
  {
    trimestre: "1er Trimestre",
    evaluations: [
      { nom: "Contrôle du 1er trimestre", type: "QUIZ" },
      { nom: "Composition du 1er trimestre", type: "EXAM" },
    ],
  },
  {
    trimestre: "2ème Trimestre",
    evaluations: [
      { nom: "Contrôle du 2e trimestre", type: "QUIZ" },
      { nom: "Composition du 2e trimestre", type: "EXAM" },
    ],
  },
  {
    trimestre: "3ème Trimestre",
    evaluations: [
      { nom: "Contrôle du 3e trimestre", type: "QUIZ" },
      { nom: "Composition du 3e trimestre", type: "EXAM" },
    ],
  },
];

async function main() {
  const cible = await resoudreCible("les TRIMESTRES et ÉVALUATIONS d'un établissement", prisma as never);
  if (!cible) return;
  const schoolId = cible.id;

  let trimestresCrees = 0;
  let evaluationsCreees = 0;
  const projection: { id: string; name: string; startDate: Date | null; createdAt: Date }[] = [];

  for (const bloc of PLAN) {
    let term = await prisma.term.findFirst({
      where: { schoolId, name: bloc.trimestre },
      select: { id: true, name: true, startDate: true, createdAt: true },
    });

    if (term) {
      console.log(`  ${bloc.trimestre.padEnd(16)} existe déjà${term.startDate ? "" : "  (sans dates)"}`);
    } else {
      trimestresCrees++;
      console.log(`  ${bloc.trimestre.padEnd(16)} + à créer          (startDate = null, endDate = null)`);
      if (APPLY) {
        // Champs identiques à `createTerm()` : nom + école, rien d'autre.
        term = await prisma.term.create({
          data: { name: bloc.trimestre, schoolId },
          select: { id: true, name: true, startDate: true, createdAt: true },
        });
      }
    }

    projection.push(
      term ?? { id: `dry-${bloc.trimestre}`, name: bloc.trimestre, startDate: null, createdAt: new Date(Date.now() + projection.length) },
    );

    for (const ev of bloc.evaluations) {
      const libelle = evaluationKind(ev.type) === "COMPOSITION" ? "composition" : "contrôle";
      const existante = term
        ? await prisma.evaluation.findFirst({ where: { schoolId, termId: term.id, name: ev.nom }, select: { id: true } })
        : null;

      if (existante) {
        console.log(`      ${ev.nom.padEnd(32)} existe déjà`);
        continue;
      }
      evaluationsCreees++;
      console.log(`      ${ev.nom.padEnd(32)} + à créer   type ${ev.type} → ${libelle}   (date = null)`);
      if (APPLY && term) {
        // Champs identiques à `createEvaluation()` : nom + type + trimestre + école.
        await prisma.evaluation.create({
          data: { name: ev.nom, type: ev.type, termId: term.id, schoolId },
        });
      }
    }
  }

  console.log(`\n  ${trimestresCrees} trimestre(s) et ${evaluationsCreees} évaluation(s) ${APPLY ? "créé(s)" : "à créer"}.`);

  /* ── Ce que l'écran fera de trimestres sans dates ── */
  const { current, ordered } = pickCurrentTerm(projection);
  console.log("\n  Conséquence, mesurée sur la projection :");
  console.log(`    ordre d'affichage      : ${ordered.map((t) => t.name).join("  |  ")}`);
  console.log(`    trimestre présélectionné : « ${current?.name ?? "aucun"} »`);
  if (current && current.startDate === null) {
    console.log("    → aucun trimestre n'étant daté, pickCurrentTerm() retombe sur le dernier.");
    console.log("      Les trois restent sélectionnables ; les écrans affichent « · sans dates ».");
    console.log("      Renseigner les dates via setTermDates() replacera la sélection sur la bonne période.");
  }

  if (!APPLY) console.log("\nEssai à blanc : rien écrit. Relance avec APPLY=1.");
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  // ⚠️ Pas de `pool.end()` : voir la note de `seed-subjects.ts`.
  .finally(() => prisma.$disconnect());
