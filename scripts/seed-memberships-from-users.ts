import { prisma } from "./_env";

async function main() {
  const isApply = process.env.APPLY === "1";

  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log(`   INITIALISATION DES SCHOOL MEMBERSHIPS (PHASE 1 IDENTITÉ)`);
  console.log(`   Mode : ${isApply ? "⚠️ APPLICATION RÉELLE (APPLY=1)" : "🔍 SIMULATION SÉCURISÉE (DRY-RUN)"}`);
  console.log("═══════════════════════════════════════════════════════════════════════════\n");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Nombre total d'utilisateurs trouvés : ${users.length}`);

  const existingMemberships = await prisma.schoolMembership.findMany({
    select: { userId: true, schoolId: true, role: true },
  });
  console.log(`Nombre de memberships existantes : ${existingMemberships.length}`);

  const existingSet = new Set(existingMemberships.map((m) => `${m.userId}:${m.schoolId}:${m.role}`));

  const toCreate = users
    .filter((u) => u.schoolId && !existingSet.has(`${u.id}:${u.schoolId}:${u.role}`))
    .map((u) => ({
      userId: u.id,
      schoolId: u.schoolId,
      role: u.role,
      isPrimary: true,
      active: true,
    }));

  console.log(`Memberships à créer : ${toCreate.length}`);

  if (toCreate.length === 0) {
    console.log("✓ Toutes les memberships sont déjà à jour !");
    return;
  }

  if (!isApply) {
    console.log("\n[DRY-RUN] Exécutez avec APPLY=1 pour insérer les memberships en batch :");
    console.log("APPLY=1 npx tsx scripts/seed-memberships-from-users.ts");
    return;
  }

  const res = await prisma.schoolMembership.createMany({
    data: toCreate,
    skipDuplicates: true,
  });

  console.log(`\n✓ Succès : ${res.count} memberships créées en batch.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
