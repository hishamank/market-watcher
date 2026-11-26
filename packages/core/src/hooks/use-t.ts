"use client";

import { useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import { localeDirection, type Locale, type TextDirection } from "../i18n/locale.ts";
import type { Translate } from "../i18n/locales/en/index.ts";

export interface LanguageResult {
  readonly locale: Locale;
  readonly direction: TextDirection;
  readonly setLocale: (next: Locale) => void;
}

function useCurrentLocale(): Locale {
  const { i18n } = useCore();
  return useSyncExternalStore(i18n.subscribe, i18n.getLocale, i18n.getLocale);
}

export function useT(): Translate {
  return useCore().i18n.translator(useCurrentLocale());
}

export function useLocale(): string {
  return useCurrentLocale();
}

export function useLanguage(): LanguageResult {
  const { i18n, switchLocale } = useCore();
  const locale = useCurrentLocale();
  return {
    locale,
    direction: localeDirection(locale),
    setLocale: (next) => {
      if (next === i18n.getLocale()) return;
      switchLocale(next, () => i18n.setLocale(next));
    },
  };
}
