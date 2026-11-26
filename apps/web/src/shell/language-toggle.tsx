"use client";

import { useLanguage, useT, type Locale } from "@mini/core";
import { useState } from "react";

const options = [
  {
    locale: "en-US",
    lang: "en",
    name: "language.english",
    short: "language.englishShort",
    nudge: "",
  },
  {
    locale: "ar",
    lang: "ar",
    name: "language.arabic",
    short: "language.arabicShort",
    nudge: "-top-[0.3em]",
  },
] as const;

export function LanguageToggle() {
  const t = useT();
  const { locale, setLocale } = useLanguage();
  const [movedTo, setMovedTo] = useState<Locale | null>(null);
  const swipe = movedTo === locale ? (locale === "ar" ? "forward" : "back") : undefined;
  const select = (next: Locale) => {
    if (next === locale) return;
    setMovedTo(next);
    setLocale(next);
  };
  return (
    <div
      role="group"
      dir="ltr"
      aria-label={t("language.label")}
      data-testid="language-toggle"
      data-locale={locale}
      data-swipe={swipe}
      className="language-switch flex shrink-0 rounded-md border border-border bg-surface"
    >
      {options.map((option) => {
        const pressed = option.locale === locale;
        return (
          <button
            key={option.locale}
            type="button"
            lang={option.lang}
            aria-label={t(option.name)}
            aria-pressed={pressed}
            data-testid={`language-option-${option.lang}`}
            onClick={() => select(option.locale)}
            className={`language-option relative grid h-[42px] focus-visible:z-10 w-[44px] place-items-center overflow-hidden text-label leading-none font-semibold first:rounded-s-[calc(var(--radius-md)-1px)] last:rounded-e-[calc(var(--radius-md)-1px)] ${pressed ? "text-bg" : "text-text-secondary hover:bg-hover hover:text-text"}`}
          >
            <span aria-hidden="true" className="language-fill absolute inset-0 bg-text" />
            <span
              aria-hidden="true"
              className={`language-label relative grid w-full place-items-center ${option.nudge}`}
            >
              {t(option.short)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
