import { cancelTimeout, scheduleTimeout, type TimerHandle } from "./timers.ts";

export const MIN_FLUSH_GAP_MS = 200;
export const RATE_LIMIT_PAUSE_MS = 1_000;

export interface PacedFlush {
  schedule(): void;
  runWhenAllowed(): void;
  runNow(): void;
  holdFor(ms: number): void;
  reset(): void;
}

export function createPacedFlush(flush: () => boolean): PacedFlush {
  let timer: TimerHandle | null = null;
  let lastFlushAt = Number.NEGATIVE_INFINITY;
  let notBefore = Number.NEGATIVE_INFINITY;

  function clearTimer(): void {
    if (timer !== null) {
      cancelTimeout(timer);
      timer = null;
    }
  }

  function runNow(): void {
    clearTimer();
    if (flush()) lastFlushAt = Date.now();
  }

  const waitMs = () =>
    Math.max(0, lastFlushAt + MIN_FLUSH_GAP_MS - Date.now(), notBefore - Date.now());

  function schedule(): void {
    if (timer !== null) return;
    timer = scheduleTimeout(() => {
      timer = null;
      runNow();
    }, waitMs());
  }

  function runWhenAllowed(): void {
    if (waitMs() === 0) runNow();
    else schedule();
  }

  return {
    schedule,
    runWhenAllowed,
    runNow,
    holdFor(ms) {
      notBefore = Math.max(notBefore, Date.now() + ms);
      if (timer !== null) {
        clearTimer();
        schedule();
      }
    },
    reset() {
      clearTimer();
      lastFlushAt = Number.NEGATIVE_INFINITY;
      notBefore = Number.NEGATIVE_INFINITY;
    },
  };
}
