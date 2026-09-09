import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getDirectorDashboardSnapshot } from "../src/lib/dashboard-director";
import { invoiceOverview } from "../src/lib/finance";

async function verifyBaseline() {
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: "ADMIN" }, take: 1 } },
  });
  if (!school || !school.users[0]) throw new Error("Not found");
  const user = school.users[0];

  const snap = await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role as any },
    { firstName: user.firstName, schoolName: school.name }
  );

  const invOver = await invoiceOverview({ schoolId, userId: user.id, role: user.role as any });

  console.log("BASELINE_DASHBOARD_FINANCE:", JSON.stringify(snap.financialCommand, null, 2));
  console.log("BASELINE_DASHBOARD_ACADEMIC:", JSON.stringify(snap.academic, null, 2));
  console.log("BASELINE_DASHBOARD_ENROLLMENT:", JSON.stringify(snap.enrollment, null, 2));
  console.log("BASELINE_PAYMENTS_OVERVIEW:", {
    collected: invOver.collected,
    collectedCount: invOver.collectedCount,
    outstanding: invOver.outstanding,
    forecast: invOver.forecast,
    overdue: invOver.overdue,
    overdueCount: invOver.overdueCount,
    paidCount: invOver.paidCount,
    pendingCount: invOver.pendingCount,
  });

  process.exit(0);
}
verifyBaseline().catch((err) => {
  console.error(err);
  process.exit(1);
});
