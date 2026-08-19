/**
 * Bascule les factures échues en `OVERDUE`.
 *
 *   npm run script -- scripts/mark-overdue.ts            # essai à blanc
 *   APPLY=1 npm run script -- scripts/mark-overdue.ts    # écrit réellement
 *
 * **Essai à blanc par défaut**, conformément à la règle du projet sur les
 * opérations de masse (voir `scripts/merge-duplicate-classes.ts`).
 *
 * ═══ CE QU'IL FAUT METTRE EN PLACE EN PRODUCTION ═══
 *
 * Le dépôt n'a **aucune infrastructure de tâches planifiées** : ni `vercel.json`,
 * ni cron, ni file d'attente. Ce script est donc le mécanisme vérifiable
 * aujourd'hui, et `src/app/api/cron/overdue/route.ts` expose la même logique
 * pour un ordonnanceur externe.
 *
 * Une exécution **quotidienne** suffit : une facture ne bascule qu'au passage de
 * son échéance, et les écrans dérivent le retard de `dueDate` entre deux
 * passages — un balayage manqué ne fausse donc aucun affichage.
 */
import { sweepAllSchools } from "../src/lib/overdue";
import { prisma } from "../src/lib/prisma";

const APPLY = process.env.APPLY === "1";

async function main() {
  console.log(`\n=== BASCULE DES FACTURES ÉCHUES ===`);
  console.log(APPLY ? "Mode : ÉCRITURE\n" : "Mode : ESSAI À BLANC (APPLY=1 pour écrire)\n");

  const results = await sweepAllSchools({ apply: APPLY });

  let total = 0;
  for (const r of results) {
    const n = APPLY ? r.changed : r.ids.length;
    total += n;
    if (n > 0) {
      const school = await prisma.school.findUnique({
        where: { id: r.schoolId },
        select: { name: true },
      });
      console.log(`  ${school?.name ?? r.schoolId} : ${n} facture${n > 1 ? "s" : ""}`);
    }
  }

  console.log(
    total === 0
      ? "\nAucune facture à basculer — soit rien n'est échu, soit le balayage est déjà passé."
      : `\n${total} facture${total > 1 ? "s" : ""} ${APPLY ? "basculée" : "seraient basculées"}${total > 1 && APPLY ? "s" : ""}.`,
  );
  console.log(`${results.length} établissement·s parcouru·s.\n`);
}

main().finally(() => prisma.$disconnect());
