import { requireSchoolContext } from "@/lib/documentContext";
import { getDirectorDashboardSnapshot } from "@/lib/dashboard-director";
import DirectorDashboard from "@/components/dashboard/director/DirectorDashboard";
import DemoDataBanner from "@/components/dashboard/DemoDataBanner";
import { type PeriodKind } from "@/lib/contextEngine";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { redirect } from "next/navigation";

/**
 * DIRECTRICE / DIRECTOR COMMAND CENTER
 * Poste de pilotage quotidien de l'établissement scolaire.
 */
export default async function DashboardHome() {
  const { schoolId, school, user } = await requireSchoolContext();

  // ⚠️ GARDE SERVEUR : Interdit le chargement de données financières/globales
  // si le rôle n'a pas accès à l'accueil (ex. PARENT). Redirection immédiate.
  if (!hasAccess(user.role, "/dashboard$")) {
    redirect(firstAllowedPath(user.role));
  }

  let simulation: { date?: Date; period?: PeriodKind } | undefined;
  if (process.env.NODE_ENV === "development") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const d = cookieStore.get("dev_test_date")?.value;
    const p = cookieStore.get("dev_test_period")?.value;
    if (d || p) {
      simulation = { date: d ? new Date(d) : undefined, period: p as PeriodKind };
    }
  }

  const snapshot = await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role },
    { firstName: user.firstName?.trim() || null, schoolName: school?.name ?? null },
    simulation
  );

  return (
    <div className="space-y-6">
      {snapshot.hasDemoData && <DemoDataBanner />}
      <DirectorDashboard snapshot={snapshot} />
    </div>
  );
}
