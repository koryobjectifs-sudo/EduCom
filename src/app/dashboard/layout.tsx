import { requireSchoolContext } from "@/lib/documentContext";
import { redirect } from "next/navigation";
import { schoolThemeStyle } from "@/lib/theme";
import { cookies } from "next/headers";
import { getVisibleSpaces } from "@/lib/navigation";
import AppShell from "@/components/layout/AppShell";
import ParentLayout from "@/components/layout/ParentLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: dbUser, school } = await requireSchoolContext();

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

  // Lecture de la largeur de la sidebar côté serveur pour éliminer tout saut de layout
  const cookieStore = await cookies();
  const widthCookie = cookieStore.get("educom_sidebar_width")?.value;
  const legacyCollapsedCookie = cookieStore.get("educom_sidebar_collapsed")?.value === "true";
  let initialWidth = 220;
  if (widthCookie) {
    const parsed = parseInt(widthCookie, 10);
    if (!isNaN(parsed) && ((parsed >= 180 && parsed <= 320) || parsed === 52)) {
      initialWidth = parsed;
    }
  } else if (legacyCollapsedCookie) {
    initialWidth = 52;
  }

  const themeStyle = schoolThemeStyle(primaryColor);

  // 1. AIGUILLAGE SERVEUR PARENT : Application dédiée simplifiée (RSC)
  if (userRole === "PARENT") {
    return (
      <div style={themeStyle} className="contents">
        <ParentLayout schoolName={schoolName} schoolLogo={schoolLogo} userName={userName}>
          {children}
        </ParentLayout>
      </div>
    );
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
      >
        {children}
      </AppShell>
    </div>
  );
}
