import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";
import { prisma } from "../src/lib/prisma";

async function run() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });
  const user = school!.users[0];

  const snap = await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role as any },
    { firstName: user.firstName, schoolName: school!.name }
  );

  console.log("=== CHIFFRES DE RÉFÉRENCE (AVANT ÉTAPE 3) ===");
  console.log("totalCollected     :", snap.kpis.recovery.collected);
  console.log("totalExpected      :", snap.kpis.recovery.expected);
  console.log("totalOutstanding   :", snap.kpis.recovery.outstanding);
  console.log("recoveryRate       :", snap.kpis.recovery.rate);
  console.log("overdueAmount      :", snap.kpis.overdue.totalAmount);
  console.log("overdueFamilies    :", snap.kpis.overdue.affectedFamilies);
  console.log("overdueCount       :", snap.kpis.overdue.invoicesCount);
  console.log("financialCommand   :", JSON.stringify(snap.financialCommand, null, 2));
  process.exit(0);
}

run().catch(console.error);
