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
  userAvatar?: string | null;
  emailVerified?: boolean;
  children: React.ReactNode;
}

export default function AppShell({
  spaces,
  initialWidth = 200,
  schoolName = "EduCom",
  schoolLogo,
  userRole = "OWNER",
  userName,
  userAvatar,
  emailVerified = false,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const activeSpaceId = getActiveSpaceId(pathname, spaces);
  const activeSpace = activeSpaceId ? (spaces.find((s) => s.id === activeSpaceId) ?? null) : null;

  return (
    <div
      style={{ backgroundColor: "var(--color-frame-bg, #0E2541)" }}
      className="flex h-screen w-full overflow-hidden print:bg-white print:h-auto print:overflow-visible transition-colors duration-200"
    >
      {/* 1. Rail Principal Fixe (68px) */}
      <AppRail
        spaces={spaces}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        activeSpaceId={activeSpaceId}
        userRole={userRole}
        userName={userName}
        userAvatar={userAvatar}
      />

      {/* 2. Zone Droite Complète (TopBar Unique Pleine Largeur + Sous-espace Sidebar & Contenu) */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden print:overflow-visible">
        {/* TopBar Unique & Continue (42px) */}
        <AppTopBar
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          userRole={userRole}
          userName={userName}
          userAvatar={userAvatar}
          activeSpace={activeSpace ?? undefined}
        />

        {/* Espace de travail : Sidebar Contextuelle + Main View (Arrondi Slack-style appliqué au coin supérieur gauche) */}
        <div className="flex min-w-0 flex-1 overflow-hidden print:overflow-visible md:rounded-tl-2xl border-t border-l border-black/15 shadow-xs">
          {activeSpace && (
            <ContextualSidebar
              space={activeSpace}
              schoolName={schoolName}
              initialWidth={initialWidth}
              currentPath={pathname}
              userRole={userRole}
              userName={userName}
            />
          )}

          {/* Canvas principal continu et aligné */}
          <main className="flex-1 w-full overflow-y-auto relative print:overflow-visible print:m-0 print:p-0 bg-ground">
            <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5 print:max-w-none print:p-0 print:m-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
