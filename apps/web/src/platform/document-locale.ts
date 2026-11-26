import { localeDirection, type LocaleSwitch } from "@mini/core";
import { flushSync } from "react-dom";
import { LOCALE_COOKIE } from "./locale-cookie.ts";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const switchDocumentLocale: LocaleSwitch = (next, apply) => {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  const flip = () => {
    document.documentElement.lang = next;
    document.documentElement.dir = localeDirection(next);
    flushSync(apply);
  };
  if (typeof document.startViewTransition !== "function") {
    flip();
    return;
  }
  document.startViewTransition(flip);
};
