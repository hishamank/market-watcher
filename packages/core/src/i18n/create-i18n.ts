import "intl-pluralrules";
import i18next from "i18next";
import { ar } from "./locales/ar/index.ts";
import { en, type MessageKey, type Translate, type TranslationValues } from "./locales/en/index.ts";
import { LOCALES, parseLocale, type Locale } from "./locale.ts";

export interface I18nService {
  getLocale(): Locale;
  subscribe(listener: () => void): () => void;
  setLocale(next: Locale): void;
  translator(locale: Locale): Translate;
}

export function createI18n(initial?: string): I18nService {
  const instance = i18next.createInstance();
  void instance.init({
    lng: parseLocale(initial),
    fallbackLng: "en",
    resources: { en: { translation: en }, ar: { translation: ar } },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    initAsync: false,
  });

  const translators = Object.fromEntries(
    LOCALES.map((locale): [Locale, Translate] => {
      const fixed = instance.getFixedT(locale);
      return [
        locale,
        (key: MessageKey, values?: TranslationValues) =>
          values === undefined ? fixed(key) : fixed(key, { ...values }),
      ];
    }),
  ) as Record<Locale, Translate>;
  const listeners = new Set<() => void>();
  let current = parseLocale(initial);

  return {
    getLocale: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setLocale(next) {
      if (next === current) return;
      current = next;
      for (const listener of listeners) listener();
    },
    translator: (locale) => translators[locale],
  };
}
