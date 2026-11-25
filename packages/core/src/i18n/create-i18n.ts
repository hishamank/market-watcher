import "intl-pluralrules";
import i18next from "i18next";
import { DEFAULT_LOCALE } from "../format/constants.ts";
import { en, type MessageKey, type Translate, type TranslationValues } from "./locales/en/index.ts";

export interface I18nService {
  readonly locale: string;
  readonly t: Translate;
}

export function createI18n(locale: string = DEFAULT_LOCALE): I18nService {
  const instance = i18next.createInstance();
  void instance.init({
    lng: locale,
    fallbackLng: "en",
    resources: {
      en: {
        translation: en,
      },
    },
    keySeparator: false,
    nsSeparator: false,
    interpolation: {
      escapeValue: false,
    },
    initAsync: false,
  });

  const t: Translate = (key: MessageKey, values?: TranslationValues) =>
    values === undefined ? instance.t(key) : instance.t(key, { ...values });

  return {
    locale,
    t,
  };
}
