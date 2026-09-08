"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

export interface ParentLayoutProps {
  schoolName?: string;
  schoolLogo?: string | null;
  userName?: string;
  children: React.ReactNode;
}

export default function ParentLayout({
  schoolName = "EduCom",
  schoolLogo,
  userName,
  children,
}: ParentLayoutProps) {
  const displayName = userName?.trim() || "Espace Parent";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-ground flex flex-col">
      {/* Entête Simple Espace Famille */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-rule bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="h-8 w-auto max-w-[80px] object-contain rounded-sm"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-control bg-primary text-xs font-bold text-white">
              {schoolName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xs font-bold text-text leading-tight">{schoolName}</h1>
            <p className="text-[10.5px] text-text-soft font-medium">Espace Famille</p>
          </div>
        </div>

        {/* Profil & Déconnexion */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials || "P"}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-text">{displayName}</span>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Se déconnecter"
              className="flex h-8 w-8 items-center justify-center rounded-control text-text-soft hover:bg-sunk hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Contenu Parent */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
