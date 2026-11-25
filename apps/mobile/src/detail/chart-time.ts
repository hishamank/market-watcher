import type { Bar, Range, Session } from "@mini/contracts";
import { formatMarketDate, formatMarketDateTime, formatMarketTime } from "@mini/core";

export function formatScrubTime(range: Range, epochMs: number): string {
  if (range === "1D") return formatMarketTime(epochMs);
  if (range === "1W" || range === "1M") return formatMarketDateTime(epochMs);
  return formatMarketDate(epochMs, { includeYear: true });
}

function formatAxisTime(range: Range, epochMs: number): string {
  if (range === "1D") return formatMarketTime(epochMs, { label: false });
  return formatMarketDate(epochMs, { includeYear: range === "1Y" || range === "5Y" });
}

function axisTimes(bars: readonly Bar[], session: Session | undefined): number[] {
  if (session !== undefined) {
    return [session.open, Math.round((session.open + session.close) / 2), session.close];
  }
  const first = bars[0];
  const last = bars.at(-1);
  if (first === undefined || last === undefined) return [];
  return [first.time, bars[Math.floor((bars.length - 1) / 2)]?.time ?? first.time, last.time];
}

export function axisLabels(range: Range, bars: readonly Bar[], session: Session | undefined) {
  return axisTimes(bars, session).map((time) => formatAxisTime(range, time));
}
