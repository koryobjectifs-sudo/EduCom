"use client";

import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useEffect, useMemo } from "react";
import { hasAccess, firstAllowedPath, RoleType } from "@/lib/permissions";
import { getVisibleSpaces } from "@/lib/navigation";
import AppShell from "@/components/layout/AppShell";
import ParentLayout from "@/components/layout/ParentLayout";

export interface DashboardLayoutClientProps {
  children: React.ReactNode;
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
  initialCollapsed?: boolean;
}

export default function DashboardLayoutClient({
  children,
  schoolName = "EduCom",
  schoolLogo,
  userRole = "PARENT",
  userName,
  initialCollapsed = false,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isParent = userRole === "PARENT";
  const spaces = useMemo(() => getVisibleSpaces(userRole), [userRole]);

  useEffect(() => {
    if (pathname && !hasAccess(userRole as RoleType, pathname)) {
      router.push(firstAllowedPath(userRole as RoleType));
    }
  }, [pathname, userRole, router]);

  const isAuthorized = pathname ? hasAccess(userRole as RoleType, pathname) : true;

  const content = isAuthorized ? children : (
    <div className="flex h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-surface border border-rule bg-ground text-text-faint">
        <Lock aria-hidden="true" className="h-5 w-5" />
      </div>
      <h2 className="text-role-section font-semibold text-text">Accès restreint</h2>
      <p className="mt-1.5 max-w-md text-role-body text-text-soft">
        Vous n'avez pas les droits nécessaires pour cette page. Redirection en cours…
      </p>
    </div>
  );

  // Expérience dédiée pour les parents (application mobile-first simplifiée, sans shell pro)
  if (isParent) {
    return (
      <ParentLayout schoolName={schoolName} schoolLogo={schoolLogo} userName={userName}>
        {content}
      </ParentLayout>
    );
  }

  // Shell applicatif bi-étagé professionnel pour tous les rôles internes
  return (
    <AppShell
      spaces={spaces}
      initialCollapsed={initialCollapsed}
      schoolName={schoolName}
      schoolLogo={schoolLogo}
      userRole={userRole}
      userName={userName}
    >
      {content}
    </AppShell>
  );
}

