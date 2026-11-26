import type { Range } from "@mini/contracts";
import { formatMarketDate, formatMarketDateTime, formatMarketTime } from "@mini/core";

export function formatScrubTime(range: Range, epochMs: number, locale: string): string {
  if (range === "1D") return formatMarketTime(epochMs, { locale });
  if (range === "1W" || range === "1M") return formatMarketDateTime(epochMs, { locale });
  return formatMarketDate(epochMs, { locale, includeYear: true });
}
