import { prisma } from "./_env";
import { deduceCycleAndSerie } from "../src/app/dashboard/students/import/utils";

async function main() {
  const apply = process.env.APPLY === "1";

  console.log("--- VÉRIFICATION DES CYCLES DE CLASSES ---");
  console.log(`Mode: ${apply ? "ÉCRITURE (APPLY=1)" : "ESSAI À BLANC (DRY-RUN)"}`);

  const totalBefore = await prisma.class.count();
  const byCycleBefore = await prisma.class.groupBy({
    by: ["cycle"],
    _count: { id: true },
  });

  console.log("\n[AVANT] Répartition par cycle :");
  let autreBefore = 0;
  for (const row of byCycleBefore) {
    console.log(`  ${row.cycle} : ${row._count.id}`);
    if (row.cycle === "AUTRE") autreBefore = row._count.id;
  }
  console.log(`Total classes : ${totalBefore}`);
  console.log(`Classes en cycle "AUTRE" AVANT : ${autreBefore}`);

  // Analyser toutes les classes
  const allClasses = await prisma.class.findMany({
    include: { school: { select: { id: true, name: true } } },
    orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
  });

  const toUpdate: { id: string; schoolName: string; className: string; currentCycle: string; targetCycle: string }[] = [];

  for (const c of allClasses) {
    const deduced = deduceCycleAndSerie(c.name);
    if (deduced.cycle !== "AUTRE" && c.cycle !== deduced.cycle) {
      toUpdate.push({
        id: c.id,
        schoolName: c.school.name,
        className: c.name,
        currentCycle: c.cycle,
        targetCycle: deduced.cycle,
      });
    }
  }

  console.log(`\nClasses à corriger : ${toUpdate.length}`);
  for (const u of toUpdate) {
    console.log(`  - [${u.schoolName}] ${u.className} : ${u.currentCycle} → ${u.targetCycle}`);
  }

  if (apply) {
    console.log("\nApplication des mises à jour...");
    for (const u of toUpdate) {
      await prisma.class.update({
        where: { id: u.id },
        data: { cycle: u.targetCycle as any },
      });
    }
    console.log("Mises à jour terminées avec succès.");
  }

  const byCycleAfter = await prisma.class.groupBy({
    by: ["cycle"],
    _count: { id: true },
  });

  console.log("\n[APRÈS] Répartition par cycle :");
  let autreAfter = 0;
  for (const row of byCycleAfter) {
    console.log(`  ${row.cycle} : ${row._count.id}`);
    if (row.cycle === "AUTRE") autreAfter = row._count.id;
  }
  console.log(`Classes en cycle "AUTRE" APRÈS : ${apply ? autreAfter : autreBefore} (visé avec APPLY: ${autreAfter - toUpdate.length})`);
}

main()
  .catch((err) => {
    console.error("Erreur :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
