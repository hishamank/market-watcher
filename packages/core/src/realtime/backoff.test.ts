import { describe, expect, it } from "vitest";
import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  computeBackoffCeiling,
  computeBackoffDelay,
} from "../index.ts";

describe("backoff", () => {
  it("grows exponentially from 0.5 s and caps at 30 s", () => {
    expect(BACKOFF_BASE_MS).toBe(500);
    expect(BACKOFF_MAX_MS).toBe(30_000);
    expect(computeBackoffCeiling(0)).toBe(500);
    expect(computeBackoffCeiling(1)).toBe(1_000);
    expect(computeBackoffCeiling(2)).toBe(2_000);
    expect(computeBackoffCeiling(3)).toBe(4_000);
    expect(computeBackoffCeiling(4)).toBe(8_000);
    expect(computeBackoffCeiling(5)).toBe(16_000);
    expect(computeBackoffCeiling(6)).toBe(30_000);
    expect(computeBackoffCeiling(7)).toBe(30_000);
    expect(computeBackoffCeiling(100)).toBe(30_000);
    expect(computeBackoffCeiling(-3)).toBe(500);
  });

  it("applies full jitter bounded between 0 and the attempt ceiling", () => {
    expect(computeBackoffDelay(0, () => 0)).toBe(0);
    expect(computeBackoffDelay(0, () => 0.5)).toBe(250);
    expect(computeBackoffDelay(0, () => 1)).toBe(500);
    expect(computeBackoffDelay(6, () => 1)).toBe(30_000);
    expect(computeBackoffDelay(6, () => 0.5)).toBe(15_000);
    expect(computeBackoffDelay(6, () => -1)).toBe(0);
    expect(computeBackoffDelay(6, () => 2)).toBe(30_000);
  });

  it("spreads delays across the jitter range with Math.random", () => {
    const samples = new Set<number>();
    for (let i = 0; i < 64; i += 1) {
      const delay = computeBackoffDelay(4);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(8_000);
      samples.add(delay);
    }
    expect(samples.size).toBeGreaterThan(10);
  });
});
