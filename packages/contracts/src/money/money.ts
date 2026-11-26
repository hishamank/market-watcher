import { divideRounded, parseExact, rescale, toPlain } from "./decimal.ts";

export const UNITS_PER_DOLLAR = 10_000n;
const UNIT_SCALE = 4;
const PERCENT_SCALE = 2;

export type DisplayDecimals = 2 | 4;

export type Change = { readonly change: string; readonly changePercent: string };

export function toUnits(decimal: string): bigint {
  return rescale(parseExact(decimal), UNIT_SCALE);
}

export function fromUnits(units: bigint): string {
  return toPlain(units, UNIT_SCALE);
}

export function subtract(minuend: string, subtrahend: string): string {
  return fromUnits(toUnits(minuend) - toUnits(subtrahend));
}

export function percentChange(from: string, to: string): string {
  const base = toUnits(from);
  if (base === 0n) {
    throw new RangeError("Percent change from zero is undefined");
  }
  const hundredths = divideRounded((toUnits(to) - base) * 10_000n, base);
  return toPlain(hundredths, PERCENT_SCALE);
}

export function displayDecimals(price: string): DisplayDecimals {
  const units = toUnits(price);
  const magnitude = units < 0n ? -units : units;
  return magnitude >= UNITS_PER_DOLLAR ? 2 : 4;
}

export function roundToDisplay(value: string, price: string = value): string {
  const decimals = displayDecimals(price);
  return toPlain(rescale(parseExact(value), decimals), decimals);
}

export function roundPercent(value: string): string {
  return toPlain(rescale(parseExact(value), PERCENT_SCALE), PERCENT_SCALE);
}

export function changeBetween(from: string, to: string): Change {
  return {
    change: roundToDisplay(subtract(to, from), to),
    changePercent: percentChange(from, to),
  };
}

export type PriceRange = { readonly low: string; readonly high: string };

export function widenRange(range: PriceRange | undefined, price: string): PriceRange {
  if (range === undefined) {
    return { low: price, high: price };
  }
  if (rangeHolds(range, price)) {
    return range;
  }
  return toUnits(price) < toUnits(range.low)
    ? { low: price, high: range.high }
    : { low: range.low, high: price };
}

export function rangeHolds(range: PriceRange, price: string): boolean {
  const units = toUnits(price);
  return toUnits(range.low) <= units && units <= toUnits(range.high);
}

export function joinRanges(first: PriceRange, second: PriceRange): PriceRange {
  return widenRange(widenRange(first, second.low), second.high);
}
