"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  FileText, 
  GraduationCap, 
  CreditCard, 
  User, 
  LogOut,
  FileWarning,
  ArrowRight,
  Upload,
  PenTool,
} from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export interface ParentReminderItem {
  id: string;
  studentName: string;
  requirementLabel: string;
  nature: string;
  actionUrl: string;
  message: string;
  createdAt: string;
}

export interface ParentLayoutProps {
  schoolName?: string;
  schoolLogo?: string | null;
  userName?: string;
  emailVerified?: boolean;
  activeReminders?: ParentReminderItem[];
  children: React.ReactNode;
}

export default function ParentLayout({
  schoolName = "EduCom",
  schoolLogo,
  userName,
  emailVerified = false,
  activeReminders = [],
  children,
}: ParentLayoutProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const displayName = userName?.trim() || t("nav", "myAccount");
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join("");

  const parentNavItems = [
    { href: "/dashboard/students", label: t("nav", "myChildren"), icon: Users },
    { href: "/dashboard/documents", label: t("nav", "myDossiers"), icon: FileText },
    { href: "/dashboard/grades", label: t("nav", "myGrades"), icon: GraduationCap },
    { href: "/dashboard/payments", label: t("nav", "myPayments"), icon: CreditCard },
    { href: "/dashboard/settings", label: t("nav", "myAccount"), icon: User },
  ];

  function isItemActive(href: string) {
    if (!pathname) return false;
    if (pathname === href || pathname.startsWith(`${href}/`)) return true;
    return false;
  }

  return (
    <div className="min-h-screen bg-ground flex flex-col selection:bg-primary/20">
      {/* Entête Simple Espace Famille */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-rule bg-surface/95 backdrop-blur-md px-4 sm:px-6">
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
          <div>
            <h1 className="text-xs font-bold text-text leading-tight">{schoolName}</h1>
            <p className="text-[10.5px] text-text-soft font-medium">Espace Famille</p>
          </div>
        </div>

        {/* Navigation Desktop (≥ 768px) */}
        <nav aria-label="Navigation Espace Famille" className="hidden md:flex items-center gap-1">
          {parentNavItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-soft hover:bg-sunk hover:text-text"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-text-faint"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profil & Sélecteur de langue & Déconnexion */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials || "P"}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-text">{displayName}</span>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={t("common", "logout")}
              className="flex h-8 w-8 items-center justify-center rounded-control text-text-soft hover:bg-sunk hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* ── NOTIFICATIONS DE RELANCE DOSSIER (ESPACE PARENT PRIORITAIRE) ── */}
      {activeReminders.length > 0 && (
        <aside aria-label="Pièces de dossier manquantes" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="space-y-2.5">
            {activeReminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
                    <FileWarning className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-text">
                      {rem.message}
                    </p>
                    <p className="text-[11px] text-text-soft mt-0.5">
                      Élève : <span className="font-semibold text-text">{rem.studentName}</span> · Pièce : <span className="font-semibold text-text">{rem.requirementLabel}</span>
                    </p>
                  </div>
                </div>

                <Link
                  href={rem.actionUrl}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-2xs hover:bg-primary/90 transition-all shrink-0 min-h-[44px]"
                >
                  {rem.nature === "SIGNATURE" ? (
                    <>
                      <PenTool className="h-4 w-4" />
                      <span>Lire et signer</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Déposer la pièce</span>
                    </>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Contenu Parent */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Barre de navigation mobile inférieure (< 768px) */}
      <nav 
        aria-label="Navigation mobile espace famille"
        className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-rule bg-surface/95 backdrop-blur-md px-2 md:hidden shadow-lg safe-area-bottom"
      >
        {parentNavItems.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
                active
                  ? "text-primary font-bold"
                  : "text-text-soft hover:text-text font-medium"
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${active ? "text-primary stroke-[2.4]" : "text-text-faint stroke-[1.8]"}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
