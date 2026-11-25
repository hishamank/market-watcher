import type { Range } from "@mini/contracts";
import { formatMarketDate, formatMarketDateTime, formatMarketTime } from "@mini/core";

export function formatScrubTime(range: Range, epochMs: number): string {
  if (range === "1D") return formatMarketTime(epochMs);
  if (range === "1W" || range === "1M") return formatMarketDateTime(epochMs);
  return formatMarketDate(epochMs, { includeYear: true });
}
