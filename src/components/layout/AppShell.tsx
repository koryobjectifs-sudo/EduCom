"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { type NavSpace, getActiveSpaceId } from "@/lib/navigation";
import AppRail from "./AppRail";
import ContextualSidebar from "./ContextualSidebar";
import AppTopBar from "./AppTopBar";
import { setSidebarCollapsed } from "@/app/dashboard/actions";

export interface AppShellProps {
  spaces: NavSpace[];
  initialCollapsed?: boolean;
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
  children: React.ReactNode;
}

export default function AppShell({
  spaces,
  initialCollapsed = false,
  schoolName = "EduCom",
  schoolLogo,
  userRole = "OWNER",
  userName,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [, startTransition] = useTransition();

  // Déterminer l'espace actif
  const activeSpaceId = getActiveSpaceId(pathname, spaces);
  const [manualSpaceId, setManualSpaceId] = useState<string | null>(null);

  // Espace actuellement affiché dans la sidebar contextuelle
  const currentSpaceId = manualSpaceId || activeSpaceId;
  const activeSpace = spaces.find((s) => s.id === currentSpaceId) || spaces[0];

  const handleToggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    startTransition(async () => {
      await setSidebarCollapsed(nextState);
    });
  };

  const handleSelectSpace = (spaceId: string) => {
    setManualSpaceId(spaceId);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ground print:bg-white print:h-auto print:overflow-visible">
      {/* 1. Rail Principal Fixe (72px) */}
      <AppRail
        spaces={spaces}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        selectedSpaceId={currentSpaceId}
        onSelectSpace={handleSelectSpace}
      />

      {/* 2. Sidebar Contextuelle Rétractable */}
      {activeSpace && (
        <ContextualSidebar
          space={activeSpace}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      )}

      {/* 3. Zone de Travail Principale (TopBar + Workspace) */}
      <div className="flex min-w-0 flex-1 flex-col print:overflow-visible">
        <AppTopBar
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          userRole={userRole}
          userName={userName}
          activeSpace={activeSpace}
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
