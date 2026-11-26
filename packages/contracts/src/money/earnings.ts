import type { EarningsQuarter } from "../earnings.ts";
import { toUnits } from "./money.ts";
import { divideRounded, parseExact, rescale, toPlain } from "./decimal.ts";
import { formatPrice } from "./format.ts";

export function earningsBarGeometry(quarters: readonly EarningsQuarter[]) {
  const amounts = quarters
    .flatMap((quarter) => [quarter.actual, quarter.estimate])
    .filter((amount) => amount !== null)
    .map(toUnits);
  const low = amounts.reduce((min, value) => (value < min ? value : min), 0n);
  const high = amounts.reduce((max, value) => (value > max ? value : max), 0n);
  const span = high - low;
  const zero = span === 0n ? 50 : Number(divideRounded(-low * 10_000n, span)) / 100;
  const bar = (amount: string | null) => {
    if (amount === null) return null;
    const value = toUnits(amount);
    if (span === 0n) return { bottom: zero, height: 0 };
    return {
      bottom: value < 0n ? Number(divideRounded((value - low) * 10_000n, span)) / 100 : zero,
      height: Number(divideRounded((value < 0n ? -value : value) * 10_000n, span)) / 100,
    };
  };
  return {
    zero,
    bars: quarters.map((quarter) => ({
      actual: bar(quarter.actual),
      estimate: bar(quarter.estimate),
    })),
  };
}

export function formatEarningsPerShare(value: string): string {
  return formatPrice(toPlain(rescale(parseExact(value), 2), 2));
}
