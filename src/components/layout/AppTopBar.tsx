"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import MobileNav from "./MobileNav";
import { type NavSpace } from "@/lib/navigation";
import GlobalSearch from "./GlobalSearch";
import SchoolContextSwitcher from "./SchoolContextSwitcher";
import { type ActiveMembershipInfo } from "@/lib/schoolContext";

export interface AppTopBarProps {
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
  userAvatar?: string | null;
  activeSpace?: NavSpace;
  activeSchoolId?: string;
  memberships?: ActiveMembershipInfo[];
}

export default function AppTopBar({
  schoolName,
  schoolLogo,
  userRole = "OWNER",
  activeSpace,
  activeSchoolId,
  memberships,
}: AppTopBarProps) {
  return (
    <header
      style={{ backgroundColor: "var(--color-topbar-bg, #0E2541)" }}
      className="sticky top-0 z-30 flex h-10.5 shrink-0 items-center text-white print:hidden select-none transition-colors duration-200"
    >
      <div className="flex w-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Gauche : Nom d'école + Flèches historique + Fil d'Ariane */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 shrink-0">
          <MobileNav schoolName={schoolName} schoolLogo={schoolLogo} userRole={userRole} />

          {/* Sélecteur contextuel d'établissement (affiche menu si multi-écoles, sinon nom simple) */}
          <SchoolContextSwitcher
            currentSchoolName={schoolName ?? "EduCom"}
            currentSchoolId={activeSchoolId}
            userRole={userRole}
            memberships={memberships}
            variant="topbar"
          />


          {/* Flèches Précédent / Suivant (Historique Navigateur) */}
          <div className="hidden sm:flex items-center gap-0.5 text-white/70">
            <button
              type="button"
              onClick={() => window.history.back()}
              title="Page précédente"
              aria-label="Page précédente"
              className="flex h-6 w-6 items-center justify-center rounded-control hover:bg-white/10 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.history.forward()}
              title="Page suivante"
              aria-label="Page suivante"
              className="flex h-6 w-6 items-center justify-center rounded-control hover:bg-white/10 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Fil d'Ariane compact */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-white/40">/</span>
            <span className="font-semibold text-white/90 truncate max-w-[140px] lg:max-w-[180px]">
              {activeSpace ? (activeSpace.fullLabel ?? activeSpace.label) : "Tableau de bord"}
            </span>
          </div>
        </div>

        {/* Centre : Recherche Globale Slack-style (Cmd+K) */}
        <GlobalSearch />

        {/* Droite : Espaceur d'équilibrage visuel pour centrage de la recherche */}
        <div className="shrink-0 w-8 sm:w-16" aria-hidden="true" />
      </div>
    </header>
  );
}
