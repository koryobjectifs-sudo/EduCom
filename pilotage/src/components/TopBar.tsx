"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity, AlertTriangle, Building2, LifeBuoy, LogOut, ScrollText, Wallet } from "lucide-react";
import { seDeconnecter } from "@/lib/connexion";

const LIENS = [
  { href: "/", nom: "Vue d'ensemble", icone: Activity, exact: true },
  { href: "/ecoles", nom: "Écoles", icone: Building2 },
  { href: "/revenus", nom: "Revenus", icone: Wallet },
  { href: "/support", nom: "Support", icone: LifeBuoy, cle: "support" as const },
  { href: "/erreurs", nom: "Erreurs", icone: AlertTriangle, cle: "erreurs" as const },
  { href: "/journal", nom: "Journal", icone: ScrollText },
];

/** Topbar officielle EduCom Pilotage — Démarcation pourpre royale distinctive */
export default function TopBar({
  badges,
  email,
}: {
  badges: { support: number; erreurs: number };
  email: string;
}) {
  const chemin = usePathname();
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2d124d] bg-[#1a082e] text-[#f3e8ff] shadow-md">
      <div className="mx-auto flex h-[52px] max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        {/* Logo EduCom officiel + badge Pilotage */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2 transition-opacity hover:opacity-95"
            title="Cockpit de pilotage EduCom"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/educom-bouclier.png"
              alt="EduCom"
              width={22}
              height={26}
              className="h-[23px] w-auto drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
            />
            <span
              className="font-bold text-[16px] tracking-tight leading-none"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              <span className="text-white">Edu</span>
              <span className="text-[#FF6B6F]">Com</span>
            </span>
          </Link>

          <span className="inline-flex items-center rounded-md border border-purple-400/25 bg-purple-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-purple-200">
            Pilotage
          </span>

          <span
            className="hidden items-center gap-1.5 pl-1.5 text-[10.5px] font-medium text-emerald-400 lg:inline-flex"
            title="Données synchronisées en direct avec la base EduCom (rafraîchissement 30 s)"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Direct
          </span>
        </div>

        {/* Navigation fine horizontale */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {LIENS.map((l) => {
            const actif = l.exact ? chemin === l.href : chemin.startsWith(l.href);
            const n = l.cle ? badges[l.cle] : 0;
            const Icone = l.icone;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  actif
                    ? "bg-white/15 text-white font-semibold shadow-xs"
                    : "text-purple-200/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icone aria-hidden="true" className={`h-3.5 w-3.5 ${actif ? "text-purple-200" : "opacity-75"}`} />
                <span>{l.nom}</span>
                {n > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[9.5px] font-bold text-white leading-none">
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profil + Déconnexion */}
        <div className="flex shrink-0 items-center gap-2 text-[11.5px]">
          <span className="hidden font-medium text-purple-200/70 sm:inline">{email}</span>
          <form action={seDeconnecter}>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md border border-purple-400/20 bg-white/5 px-2 py-1 text-[11px] font-medium text-purple-200 hover:bg-red-500/20 hover:text-red-200 hover:border-red-400/30"
              title="Se déconnecter"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
