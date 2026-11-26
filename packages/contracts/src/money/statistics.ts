import { divideRounded, parseExact, rescale, toPlain } from "./decimal.ts";
import { toUnits, type PriceRange } from "./money.ts";

export function formatCompactAmount(value: string): string {
  const units = toUnits(value);
  const scales = [
    [10_000_000_000_000_000n, "T"],
    [10_000_000_000_000n, "B"],
    [10_000_000_000n, "M"],
    [10_000_000n, "K"],
  ] as const;
  for (const [scale, suffix] of scales) {
    if (units >= scale) return `${toPlain(divideRounded(units * 100n, scale), 2)}${suffix}`;
  }
  return toPlain(rescale(parseExact(value), 2), 2);
}

export function ratioToPercent(value: string): string {
  const decimal = parseExact(value);
  return toPlain(rescale({ digits: decimal.digits * 100n, scale: decimal.scale }, 2), 2);
}

export function positionInRange(range: PriceRange, price: string): number | null {
  const low = toUnits(range.low);
  const span = toUnits(range.high) - low;
  if (span <= 0n) return null;
  const percent = divideRounded((toUnits(price) - low) * 10_000n, span);
  return Number(percent < 0n ? 0n : percent > 10_000n ? 10_000n : percent) / 100;
}
