"use client";

import { usePathname } from "next/navigation";
import AppRail from "./AppRail";
import ContextualSidebar from "./ContextualSidebar";
import AppTopBar from "./AppTopBar";
import MobileTabBar from "./MobileTabBar";
import MobileSpaceTabs from "./MobileSpaceTabs";
import { type NavSpace, getActiveSpaceId } from "@/lib/navigation";
import { type ActiveMembershipInfo } from "@/lib/schoolContext";

export interface AppShellProps {
  spaces: NavSpace[];
  initialWidth?: number;
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
  userAvatar?: string | null;
  emailVerified?: boolean;
  activeSchoolId?: string;
  memberships?: ActiveMembershipInfo[];
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
  activeSchoolId,
  memberships,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const activeSpaceId = getActiveSpaceId(pathname, spaces);
  const activeSpace = activeSpaceId ? (spaces.find((s) => s.id === activeSpaceId) ?? null) : null;

  return (
    <div
      style={{ backgroundColor: "var(--color-frame-bg, #0E2541)" }}
      className="flex h-dvh w-full overflow-hidden print:bg-white print:h-auto print:overflow-visible transition-colors duration-200"
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
      {/* ⚠️ `h-dvh`, pas `h-screen` (24 sept. 2026) : sur Safari/Chrome mobile,
          100vh inclut la zone masquée par la barre d'adresse — le bas de chaque
          écran était coupé et impossible à atteindre en défilant. */}
      <div className="flex min-w-0 flex-1 flex-col h-dvh overflow-hidden print:overflow-visible">
        {/* TopBar Unique & Continue (42px) */}
        <AppTopBar
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          userRole={userRole}
          userName={userName}
          userAvatar={userAvatar}
          activeSpace={activeSpace ?? undefined}
          activeSchoolId={activeSchoolId}
          memberships={memberships}
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
          <main className="flex-1 w-full overflow-y-auto relative print:overflow-visible print:m-0 print:p-0 bg-ground pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            {/* Mobile : les pages de l'espace actif, en onglets défilants */}
            {activeSpace && <MobileSpaceTabs space={activeSpace} />}
            <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5 print:max-w-none print:p-0 print:m-0">
              {children}
            </div>
          </main>
        </div>
      </div>
      {/* Mobile : barre d'onglets du bas (remplace le tiroir latéral) */}
      <MobileTabBar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        userRole={userRole}
        userName={userName}
        schoolName={schoolName}
      />
    </div>
  );
}
