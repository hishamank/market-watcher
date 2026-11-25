import type { MarketStatus, Session } from "@mini/contracts";
import type { MarketCalendar } from "../types.ts";
import { DAY_MS, startOfUtcDay } from "./price.ts";

export interface SimulatorCalendarHandle {
  readonly calendar: MarketCalendar;
  isForceClosed(): boolean;
  setForceClosed(closed: boolean): void;
}

export function createSimulatorCalendar(initialForceClosed = false): SimulatorCalendarHandle {
  let forceClosed = initialForceClosed;
  const listeners = new Set<(status: MarketStatus) => void>();

  const currentStatus = (): MarketStatus => (forceClosed ? "closed" : "open");

  const calendar: MarketCalendar = {
    status: () => currentStatus(),
    session: (now: number): Session => {
      const open = startOfUtcDay(now);
      return { open, close: open + DAY_MS };
    },
    onStatusChange: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  const setForceClosed = (closed: boolean): void => {
    if (forceClosed === closed) return;
    forceClosed = closed;
    const status = currentStatus();
    for (const listener of listeners) {
      listener(status);
    }
  };

  return {
    calendar,
    isForceClosed: () => forceClosed,
    setForceClosed,
  };
}
