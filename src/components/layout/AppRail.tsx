import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { type NavSpace } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";

export interface AppRailProps {
  spaces: NavSpace[];
  schoolName: string;
  schoolLogo?: string | null;
  activeSpaceId?: string | null;
}

export default function AppRail({
  spaces,
  schoolName,
  schoolLogo,
  activeSpaceId,
}: AppRailProps) {
  const initial = schoolName?.trim() ? schoolName.trim().charAt(0).toUpperCase() : "E";
  const isDashboardActive = !activeSpaceId;

  return (
    <aside
      aria-label="Espaces de travail"
      className="hidden w-[72px] shrink-0 flex-col items-center justify-between border-inline-end border-[#1E3A5F] bg-[#0E2541] py-2.5 text-white md:flex print:hidden select-none z-30"
    >
      {/* Haut : Identité & Logo Établissement (Neutre, non cliquable) + Navigation */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Logo Établissement (Identité visuelle neutre) */}
        <div
          title={schoolName}
          aria-label={schoolName}
          className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-control bg-white p-1 shadow-2xs select-none"
        >
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center rounded bg-[#0E2541] text-[11px] font-bold text-white"
            >
              {initial}
            </div>
          )}
        </div>

        {/* Séparateur discret */}
        <div className="h-[1px] w-8 bg-white/10" aria-hidden="true" />

        {/* Navigation : Tableau de bord en première position + Espaces métier */}
        <nav aria-label="Espaces de travail" className="flex flex-col items-center gap-1 w-full px-1">
          {/* 1. Tuile permanente Tableau de bord */}
          <Link
            href="/dashboard"
            aria-current={isDashboardActive ? "page" : undefined}
            title="Tableau de bord"
            className={[
              "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-1 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              isDashboardActive
                ? "bg-[#1E4676] text-white shadow-sm"
                : "text-slate-400 hover:bg-[#18365D] hover:text-white",
            ].join(" ")}
          >
            {isDashboardActive && (
              <span
                aria-hidden="true"
                data-testid="rail-active-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[26px] w-[3px] rounded-r-full bg-[#9C0F15]"
              />
            )}

            <LayoutDashboard
              aria-hidden="true"
              className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                isDashboardActive ? "text-white" : "text-slate-400 group-hover:text-white"
              }`}
              strokeWidth={isDashboardActive ? 2.2 : 1.8}
            />

            <span
              className={`mt-0.5 text-[11.5px] font-medium leading-tight truncate max-w-[62px] text-center ${
                isDashboardActive ? "text-white font-bold" : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              Accueil
            </span>
          </Link>

          {/* Filet séparateur entre Tableau de bord et les espaces métier */}
          <div className="h-[1px] w-7 bg-white/10 my-0.5" aria-hidden="true" />

          {/* 2. Les 5 Espaces Métier */}
          {spaces.map((space) => {
            const Icon = getNavIcon(space.icon);
            const isActive = space.id === activeSpaceId;

            return (
              <Link
                key={space.id}
                href={space.defaultHref}
                aria-current={isActive ? "page" : undefined}
                title={space.fullLabel ?? space.label}
                className={[
                  "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-1 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  isActive
                    ? "bg-[#1E4676] text-white shadow-sm"
                    : "text-slate-400 hover:bg-[#18365D] hover:text-white",
                ].join(" ")}
              >
                {/* Liseré d'accent actif Rouge EduCom (#9C0F15) sur le bord gauche de la tuile */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    data-testid="rail-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[26px] w-[3px] rounded-r-full bg-[#9C0F15]"
                  />
                )}

                <Icon
                  aria-hidden="true"
                  className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                <span
                  className={`mt-0.5 text-[11.5px] font-medium leading-tight truncate max-w-[62px] text-center ${
                    isActive ? "text-white font-bold" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {space.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bas du rail : Indicateur EduCom */}
      <div className="flex flex-col items-center gap-1">
        <div
          title="EduCom Workspace"
          className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/5 text-[9.5px] font-bold text-slate-400"
        >
          E
        </div>
      </div>
    </aside>
  );
}
