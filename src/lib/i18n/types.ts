export const SUPPORTED_LOCALES = ["fr", "en", "pt"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "fr";

export const LOCALE_LABELS: Record<SupportedLocale, { label: string; flag: string }> = {
  fr: { label: "Français", flag: "🇸🇳" },
  en: { label: "English", flag: "🇬🇧" },
  pt: { label: "Português", flag: "🇵🇹" },
};

export function isSupportedLocale(lang: string | null | undefined): lang is SupportedLocale {
  if (!lang) return false;
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang.toLowerCase());
}
