"use client";

import { usePathname } from "next/navigation";
import AppRail from "./AppRail";
import ContextualSidebar from "./ContextualSidebar";
import AppTopBar from "./AppTopBar";
import { type NavSpace, getActiveSpaceId } from "@/lib/navigation";

export interface AppShellProps {
  spaces: NavSpace[];
  initialWidth?: number;
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
  children: React.ReactNode;
}

export default function AppShell({
  spaces,
  initialWidth = 220,
  schoolName = "EduCom",
  schoolLogo,
  userRole = "OWNER",
  userName,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const activeSpaceId = getActiveSpaceId(pathname, spaces);
  const activeSpace = activeSpaceId ? (spaces.find((s) => s.id === activeSpaceId) ?? null) : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ground print:bg-white print:h-auto print:overflow-visible">
      {/* 1. Rail Principal Fixe (72px) - RSC */}
      <AppRail
        spaces={spaces}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        activeSpaceId={activeSpaceId}
      />

      {/* 2. Sidebar Contextuelle (Masquée sur /dashboard où aucun espace n'est actif) */}
      {activeSpace && (
        <ContextualSidebar
          space={activeSpace}
          schoolName={schoolName}
          initialWidth={initialWidth}
          currentPath={pathname}
        />
      )}

      {/* 3. Zone de Travail Principale (TopBar + Workspace) */}
      <div className="flex min-w-0 flex-1 flex-col print:overflow-visible">
        <AppTopBar
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          userRole={userRole}
          userName={userName}
          activeSpace={activeSpace ?? undefined}
        />

        <main className="flex-1 w-full overflow-y-auto relative print:overflow-visible print:m-0 print:p-0">
          <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5 print:max-w-none print:p-0 print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
