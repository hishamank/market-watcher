"use client";

import { useEffect, useState } from "react";
import { useCore } from "../core-provider.tsx";
import type { ConnectionHealth as Counters } from "../realtime/connection-health.ts";
import {
  cancelInterval,
  cancelTimeout,
  scheduleInterval,
  scheduleTimeout,
} from "../realtime/timers.ts";

import type { SocketDiagnostics } from "../realtime/socket-diagnostics.ts";

export interface ConnectionHealth extends Counters {
  readonly diagnostics?: SocketDiagnostics;
}

export const HEALTH_REFRESH_MS = 1_000;

const BEFORE_HYDRATION: ConnectionHealth = {
  reconnects: 0,
  framesPerSecond: 0,
  latencyMs: null,
  skippedFrames: null,
};

export function useConnectionHealth(): ConnectionHealth {
  const { health, socketClient } = useCore();
  const [current, setCurrent] = useState<ConnectionHealth>(BEFORE_HYDRATION);

  useEffect(() => {
    const refresh = () =>
      setCurrent({ ...health.snapshot(), diagnostics: socketClient.getDiagnostics() });
    const first = scheduleTimeout(refresh, 0);
    const timer = scheduleInterval(refresh, HEALTH_REFRESH_MS);
    return () => {
      cancelTimeout(first);
      cancelInterval(timer);
    };
  }, [health, socketClient]);

  return current;
}
