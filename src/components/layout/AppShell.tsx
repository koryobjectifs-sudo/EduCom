"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, ArrowRight } from "lucide-react";
import AppRail from "./AppRail";
import ContextualSidebar from "./ContextualSidebar";
import AppTopBar from "./AppTopBar";
import MobileTabBar from "./MobileTabBar";
import MobileSpaceTabs from "./MobileSpaceTabs";
import { SidebarSlotProvider } from "./SidebarSlot";
import { type NavSpace, getActiveSpaceId } from "@/lib/navigation";
import { type ActiveMembershipInfo } from "@/lib/schoolContext";

import { useSidebarSlot } from "./SidebarSlot";
import WalkthroughInteractif from "@/components/onboarding/WalkthroughInteractif";
import SpotlightActionCible from "@/components/onboarding/SpotlightActionCible";
import TourPageContextuelle from "@/components/onboarding/TourPageContextuelle";
import GlobalQuizTesteur from "@/components/feedback/GlobalQuizTesteur";

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
  guideVuAt?: Date | null;
  children: React.ReactNode;
}

function AppShellInner({
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
  guideVuAt,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const { guideActif, tourDeclenche, setTourDeclenche } = useSidebarSlot();
  const [bulleMobileVisible, setBulleMobileVisible] = useState(false);
  const activeSpaceId = getActiveSpaceId(pathname, spaces);
  const activeSpace = activeSpaceId ? (spaces.find((s) => s.id === activeSpaceId) ?? null) : null;
  // Communauté (26 sept. 2026) : page pleine hauteur façon Slack.
  const pleinCadre = pathname?.startsWith("/dashboard/communications/communaute") ?? false;

  useEffect(() => {
    if (!guideVuAt) {
      const dismiss = sessionStorage.getItem("educom_guide_bubble_dismissed");
      if (!dismiss) {
        const timer = setTimeout(() => setBulleMobileVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [guideVuAt]);

  const fermerBulleMobile = () => {
    setBulleMobileVisible(false);
    sessionStorage.setItem("educom_guide_bubble_dismissed", "true");
  };

  return (
    <div
      style={{ backgroundColor: "var(--color-frame-bg, #581C87)" }}
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
        guideVuAt={guideVuAt}
      />

      {/* 2. Zone Droite Complète (TopBar Unique Pleine Largeur + Sous-espace Sidebar & Contenu) */}
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

        {/* Espace de travail : Sidebar Contextuelle (Espace actif ou Guide) + Main View */}
        <div className="flex min-w-0 flex-1 overflow-hidden print:overflow-visible md:rounded-tl-2xl border-t border-l border-black/15 shadow-xs">
          {(guideActif || activeSpace) && (
            <ContextualSidebar
              space={activeSpace}
              guideActif={guideActif}
              schoolName={schoolName}
              initialWidth={initialWidth}
              currentPath={pathname}
              userRole={userRole}
              userName={userName}
            />
          )}

          {/* Canvas principal continu et aligné */}
          <main
            className={`flex-1 w-full relative print:overflow-visible print:m-0 print:p-0 bg-ground pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 ${
              pleinCadre ? "overflow-hidden" : "overflow-y-auto"
            }`}
          >
            {/* Mobile : les pages de l'espace actif, en onglets défilants */}
            {activeSpace && !pleinCadre && !guideActif && <MobileSpaceTabs space={activeSpace} />}
            {pleinCadre ? (
              <div className="flex h-full min-h-0 w-full flex-col p-0 m-0 overflow-hidden">{children}</div>
            ) : (
              <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5 print:max-w-none print:p-0 print:m-0">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile : barre d'onglets du bas */}
      <MobileTabBar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        userRole={userRole}
        userName={userName}
        schoolName={schoolName}
      />

      {/* Bulle d'incitation responsive sur Mobile (< 768px) sans déborder */}
      {!guideVuAt && bulleMobileVisible && (
        <div
          role="tooltip"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] inset-x-3 z-50 rounded-2xl border border-purple-200/90 bg-white/95 p-3.5 text-slate-900 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 select-none md:hidden"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs font-bold shadow-2xs border border-amber-200">
                ⚡
              </span>
              <p className="text-xs font-bold text-slate-900">Faites le tour en 2 minutes</p>
            </div>
            <button
              type="button"
              onClick={fermerBulleMobile}
              aria-label="Fermer"
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
            Découvrez vos outils essentiels et vos raccourcis clés.
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={fermerBulleMobile}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={() => {
                fermerBulleMobile();
                setTourDeclenche(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-frame-bg,#581C87)] px-3 py-1.5 text-xs font-bold text-white active:scale-95 transition-all shadow-2xs hover:opacity-90"
            >
              <span>Découvrir</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Walkthrough Interactif Ancré (déclenché à la demande ou première connexion) */}
      <WalkthroughInteractif
        role={userRole}
        ouvert={tourDeclenche}
        onFermer={() => setTourDeclenche(false)}
      />

      {/* Spotlight ancré contextuel ciblant l'action d'une étape de checklist */}
      <SpotlightActionCible />

      {/* Formation pas-à-pas sur les boutons de la page courante */}
      <TourPageContextuelle />

      {/* Quiz et évaluation testeur accessible globalement */}
      <GlobalQuizTesteur userRole={userRole} />
    </div>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <SidebarSlotProvider>
      <AppShellInner {...props} />
    </SidebarSlotProvider>
  );
}
