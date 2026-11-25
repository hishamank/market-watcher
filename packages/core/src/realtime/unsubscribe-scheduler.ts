import { cancelTimeout, scheduleTimeout, type TimerHandle } from "./timers.ts";

export interface UnsubscribeScheduler {
  schedule(symbol: string): void;
  cancel(symbol: string): void;
  isPending(symbol: string): boolean;
  clear(): void;
}

export function createUnsubscribeScheduler(
  delayMs: number,
  onDue: (symbols: string[]) => void,
): UnsubscribeScheduler {
  const pendingUnsubAt = new Map<string, number>();
  let timer: TimerHandle | null = null;

  function clearTimer(): void {
    if (timer !== null) {
      cancelTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext(): void {
    clearTimer();
    if (pendingUnsubAt.size === 0) {
      return;
    }
    const earliest = Math.min(...pendingUnsubAt.values());
    timer = scheduleTimeout(flushDue, Math.max(0, earliest - Date.now()));
  }

  function flushDue(): void {
    timer = null;
    const now = Date.now();
    const due: string[] = [];
    for (const [symbol, deadline] of Array.from(pendingUnsubAt.entries())) {
      if (deadline <= now) {
        pendingUnsubAt.delete(symbol);
        due.push(symbol);
      }
    }
    if (due.length > 0) onDue(due);
    scheduleNext();
  }

  return {
    schedule(symbol) {
      if (pendingUnsubAt.has(symbol)) return;
      pendingUnsubAt.set(symbol, Date.now() + delayMs);
      scheduleNext();
    },
    cancel(symbol) {
      if (pendingUnsubAt.delete(symbol)) scheduleNext();
    },
    isPending: (symbol) => pendingUnsubAt.has(symbol),
    clear() {
      clearTimer();
      pendingUnsubAt.clear();
    },
  };
}
