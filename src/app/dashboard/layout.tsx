import DashboardLayoutClient from "./DashboardLayoutClient";
import { requireSchoolContext } from "@/lib/documentContext";
import { redirect } from "next/navigation";
import { schoolThemeStyle } from "@/lib/theme";
import { cookies } from "next/headers";

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

  // Lecture de l'état replié côté serveur pour éliminer tout saut de layout au premier rendu
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("educom_sidebar_collapsed")?.value === "true";

  const themeStyle = schoolThemeStyle(primaryColor);

  return (
    <div style={themeStyle} className="contents">
      <DashboardLayoutClient
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        userRole={userRole}
        userName={userName}
        initialCollapsed={initialCollapsed}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
