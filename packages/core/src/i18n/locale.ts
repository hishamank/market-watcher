import { DEFAULT_LOCALE } from "../format/constants.ts";

export const LOCALES = [DEFAULT_LOCALE, "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export type TextDirection = "ltr" | "rtl";

export type LocaleSwitch = (next: Locale, apply: () => void) => void;

export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}

export function localeDirection(locale: Locale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}
