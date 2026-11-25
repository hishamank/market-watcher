import type { Quote } from "@mini/contracts";

export const HEALTH_WINDOW_MS = 5_000;

export interface ConnectionHealth {
  readonly reconnects: number;
  readonly framesPerSecond: number;
  readonly latencyMs: number | null;
  readonly skippedFrames: number | null;
}

export interface ConnectionHealthRecorder {
  welcome(serverTime: number): void;
  quotes(quotes: readonly Quote[]): void;
  heartbeat(serverTime: number, skippedFrames: number | undefined): void;
  reconnect(): void;
  snapshot(): ConnectionHealth;
}

interface FrameSample {
  readonly at: number;
  readonly latencyMs: number;
}

function meanLatency(quotes: readonly Quote[], serverNow: number): number {
  const total = quotes.reduce((sum, quote) => sum + Math.max(0, serverNow - quote.timestamp), 0);
  return quotes.length === 0 ? 0 : total / quotes.length;
}

export function createConnectionHealth(
  now: () => number = () => Date.now(),
): ConnectionHealthRecorder {
  let reconnects = 0;
  let skippedFrames: number | null = null;
  let clockOffsetMs = 0;
  let frames: FrameSample[] = [];

  const recent = (at: number) => frames.filter((frame) => at - frame.at < HEALTH_WINDOW_MS);

  return {
    welcome(serverTime) {
      clockOffsetMs = serverTime - now();
      skippedFrames = null;
    },
    quotes(quotes) {
      const at = now();
      frames = recent(at);
      frames.push({ at, latencyMs: meanLatency(quotes, at + clockOffsetMs) });
    },
    heartbeat(serverTime, next) {
      clockOffsetMs = Math.max(clockOffsetMs, serverTime - now());
      if (next !== undefined) skippedFrames = next;
    },
    reconnect() {
      reconnects += 1;
    },
    snapshot() {
      const current = recent(now());
      const latency = current.reduce((sum, frame) => sum + frame.latencyMs, 0);
      return {
        reconnects,
        framesPerSecond: Math.round((current.length * 10_000) / HEALTH_WINDOW_MS) / 10,
        latencyMs: current.length === 0 ? null : Math.round(latency / current.length),
        skippedFrames,
      };
    },
  };
}
