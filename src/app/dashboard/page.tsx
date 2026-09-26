import { Suspense } from "react";
import { requireSchoolContext } from "@/lib/documentContext";
import { getDirectorDashboardSnapshot } from "@/lib/dashboard-director";
import { getTeacherDashboardSnapshot } from "@/lib/dashboard-teacher";
import { getAccountantDashboardSnapshot } from "@/lib/dashboard-accountant";
import { getSecretaryDashboardSnapshot } from "@/lib/dashboard-secretary";
import DirectorDashboard from "@/components/dashboard/director/DirectorDashboard";
import TeacherDashboard from "@/components/dashboard/teacher/TeacherDashboard";
import AccountantDashboard from "@/components/dashboard/accountant/AccountantDashboard";
import SecretaryDashboard from "@/components/dashboard/secretary/SecretaryDashboard";
import AcademicProgressSectionServer from "@/components/dashboard/director/AcademicProgressSectionServer";
import AcademicProgressSkeleton from "@/components/dashboard/director/AcademicProgressSkeleton";
import RecentActivityFeedServer from "@/components/dashboard/director/RecentActivityFeedServer";
import RecentActivitySkeleton from "@/components/dashboard/director/RecentActivitySkeleton";
import DemoDataBanner from "@/components/dashboard/DemoDataBanner";
import { type PeriodKind } from "@/lib/contextEngine";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { redirect } from "next/navigation";

/**
 * COMMAND CENTER DU DASHBOARD : DIRECTION, ENSEIGNANT & COMPTABILITÉ
 * Poste de pilotage quotidien adapté au métier de chaque utilisateur.
 */
export default async function DashboardHome() {
  const { schoolId, school, user } = await requireSchoolContext();

  // ⚠️ GARDE SERVEUR : Interdit le chargement de données financières/globales
  // si le rôle n'a pas accès à l'accueil (ex. PARENT). Redirection immédiate.
  if (!hasAccess(user.role, "/dashboard")) {
    redirect(firstAllowedPath(user.role));
  }

  // ── ESPACE ENSEIGNANT DÉDIÉ ──
  // Un enseignant ne doit voir que son métier : ses classes, ses matières,
  // ses saisies et restant à saisir, prochaines évaluations, appel du jour s'il est titulaire.
  if (user.role === "TEACHER") {
    const teacherSnapshot = await getTeacherDashboardSnapshot(
      { schoolId, userId: user.id },
      user.firstName?.trim() || "Enseignant",
    );
    return <TeacherDashboard snapshot={teacherSnapshot} />;
  }

  // ── ESPACE COMPTABILITÉ DÉDIÉ ──
  // Le comptable dispose d'un cockpit 100% focalisé sur la gestion financière :
  // trésorerie, caisse en direct, recouvrement, ancienneté des créances et ventilation des paiements.
  if (user.role === "ACCOUNTANT") {
    const accountantSnapshot = await getAccountantDashboardSnapshot(
      { schoolId, userId: user.id },
      { firstName: user.firstName?.trim() || "Comptable", schoolName: school?.name ?? null },
    );
    return <AccountantDashboard snapshot={accountantSnapshot} />;
  }

  // ── ESPACE SECRÉTARIAT DÉDIÉ ──
  // Le secrétariat dispose d'un cockpit orienté vie scolaire et admissions :
  // dossiers d'inscriptions, registres d'appel du jour, bulletins et annuaire des élèves.
  if (user.role === "SECRETARY") {
    const secretarySnapshot = await getSecretaryDashboardSnapshot(
      { schoolId, userId: user.id },
      { firstName: user.firstName?.trim() || "Secrétariat", schoolName: school?.name ?? null },
    );
    return <SecretaryDashboard snapshot={secretarySnapshot} />;
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

  const academicSlot = snapshot.scope.pedagogie ? (
    <Suspense key="academic-progress-slot" fallback={<AcademicProgressSkeleton className="h-full flex-1" />}>
      <AcademicProgressSectionServer schoolId={schoolId} />
    </Suspense>
  ) : undefined;

  const recentActivitySlot = (
    <Suspense key="recent-activity-slot" fallback={<RecentActivitySkeleton />}>
      <RecentActivityFeedServer schoolId={schoolId} scopeMoney={snapshot.scope.money} />
    </Suspense>
  );

  return (
    <div className="space-y-6">
      {snapshot.hasDemoData && <DemoDataBanner />}
      <DirectorDashboard
        snapshot={snapshot}
        academicSlot={academicSlot}
        recentActivitySlot={recentActivitySlot}
      />
    </div>
  );
}

