"use client";

import type { HistoryFailureRate } from "@mini/contracts";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import type { ChaosSnapshot } from "../realtime/chaos-state-store.ts";
import { cancelInterval, scheduleInterval } from "../realtime/timers.ts";

export interface ChaosToggleView {
  readonly enabled: boolean;
  readonly secondsLeft: number | null;
}

export interface ChaosFailureRateView {
  readonly rate: HistoryFailureRate;
  readonly secondsLeft: number | null;
}

export interface ChaosControlsResult {
  readonly tickSpike: ChaosToggleView;
  readonly historyLatency: ChaosToggleView;
  readonly historyFailureRate: ChaosFailureRateView;
  readonly forceClosed: ChaosToggleView;
  readonly dropConnection: () => void;
  readonly freezeFeed: () => void;
  readonly setTickSpike: (enabled: boolean) => void;
  readonly setHistoryLatency: (enabled: boolean) => void;
  readonly setHistoryFailureRate: (rate: HistoryFailureRate) => void;
  readonly setForceClosed: (enabled: boolean) => void;
}

function getServerSnapshot(): ChaosSnapshot | null {
  return null;
}

function secondsLeftFor(
  revertsAt: number | null,
  snapshot: ChaosSnapshot | null,
  nowMs: number,
): number | null {
  if (revertsAt === null || snapshot === null) {
    return null;
  }
  const elapsedMs = Math.max(0, nowMs - snapshot.receivedAt);
  const remainingMs = Math.max(0, revertsAt - snapshot.serverTime - elapsedMs);
  return Math.ceil(remainingMs / 1_000);
}

function hasActiveCountdown(snapshot: ChaosSnapshot | null): boolean {
  if (snapshot === null) {
    return false;
  }
  return (
    snapshot.tickSpike.revertsAt !== null ||
    snapshot.historyLatency.revertsAt !== null ||
    snapshot.historyFailureRate.revertsAt !== null ||
    snapshot.forceClosed.revertsAt !== null
  );
}

export function useChaosControls(): ChaosControlsResult {
  const { socketClient } = useCore();
  const [nowMs, setNowMs] = useState(0);

  const subscribe = useCallback(
    (listener: () => void) => socketClient.subscribeChaosState(listener),
    [socketClient],
  );
  const getSnapshot = useCallback(() => socketClient.getChaosState(), [socketClient]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const active = hasActiveCountdown(snapshot);
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = scheduleInterval(() => setNowMs(Date.now()), 1_000);
    return () => cancelInterval(timer);
  }, [active]);

  const dropConnection = useCallback(() => {
    socketClient.send({ type: "chaos", action: "drop" });
  }, [socketClient]);

  const freezeFeed = useCallback(() => {
    socketClient.send({ type: "chaos", action: "freeze", enabled: true });
  }, [socketClient]);

  const setTickSpike = useCallback(
    (enabled: boolean) => {
      socketClient.send({ type: "chaos", action: "tick_spike", enabled });
    },
    [socketClient],
  );

  const setHistoryLatency = useCallback(
    (enabled: boolean) => {
      socketClient.send({ type: "chaos", action: "history_latency", enabled });
    },
    [socketClient],
  );

  const setHistoryFailureRate = useCallback(
    (rate: HistoryFailureRate) => {
      socketClient.send({ type: "chaos", action: "history_failure_rate", rate });
    },
    [socketClient],
  );

  const setForceClosed = useCallback(
    (enabled: boolean) => {
      socketClient.send({ type: "chaos", action: "force_closed", enabled });
    },
    [socketClient],
  );

  return {
    tickSpike: {
      enabled: snapshot?.tickSpike.enabled ?? false,
      secondsLeft: secondsLeftFor(snapshot?.tickSpike.revertsAt ?? null, snapshot, nowMs),
    },
    historyLatency: {
      enabled: snapshot?.historyLatency.enabled ?? false,
      secondsLeft: secondsLeftFor(snapshot?.historyLatency.revertsAt ?? null, snapshot, nowMs),
    },
    historyFailureRate: {
      rate: snapshot?.historyFailureRate.rate ?? 0,
      secondsLeft: secondsLeftFor(snapshot?.historyFailureRate.revertsAt ?? null, snapshot, nowMs),
    },
    forceClosed: {
      enabled: snapshot?.forceClosed.enabled ?? false,
      secondsLeft: secondsLeftFor(snapshot?.forceClosed.revertsAt ?? null, snapshot, nowMs),
    },
    dropConnection,
    freezeFeed,
    setTickSpike,
    setHistoryLatency,
    setHistoryFailureRate,
    setForceClosed,
  };
}
