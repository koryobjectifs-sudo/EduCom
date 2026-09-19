import { headers } from "next/headers";
import { requireFamilyContext } from "@/lib/familyContext";
import { schoolThemeStyle } from "@/lib/theme";
import FamilyShell from "./FamilyShell";

export const metadata = {
  title: "Espace Famille | EduCom",
  description: "Portail parent dédié au suivi scolaire, aux pièces administratives et aux actions requises.",
};

export default async function FamilyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  if (pathname === "/famille/login" || pathname.startsWith("/famille/login/")) {
    return <>{children}</>;
  }

  const { user, school, schoolId, role, memberships, pendingReminders } = await requireFamilyContext();

  const schoolName = school.name || "EduCom";
  const schoolLogo = school.logo;
  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Parent";
  const themeStyle = schoolThemeStyle(school.primaryColor);

  return (
    <div style={themeStyle} className="contents">
      <FamilyShell
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        activeSchoolId={schoolId}
        memberships={memberships}
        userName={userName}
        userRole={role}
        pendingActionsCount={pendingReminders.length}
      >
        {children}
      </FamilyShell>
    </div>
  );
}
