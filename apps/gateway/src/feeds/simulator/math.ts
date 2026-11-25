export const LOG_SCALE = 1_000_000_000n;

const MASK_64 = 0xffff_ffff_ffff_ffffn;
const FNV_OFFSET_64 = 0xcbf2_9ce4_8422_2325n;
const FNV_PRIME_64 = 0x1000_0000_01b3n;
const SPLITMIX_INC = 0x9e37_79b9_7f4a_7c15n;
const SPLITMIX_M1 = 0xbf58_476d_1ce4_e5b9n;
const SPLITMIX_M2 = 0x94d0_49bb_1331_11ebn;
const MAX_LOG_OFFSET = 2_200_000_000n;
const IRWIN_HALL_STD = 75_674n;

export function mix64(input: bigint): bigint {
  let z = (input + SPLITMIX_INC) & MASK_64;
  z = ((z ^ (z >> 30n)) * SPLITMIX_M1) & MASK_64;
  z = ((z ^ (z >> 27n)) * SPLITMIX_M2) & MASK_64;
  return (z ^ (z >> 31n)) & MASK_64;
}

export function hashString64(text: string, basis: bigint = FNV_OFFSET_64): bigint {
  let hash = basis;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash ^ BigInt(text.charCodeAt(i))) * FNV_PRIME_64) & MASK_64;
  }
  return mix64(hash);
}

export function combineHash(a: bigint, b: bigint, c: bigint, d: bigint): bigint {
  let h = mix64(a ^ mix64(b));
  h = mix64(h ^ mix64(c));
  return mix64(h ^ mix64(d));
}

export function normalScaled(hash: bigint, std: bigint): bigint {
  const c0 = hash & 0xffffn;
  const c1 = (hash >> 16n) & 0xffffn;
  const c2 = (hash >> 32n) & 0xffffn;
  const c3 = (hash >> 48n) & 0xffffn;
  const centered = 2n * (c0 + c1 + c2 + c3) - 262_140n;
  return (centered * std) / IRWIN_HALL_STD;
}

export function floorDivBig(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder < 0n ? quotient - 1n : quotient;
}

function clampLog(value: bigint): bigint {
  if (value > MAX_LOG_OFFSET) return MAX_LOG_OFFSET;
  if (value < -MAX_LOG_OFFSET) return -MAX_LOG_OFFSET;
  return value;
}

export function expFixed(scaledLog: bigint): bigint {
  const x = clampLog(scaledLog) / 8n;
  let sum = LOG_SCALE;
  let term = LOG_SCALE;
  for (let k = 1n; k <= 10n; k += 1n) {
    term = (term * x) / (LOG_SCALE * k);
    sum += term;
  }
  let result = sum;
  for (let i = 0; i < 3; i += 1) {
    result = (result * result) / LOG_SCALE;
  }
  return result;
}
