import { requireSchoolContext } from "@/lib/documentContext";
import { redirect } from "next/navigation";
import { schoolThemeStyle } from "@/lib/theme";
import { cookies, headers } from "next/headers";
import { getVisibleSpaces } from "@/lib/navigation";
import AppShell from "@/components/layout/AppShell";
import ParentLayout from "@/components/layout/ParentLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: dbUser, school, schoolId, memberships } = await requireSchoolContext();

  if (!school) {
    redirect("/login?erreur=espace_absent");
  }

  if (!school.onboardingCompleted) {
    redirect("/onboarding");
  }

  const schoolName = school.name || "EduCom";
  const schoolLogo = school.logo;
  const userRole = dbUser.role || "PARENT";
  const primaryColor = school.primaryColor;
  const userName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || undefined;
  const userAvatar = dbUser.avatar || null;
  const emailVerified = dbUser.emailVerified;

  // Lecture de la largeur de la sidebar côté serveur pour éliminer tout saut de layout
  const cookieStore = await cookies();
  const widthCookie = cookieStore.get("educom_sidebar_width")?.value;
  const legacyCollapsedCookie = cookieStore.get("educom_sidebar_collapsed")?.value === "true";
  let initialWidth = 200;
  if (widthCookie) {
    const parsed = parseInt(widthCookie, 10);
    if (!isNaN(parsed) && ((parsed >= 160 && parsed <= 320) || parsed === 52)) {
      initialWidth = parsed;
    }
  } else if (legacyCollapsedCookie) {
    initialWidth = 52;
  }

  const themeStyle = schoolThemeStyle(primaryColor);

  // 1. AIGUILLAGE SERVEUR PARENT : Redirection transparente vers l'Espace Famille (/famille)
  if (userRole === "PARENT") {
    // S'assurer qu'un compte qui TESTE en tant que parent garde une porte de sortie :
    // La redirection /dashboard → /famille ne s'applique qu'aux comptes réellement parents,
    // jamais à un ADMIN/staff en mode test qui tente d'accéder au dashboard.
    let isDevTesting = false;
    if (process.env.NODE_ENV !== "production") {
      const simulatedRoleCookie = cookieStore.get("educom_dev_simulated_role")?.value;
      const hasAdminMembership = memberships.some((m) =>
        ["ADMIN", "OWNER", "TEACHER", "SECRETARY", "ACCOUNTANT"].includes(m.role)
      );
      const isStaffEmail = !dbUser.email.endsWith("@parent.educom.local");
      if (simulatedRoleCookie === "PARENT" || hasAdminMembership || isStaffEmail) {
        isDevTesting = true;
      }
    }

    if (isDevTesting) {
      // Échappement automatique : l'admin en test accédant au dashboard est rétabli dans son rôle réel
      redirect("/api/dev/reset-role?role=ADMIN");
    }

    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/dashboard";

    if (pathname.startsWith("/dashboard/grades")) {
      redirect("/famille/notes");
    }
    if (pathname.startsWith("/dashboard/payments")) {
      redirect("/famille/paiements");
    }
    if (pathname.startsWith("/dashboard/settings")) {
      redirect("/famille/compte");
    }
    if (pathname.startsWith("/dashboard/documents")) {
      redirect("/famille/documents");
    }
    if (pathname.startsWith("/dashboard/students/")) {
      const parts = pathname.split("/");
      const studentId = parts[3];
      if (studentId && studentId !== "new") {
        redirect(`/famille/enfants/${studentId}`);
      }
      redirect("/famille/enfants");
    }
    if (pathname.startsWith("/dashboard/students")) {
      redirect("/famille/enfants");
    }
    redirect("/famille");
  }

  // 2. SHELL APPLICATIF INTERNE BI-ÉTAGÉ (RSC)
  const spaces = getVisibleSpaces(userRole);

  return (
    <div style={themeStyle} className="contents">
      <AppShell
        spaces={spaces}
        initialWidth={initialWidth}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        userRole={userRole}
        userName={userName}
        userAvatar={userAvatar}
        emailVerified={emailVerified}
        activeSchoolId={schoolId}
        memberships={memberships}
      >
        {children}
      </AppShell>
    </div>
  );

}
