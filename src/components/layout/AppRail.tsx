"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type NavSpace, getActiveSpaceId } from "@/lib/navigation";

export interface AppRailProps {
  spaces: NavSpace[];
  schoolName: string;
  schoolLogo?: string | null;
  selectedSpaceId?: string;
  onSelectSpace?: (spaceId: string) => void;
}

export default function AppRail({
  spaces,
  schoolName,
  schoolLogo,
  selectedSpaceId,
  onSelectSpace,
}: AppRailProps) {
  const pathname = usePathname();
  const activeSpaceId = selectedSpaceId || getActiveSpaceId(pathname, spaces);

  return (
    <aside
      aria-label="Espaces de travail"
      className="hidden w-[72px] shrink-0 flex-col items-center justify-between border-inline-end border-[#1E3A5F] bg-[#0E2541] py-3 text-white lg:flex print:hidden select-none z-30"
    >
      {/* Haut : Identité & Logo Établissement */}
      <div className="flex flex-col items-center gap-4 w-full">
        <Link
          href="/dashboard"
          title={schoolName}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-white/10 text-xs font-bold text-white transition-all hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="h-8 w-8 rounded-sm object-contain"
            />
          ) : (
            <span className="text-sm font-bold tracking-wider">
              {schoolName.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>

        {/* Séparateur discret */}
        <div className="h-[1px] w-8 bg-white/10" aria-hidden="true" />

        {/* Navigation des Espaces Métier */}
        <nav aria-label="Espaces métier" className="flex flex-col items-center gap-1.5 w-full px-1.5">
          {spaces.map((space) => {
            const Icon = space.icon;
            const isActive = space.id === activeSpaceId;

            return (
              <Link
                key={space.id}
                href={space.defaultHref}
                onClick={() => onSelectSpace?.(space.id)}
                aria-current={isActive ? "page" : undefined}
                title={space.label}
                className={[
                  "relative group flex w-full flex-col items-center justify-center rounded-control py-2 px-1 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  isActive
                    ? "bg-[#1E4676] text-white shadow-sm"
                    : "text-slate-400 hover:bg-[#18365D] hover:text-white",
                ].join(" ")}
              >
                {/* Liseré d'accent actif Rouge EduCom (#9C0F15) */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-inline-start-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-[#9C0F15]"
                  />
                )}

                <Icon
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                <span
                  className={`mt-1 text-[10.5px] font-medium leading-none tracking-tight truncate max-w-[60px] text-center ${
                    isActive ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"
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
      <div className="flex flex-col items-center gap-2">
        <div
          title="EduCom Workspace"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-slate-400"
        >
          E
        </div>
      </div>
    </aside>
  );
}
