import { useCore } from "../core-provider.tsx";
import type { Translate } from "../i18n/locales/en/index.ts";

export function useT(): Translate {
  return useCore().i18n.t;
}

export function useLocale(): string {
  return useCore().i18n.locale;
}
