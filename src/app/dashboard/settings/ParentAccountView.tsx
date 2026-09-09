"use client";

import { User, Phone, Mail, Building2, Shield, LogOut, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export interface ParentAccountViewProps {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    role: string;
  };
  school: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  childrenCount: number;
}

export default function ParentAccountView({
  user,
  school,
  childrenCount,
}: ParentAccountViewProps) {
  const { t } = useTranslation();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("nav", "myAccount");

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="border-b border-rule pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
          {t("parent", "accountTitle")}
        </h1>
        <p className="mt-1 text-sm text-text-soft">
          {t("parent", "accountSubtitle")}
        </p>
      </div>

      {/* Carte Profil */}
      <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {user.firstName?.[0] || "P"}{user.lastName?.[0] || ""}
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">{fullName}</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
              {t("parent", "verifiedAccountBadge", { count: childrenCount })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-rule">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-faint uppercase flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {t("auth", "email")}
            </span>
            <p className="text-sm font-medium text-text">{user.email || t("common", "notProvided")}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-faint uppercase flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {t("common", "phone")}
            </span>
            <p className="text-sm font-medium text-text">{user.phone || t("common", "notProvided")}</p>
          </div>
        </div>
      </div>

      {/* Préférences régionales & Langue */}
      <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-text">{t("settings", "interfaceLanguage")}</h2>
          </div>
          <LanguageSwitcher />
        </div>
        <p className="text-xs text-text-soft">
          {t("settings", "languageNotice")}
        </p>
      </div>

      {/* Établissement de rattachement */}
      <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-rule pb-3">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-text">{t("parent", "schoolInfoTitle")}</h2>
        </div>

        <div className="space-y-2 text-sm text-text-soft">
          <p className="font-semibold text-text text-base">{school.name || "EduCom"}</p>
          {school.address && <p>{t("common", "address")} : {school.address}</p>}
          {school.phone && <p>{t("common", "phone")} : {school.phone}</p>}
          {school.email && <p>{t("auth", "email")} : {school.email}</p>}
        </div>
      </div>

      {/* Sécurité & Déconnexion */}
      <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-soft" /> {t("parent", "securityTitle")}
          </h3>
          <p className="text-xs text-text-soft mt-0.5">
            {t("parent", "securityNotice")}
          </p>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-xs font-bold text-danger hover:bg-danger/10 transition-colors shadow-2xs"
          >
            <LogOut className="h-4 w-4" />
            {t("common", "logout")}
          </button>
        </form>
      </div>
    </div>
  );
}
