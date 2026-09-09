"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from "@/lib/i18n/types";
import { setLanguageAction } from "@/app/actions/i18n";
import { useTranslation } from "@/lib/i18n/context";

export function LanguageSwitcher({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLanguageAction(newLocale);
      window.location.reload();
    });
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <Globe className="h-3.5 w-3.5 text-text-faint" />
        <select
          value={locale}
          disabled={isPending}
          onChange={(e) => handleSelect(e.target.value as SupportedLocale)}
          aria-label="Changer de langue"
          className="rounded-md border border-rule bg-surface py-0.5 px-1.5 text-xs font-medium text-text shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <option key={loc} value={loc}>
              {LOCALE_LABELS[loc].flag} {LOCALE_LABELS[loc].label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {SUPPORTED_LOCALES.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(loc)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? "bg-primary text-white shadow-2xs"
                : "border border-rule bg-surface text-text-soft hover:bg-sunk hover:text-text"
            }`}
          >
            <span>{LOCALE_LABELS[loc].flag}</span>
            <span>{LOCALE_LABELS[loc].label}</span>
          </button>
        );
      })}
    </div>
  );
}
