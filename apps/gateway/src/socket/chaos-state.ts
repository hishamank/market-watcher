import type {
  ChaosFailureRateState,
  ChaosScope,
  ChaosStateMessage,
  ChaosToggleState,
  HistoryFailureRate,
} from "@mini/contracts";
import type { SimulatorChaosSettings, SimulatorFailureRate } from "../feeds/simulator/index.ts";
import type { Feed } from "../feeds/types.ts";
import { CHAOS_HISTORY_LATENCY_MS, CHAOS_TICK_SPIKE_MULTIPLIER } from "../hub/limits.ts";

export type ToggleKey = "tick_spike" | "history_latency" | "force_closed";
type ToggleField = "tickSpike" | "historyLatency" | "forceClosed";

export interface SimulatorSettingsTarget {
  getSettings(): Readonly<SimulatorChaosSettings>;
  updateSettings(patch: Partial<SimulatorChaosSettings>): void;
}

export interface ChaosState {
  tickSpike: ChaosToggleState;
  historyLatency: ChaosToggleState;
  historyFailureRate: ChaosFailureRateState;
  forceClosed: ChaosToggleState;
}

interface ToggleSpec {
  readonly field: ToggleField;
  readonly onPatch: Partial<SimulatorChaosSettings>;
  readonly offPatch: Partial<SimulatorChaosSettings>;
}

export const TOGGLE_SPECS: Record<ToggleKey, ToggleSpec> = {
  tick_spike: {
    field: "tickSpike",
    onPatch: { tickRateMultiplier: CHAOS_TICK_SPIKE_MULTIPLIER },
    offPatch: { tickRateMultiplier: 1 },
  },
  history_latency: {
    field: "historyLatency",
    onPatch: { historyLatencyMs: CHAOS_HISTORY_LATENCY_MS },
    offPatch: { historyLatencyMs: 0 },
  },
  force_closed: {
    field: "forceClosed",
    onPatch: { forceClosed: true },
    offPatch: { forceClosed: false },
  },
};

export function asSettingsTarget(feed: Feed): SimulatorSettingsTarget | null {
  const candidate = feed as Partial<SimulatorSettingsTarget>;
  return typeof candidate.updateSettings === "function" &&
    typeof candidate.getSettings === "function"
    ? (candidate as SimulatorSettingsTarget)
    : null;
}

export const toSimulatorRate = (rate: HistoryFailureRate): SimulatorFailureRate =>
  rate === 50 ? 0.5 : rate === 100 ? 1 : 0;

const fromSimulatorRate = (rate: SimulatorFailureRate): HistoryFailureRate =>
  rate === 0.5 ? 50 : rate === 1 ? 100 : 0;

export function initialState(target: SimulatorSettingsTarget | null): ChaosState {
  const initial = target?.getSettings();
  return {
    tickSpike: { enabled: (initial?.tickRateMultiplier ?? 1) > 1, revertsAt: null },
    historyLatency: { enabled: (initial?.historyLatencyMs ?? 0) > 0, revertsAt: null },
    historyFailureRate: {
      rate: initial ? fromSimulatorRate(initial.historyFailureRate) : 0,
      revertsAt: null,
    },
    forceClosed: { enabled: initial?.forceClosed ?? false, revertsAt: null },
  };
}

export function buildSnapshot(
  state: ChaosState,
  scope: ChaosScope,
  serverTime: number,
): ChaosStateMessage {
  return {
    type: "chaos_state",
    serverTime,
    scope,
    tickSpike: { ...state.tickSpike },
    historyLatency: { ...state.historyLatency },
    historyFailureRate: { ...state.historyFailureRate },
    forceClosed: { ...state.forceClosed },
  };
}
