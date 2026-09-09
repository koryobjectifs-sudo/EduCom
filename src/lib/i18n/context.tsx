"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { SupportedLocale } from "./types";
import { DEFAULT_LOCALE } from "./types";
import { getDictionary } from "./index";
import { formatIcu } from "./icu";
import type { TranslationDictionary } from "./dictionaries/fr";

interface I18nContextType {
  locale: SupportedLocale;
  dict: TranslationDictionary;
  t: <
    Section extends keyof TranslationDictionary,
    Key extends keyof TranslationDictionary[Section]
  >(
    section: Section,
    key: Key,
    params?: Record<string, string | number | boolean | null | undefined>
  ) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: SupportedLocale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const dict = getDictionary(locale);
    const t = <
      Section extends keyof TranslationDictionary,
      Key extends keyof TranslationDictionary[Section]
    >(
      section: Section,
      key: Key,
      params?: Record<string, string | number | boolean | null | undefined>
    ): string => {
      const template = dict[section]?.[key];
      if (typeof template !== "string") return String(key);
      return formatIcu(template, params);
    };

    return { locale, dict, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const dict = getDictionary(DEFAULT_LOCALE);
    const t = <
      Section extends keyof TranslationDictionary,
      Key extends keyof TranslationDictionary[Section]
    >(
      section: Section,
      key: Key,
      params?: Record<string, string | number | boolean | null | undefined>
    ): string => {
      const template = dict[section]?.[key];
      if (typeof template !== "string") return String(key);
      return formatIcu(template, params);
    };
    return { locale: DEFAULT_LOCALE, dict, t };
  }
  return ctx;
}
