"use client";

import type { Quote } from "@mini/contracts";
import { formatMarketDateTime } from "../format/time-format.ts";
import { useLocale, useT } from "./use-t.ts";
import { useQuoteAvailability } from "./use-quote-availability.ts";

export function useQuoteWarning(quote: Quote) {
  const availability = useQuoteAvailability(quote.symbol);
  const locale = useLocale();
  const t = useT();
  const degraded = availability !== "available";
  const labels = [
    availability === "available" ? undefined : t(`quote.${availability}.label`),
    quote.lastKnown
      ? t("quote.lastKnown.label", { time: formatMarketDateTime(quote.timestamp, { locale }) })
      : undefined,
  ].filter(Boolean);
  return {
    degraded,
    label: labels.length > 0 ? labels.join(" · ") : undefined,
    help:
      availability === "available" ? t("quote.lastKnown.help") : t(`quote.${availability}.help`),
  };
}
