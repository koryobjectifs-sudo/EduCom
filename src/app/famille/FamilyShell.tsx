"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CheckCircle2, FileText, LogOut, Bell, Shield, GraduationCap, CreditCard, User } from "lucide-react";
import SchoolContextSwitcher from "@/components/layout/SchoolContextSwitcher";
import { type ActiveMembershipInfo } from "@/lib/schoolContext";

export interface FamilyShellProps {
  schoolName: string;
  schoolLogo: string | null;
  activeSchoolId: string;
  memberships: ActiveMembershipInfo[];
  userName?: string;
  userRole: string;
  pendingActionsCount: number;
  children: React.ReactNode;
}

export default function FamilyShell({
  schoolName,
  schoolLogo,
  activeSchoolId,
  memberships,
  userName = "Parent d'élève",
  userRole,
  pendingActionsCount,
  children,
}: FamilyShellProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/famille", label: "Accueil", icon: Home, exact: true },
    { href: "/famille/enfants", label: "Mes Enfants", icon: Users },
    {
      href: "/famille/actions",
      label: "Actions requises",
      icon: CheckCircle2,
      badge: pendingActionsCount > 0 ? pendingActionsCount : undefined,
    },
    { href: "/famille/notes", label: "Notes", icon: GraduationCap },
    { href: "/famille/paiements", label: "Paiements", icon: CreditCard },
    { href: "/famille/documents", label: "Documents", icon: FileText },
    { href: "/famille/compte", label: "Mon compte", icon: User },
  ];

  const isItemActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-ground flex flex-col selection:bg-primary/20">
      {/* 1. Header Desktop & Tablette */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-rule bg-surface/95 backdrop-blur-md px-4 sm:px-6">
        {/* Identité Établissement + Sélecteur Multi-Écoles */}
        <div className="flex items-center gap-3">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="h-8 w-auto max-w-[80px] object-contain rounded-sm"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-control bg-primary text-xs font-bold text-white shadow-2xs">
              {schoolName.charAt(0).toUpperCase()}
            </div>
          )}

          <SchoolContextSwitcher
            currentSchoolName={schoolName}
            currentSchoolId={activeSchoolId}
            userRole={userRole}
            memberships={memberships}
            variant="parent"
          />
        </div>

        {/* Navigation Desktop */}
        <nav aria-label="Espace Famille" className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isItemActive(item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-soft hover:bg-sunk hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profil / Déconnexion */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-text truncate max-w-[150px]">{userName}</p>
            <p className="text-[10px] text-text-muted">Espace Parent</p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Se déconnecter"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-rule bg-surface text-text-soft hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* 2. Contenu Principal */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* 3. Barre de Navigation Mobile Inférieure (Mobile-First 390px) */}
      <nav
        aria-label="Navigation mobile espace famille"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-t border-rule bg-surface/95 backdrop-blur-md px-1 md:hidden overflow-x-auto"
      >
        {navItems.map((item) => {
          const active = isItemActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 min-w-[48px] flex-col items-center justify-center gap-0.5 py-1 px-1 text-center transition-colors ${
                active ? "text-primary font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] leading-tight truncate max-w-[52px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
