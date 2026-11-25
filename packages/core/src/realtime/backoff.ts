export const BACKOFF_BASE_MS = 500;
export const BACKOFF_MAX_MS = 30_000;

const MAX_EXPONENT = 30;

export function computeBackoffCeiling(
  attempt: number,
  baseMs = BACKOFF_BASE_MS,
  maxMs = BACKOFF_MAX_MS,
): number {
  const exponent = Math.max(0, Math.min(Math.floor(attempt), MAX_EXPONENT));
  const scaled = baseMs * 2 ** exponent;
  return Math.min(maxMs, scaled);
}

export function computeBackoffDelay(
  attempt: number,
  random: () => number = Math.random,
  baseMs = BACKOFF_BASE_MS,
  maxMs = BACKOFF_MAX_MS,
): number {
  const ceiling = computeBackoffCeiling(attempt, baseMs, maxMs);
  const sample = Math.min(1, Math.max(0, random()));
  return Math.round(sample * ceiling);
}
