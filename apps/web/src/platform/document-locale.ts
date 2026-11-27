import { localeDirection, type LocaleSwitch } from "@mini/core";
import { flushSync } from "react-dom";
import { LOCALE_COOKIE } from "./locale-cookie.ts";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

let current: ViewTransition | undefined;

export const switchDocumentLocale: LocaleSwitch = (next, apply) => {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  const root = document.documentElement;
  const direction = localeDirection(next);
  const flip = () => {
    root.lang = next;
    root.dir = direction;
    flushSync(apply);
  };
  if (typeof document.startViewTransition !== "function") {
    flip();
    return;
  }
  root.dataset.localeTurn = direction;
  const transition = document.startViewTransition(flip);
  current = transition;
  void transition.finished.finally(() => {
    if (current === transition) delete root.dataset.localeTurn;
  });
};
