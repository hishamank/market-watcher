"use client";

import { useLanguage, useT } from "@mini/core";

export function LanguageToggle() {
  const t = useT();
  const { locale, setLocale } = useLanguage();
  const next = locale === "ar" ? "en-US" : "ar";
  return (
    <button
      type="button"
      lang={next}
      data-testid="language-toggle"
      data-locale={locale}
      onClick={() => setLocale(next)}
      className="inline-flex min-h-[44px] shrink-0 items-center rounded-md px-10 text-label font-medium text-text-secondary transition-[scale,background-color,color] duration-(--duration-fast) ease-standard hover:bg-hover hover:text-text motion-safe:active:scale-95"
    >
      {t("language.switch")}
    </button>
  );
}
