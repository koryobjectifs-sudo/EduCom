import { fr, type TranslationDictionary } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import { pt } from "./dictionaries/pt";
import { formatIcu, formatXOF } from "./icu";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from "./types";

export * from "./types";
export * from "./icu";
export * from "./context";

const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  fr,
  en,
  pt,
};

export function getDictionary(locale: SupportedLocale = DEFAULT_LOCALE): TranslationDictionary {
  return DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
}

export function resolveLocale(
  optsOrLang?:
    | string
    | {
        userLanguage?: string | null;
        cookieLocale?: string | null;
        acceptLanguage?: string | null;
      }
    | null
): SupportedLocale {
  if (typeof optsOrLang === "string") {
    const clean = optsOrLang.split("-")[0].toLowerCase();
    if (isSupportedLocale(clean)) return clean;
    return DEFAULT_LOCALE;
  }

  const opts = optsOrLang || {};
  if (isSupportedLocale(opts.userLanguage)) return opts.userLanguage;
  if (isSupportedLocale(opts.cookieLocale)) return opts.cookieLocale;

  if (opts.acceptLanguage) {
    const accepted = opts.acceptLanguage.toLowerCase();
    if (accepted.startsWith("en")) return "en";
    if (accepted.startsWith("pt")) return "pt";
    if (accepted.startsWith("fr")) return "fr";
  }

  return DEFAULT_LOCALE;
}

/**
 * Accès direct et typé aux clés de traduction avec formatage ICU.
 */
export function createTranslator(locale: SupportedLocale = DEFAULT_LOCALE) {
  const dict = getDictionary(locale);

  return function t<
    Section extends keyof TranslationDictionary,
    Key extends keyof TranslationDictionary[Section]
  >(
    section: Section,
    key: Key,
    params?: Record<string, string | number | boolean | null | undefined>
  ): string {
    const template = dict[section]?.[key];
    if (typeof template !== "string") return String(key);
    return formatIcu(template, params);
  };
}
