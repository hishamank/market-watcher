export type TimerHandle = unknown;

interface GlobalRuntime {
  setTimeout: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
  setInterval: (callback: () => void, intervalMs: number) => TimerHandle;
  clearInterval: (handle: TimerHandle) => void;
  console?: {
    warn?: (...args: unknown[]) => void;
  };
}

function getGlobalRuntime(): GlobalRuntime {
  return globalThis as unknown as GlobalRuntime;
}

export function scheduleTimeout(callback: () => void, delayMs: number): TimerHandle {
  return getGlobalRuntime().setTimeout(callback, delayMs);
}

export function cancelTimeout(handle: TimerHandle): void {
  getGlobalRuntime().clearTimeout(handle);
}

export function scheduleInterval(callback: () => void, intervalMs: number): TimerHandle {
  return getGlobalRuntime().setInterval(callback, intervalMs);
}

export function cancelInterval(handle: TimerHandle): void {
  getGlobalRuntime().clearInterval(handle);
}

export function logWarning(message: string, detail?: unknown): void {
  const warn = getGlobalRuntime().console?.warn;
  if (typeof warn === "function") {
    if (detail === undefined) {
      warn(message);
    } else {
      warn(message, detail);
    }
  }
}
