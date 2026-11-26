import { fromUnits, roundToDisplay } from "@mini/contracts";
import {
  combineHash,
  expFixed,
  floorDivBig,
  hashString64,
  LOG_SCALE,
  normalScaled,
} from "./math.ts";

export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

const MACRO_LEVELS = 11;
const MACRO_SPAN = 1n << BigInt(MACRO_LEVELS);
const INTRADAY_LEVELS = 20;
const INTRADAY_SLOTS = 1n << BigInt(INTRADAY_LEVELS);
const DAY_MS_BIG = BigInt(DAY_MS);

const ANCHOR_STD = 350_000_000n;
const MIN_DAILY_VOL = 18_000_000n;
const EXTRA_DAILY_VOL = 18_000_000n;
const MIN_DEFAULT_BASE_UNITS = 150_000n;
const EXTRA_DEFAULT_BASE_UNITS = 4_350_000n;

const TAG_ANCHOR = 1n;
const TAG_DAILY = 2n;
const TAG_INTRADAY = 3n;
const TAG_VOL = 4n;
const TAG_BASE = 5n;

const DAILY_SQRT_HALF_MILLIS = [
  707n,
  1000n,
  1414n,
  2000n,
  2828n,
  4000n,
  5657n,
  8000n,
  11314n,
  16000n,
  22627n,
] as const;

const INTRADAY_DIVISORS = [
  2000n,
  2828n,
  4000n,
  5657n,
  8000n,
  11314n,
  16000n,
  22627n,
  32000n,
  45255n,
  64000n,
  90510n,
  128000n,
  181019n,
  256000n,
  362039n,
  512000n,
  724077n,
  1024000n,
  1448155n,
] as const;

function symbolKey(seed: string, symbol: string): bigint {
  return hashString64(symbol, hashString64(seed));
}

function dailyVolatility(key: bigint): bigint {
  const hash = combineHash(key, TAG_VOL, 0n, 0n);
  return MIN_DAILY_VOL + (hash % (EXTRA_DAILY_VOL + 1n));
}

function defaultBaseUnits(symbol: string): bigint {
  const hash = combineHash(hashString64(symbol), TAG_BASE, 0n, 0n);
  return MIN_DEFAULT_BASE_UNITS + (hash % (EXTRA_DEFAULT_BASE_UNITS + 1n));
}

function dailyLogOffset(key: bigint, vol: bigint, dayIndex: bigint): bigint {
  const block = floorDivBig(dayIndex, MACRO_SPAN);
  let leftDay = block * MACRO_SPAN;
  let vLeft = normalScaled(combineHash(key, TAG_ANCHOR, block, 0n), ANCHOR_STD);
  if (dayIndex === leftDay) return vLeft;
  let vRight = normalScaled(combineHash(key, TAG_ANCHOR, block + 1n, 0n), ANCHOR_STD);
  for (let level = MACRO_LEVELS - 1; level >= 0; level -= 1) {
    const halfSpan = 1n << BigInt(level);
    const midDay = leftDay + halfSpan;
    const scale = DAILY_SQRT_HALF_MILLIS[level] ?? 707n;
    const std = (vol * scale) / 1000n;
    const hash = combineHash(key, TAG_DAILY, BigInt(level), midDay);
    const vMid = (vLeft + vRight) / 2n + normalScaled(hash, std);
    if (dayIndex === midDay) return vMid;
    if (dayIndex < midDay) {
      vRight = vMid;
    } else {
      leftDay = midDay;
      vLeft = vMid;
    }
  }
  return vLeft;
}

function intradayLogOffset(key: bigint, vol: bigint, dayIndex: bigint, offsetMs: number): bigint {
  let vLo = dailyLogOffset(key, vol, dayIndex);
  if (offsetMs === 0) return vLo;
  let vHi = dailyLogOffset(key, vol, dayIndex + 1n);
  const scaled = BigInt(offsetMs) * INTRADAY_SLOTS;
  const slot = scaled / DAY_MS_BIG;
  const remainder = scaled % DAY_MS_BIG;
  let lo = 0n;
  let hi = INTRADAY_SLOTS;
  for (let level = 0; level < INTRADAY_LEVELS; level += 1) {
    const mid = (lo + hi) >> 1n;
    const divisor = INTRADAY_DIVISORS[level] ?? 1_448_155n;
    const std = (vol * 1000n) / divisor;
    const hash = combineHash(key, TAG_INTRADAY, (dayIndex << 8n) ^ BigInt(level), mid);
    const vMid = (vLo + vHi) / 2n + normalScaled(hash, std);
    if (slot < mid) {
      hi = mid;
      vHi = vMid;
    } else {
      lo = mid;
      vLo = vMid;
    }
  }
  return vLo + ((vHi - vLo) * remainder) / DAY_MS_BIG;
}

export function startOfUtcDay(timeMs: number): number {
  const floored = Math.floor(timeMs);
  return Math.floor(floored / DAY_MS) * DAY_MS;
}

export function startOfUtcWeek(timeMs: number): number {
  const dayIndex = Math.floor(Math.floor(timeMs) / DAY_MS);
  const offsetFromMonday = (((dayIndex + 3) % 7) + 7) % 7;
  return (dayIndex - offsetFromMonday) * DAY_MS;
}

export function priceUnitsAt(
  seed: string,
  symbol: string,
  timeMs: number,
  basePriceUnits?: bigint,
): bigint {
  const timestamp = Math.floor(timeMs);
  const dayStart = startOfUtcDay(timestamp);
  const dayIndex = BigInt(dayStart / DAY_MS);
  const offsetMs = timestamp - dayStart;
  const key = symbolKey(seed, symbol);
  const vol = dailyVolatility(key);
  const logOffset = intradayLogOffset(key, vol, dayIndex, offsetMs);
  const base = basePriceUnits ?? defaultBaseUnits(symbol);
  const rawUnits = (base * expFixed(logOffset) + LOG_SCALE / 2n) / LOG_SCALE;
  return rawUnits < 1n ? 1n : rawUnits;
}

export function displayPriceAt(
  seed: string,
  symbol: string,
  timeMs: number,
  basePriceUnits?: bigint,
): string {
  return roundToDisplay(fromUnits(priceUnitsAt(seed, symbol, timeMs, basePriceUnits)));
}
