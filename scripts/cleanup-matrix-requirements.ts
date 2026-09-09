import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Cleaning up DocumentRequirements and duplicates...");

  // 1. Delete all Exeat / Transfert requirements
  const deletedExeat = await prisma.documentRequirement.deleteMany({
    where: {
      OR: [
        { label: { contains: "transfert", mode: "insensitive" } },
        { label: { contains: "exeat", mode: "insensitive" } },
        { shortLabel: { contains: "transfert", mode: "insensitive" } },
        { shortLabel: { contains: "exeat", mode: "insensitive" } },
      ],
    },
  });
  console.log(`Deleted ${deletedExeat.count} exeat/transfert requirements.`);

  // 2. Fetch all remaining requirements
  const allReqs = await prisma.documentRequirement.findMany({
    orderBy: { createdAt: "asc" },
  });
  console.log(`Total remaining requirements: ${allReqs.length}`);

  // 3. Deduplicate by schoolId + cycle + label
  const seen = new Map<string, string>(); // key -> primary requirement id
  const toDeleteIds: string[] = [];

  for (const req of allReqs) {
    const key = `${req.schoolId}|${req.cycle || "GLOBAL"}|${req.label.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, req.id);
    } else {
      const primaryId = seen.get(key)!;
      // Re-point any student documents pointing to this duplicate
      await prisma.studentDocument.updateMany({
        where: { requirementId: req.id },
        data: { requirementId: primaryId },
      });
      toDeleteIds.push(req.id);
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`Deleting ${toDeleteIds.length} duplicate requirements...`);
    // Delete in batches of 100
    for (let i = 0; i < toDeleteIds.length; i += 100) {
      const chunk = toDeleteIds.slice(i, i + 100);
      await prisma.documentRequirement.deleteMany({
        where: { id: { in: chunk } },
      });
    }
  }

  const finalReqs = await prisma.documentRequirement.findMany({
    select: {
      id: true,
      schoolId: true,
      label: true,
      shortLabel: true,
      cycle: true,
      source: true,
      required: true,
      position: true,
    },
    orderBy: [{ schoolId: "asc" }, { cycle: "asc" }, { position: "asc" }],
  });

  console.log(`Finished! Total requirements across all schools: ${finalReqs.length}`);
  console.log(finalReqs);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
