import type {
  ChaosFailureRateState,
  ChaosMessage,
  ChaosStateMessage,
  ChaosToggleState,
  HistoryFailureRate,
  ServerMessage,
} from "@mini/contracts";
import type { SimulatorChaosSettings, SimulatorFailureRate } from "../feeds/simulator/index.ts";
import type { Feed } from "../feeds/types.ts";
import {
  CHAOS_HISTORY_LATENCY_MS,
  CHAOS_REVERT_MS,
  CHAOS_TICK_SPIKE_MULTIPLIER,
} from "../hub/limits.ts";
import type { Peer } from "../hub/member.ts";

export type GlobalChaosMessage = Exclude<ChaosMessage, { action: "drop" | "freeze" }>;

type GlobalControlKey = GlobalChaosMessage["action"];
type ToggleKey = "tick_spike" | "history_latency" | "force_closed";
type ToggleField = "tickSpike" | "historyLatency" | "forceClosed";

interface SimulatorSettingsTarget {
  getSettings(): Readonly<SimulatorChaosSettings>;
  updateSettings(patch: Partial<SimulatorChaosSettings>): void;
}

interface ChaosState {
  tickSpike: ChaosToggleState;
  historyLatency: ChaosToggleState;
  historyFailureRate: ChaosFailureRateState;
  forceClosed: ChaosToggleState;
}

export interface ChaosControllerOptions {
  feed: Feed;
  now: () => number;
  broadcast: (message: ServerMessage) => void;
  revertMs?: number;
}

export interface ChaosController {
  apply(message: GlobalChaosMessage): void;
  sendState(peer: Peer): void;
  snapshot(): ChaosStateMessage;
  close(): void;
}

interface ToggleSpec {
  readonly field: ToggleField;
  readonly onPatch: Partial<SimulatorChaosSettings>;
  readonly offPatch: Partial<SimulatorChaosSettings>;
}

const TOGGLE_SPECS: Record<ToggleKey, ToggleSpec> = {
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

function asSettingsTarget(feed: Feed): SimulatorSettingsTarget | null {
  const candidate = feed as Partial<SimulatorSettingsTarget>;
  return typeof candidate.updateSettings === "function" &&
    typeof candidate.getSettings === "function"
    ? (candidate as SimulatorSettingsTarget)
    : null;
}

const toSimulatorRate = (rate: HistoryFailureRate): SimulatorFailureRate =>
  rate === 50 ? 0.5 : rate === 100 ? 1 : 0;

const fromSimulatorRate = (rate: SimulatorFailureRate): HistoryFailureRate =>
  rate === 0.5 ? 50 : rate === 1 ? 100 : 0;

function initialState(target: SimulatorSettingsTarget | null): ChaosState {
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

function buildSnapshot(state: ChaosState, serverTime: number): ChaosStateMessage {
  return {
    type: "chaos_state",
    serverTime,
    tickSpike: { ...state.tickSpike },
    historyLatency: { ...state.historyLatency },
    historyFailureRate: { ...state.historyFailureRate },
    forceClosed: { ...state.forceClosed },
  };
}

interface ApplyContext {
  state: ChaosState;
  target: SimulatorSettingsTarget | null;
  clearTimer: (key: GlobalControlKey) => void;
  scheduleRevert: (key: GlobalControlKey, onRevert: () => void) => number;
}

function applyToggle(ctx: ApplyContext, key: ToggleKey, enabled: boolean): void {
  const { field, onPatch, offPatch } = TOGGLE_SPECS[key];
  if (!enabled) {
    ctx.clearTimer(key);
    ctx.state[field] = { enabled: false, revertsAt: null };
    ctx.target?.updateSettings(offPatch);
    return;
  }
  const revertsAt = ctx.scheduleRevert(key, () => {
    ctx.state[field] = { enabled: false, revertsAt: null };
    ctx.target?.updateSettings(offPatch);
  });
  ctx.state[field] = { enabled: true, revertsAt };
  ctx.target?.updateSettings(onPatch);
}

function applyFailureRate(ctx: ApplyContext, rate: HistoryFailureRate): void {
  if (rate === 0) {
    ctx.clearTimer("history_failure_rate");
    ctx.state.historyFailureRate = { rate: 0, revertsAt: null };
    ctx.target?.updateSettings({ historyFailureRate: 0 });
    return;
  }
  const revertsAt = ctx.scheduleRevert("history_failure_rate", () => {
    ctx.state.historyFailureRate = { rate: 0, revertsAt: null };
    ctx.target?.updateSettings({ historyFailureRate: 0 });
  });
  ctx.state.historyFailureRate = { rate, revertsAt };
  ctx.target?.updateSettings({ historyFailureRate: toSimulatorRate(rate) });
}

export function createChaosController(options: ChaosControllerOptions): ChaosController {
  const target = asSettingsTarget(options.feed);
  const revertMs = options.revertMs ?? CHAOS_REVERT_MS;
  const state = initialState(target);
  const timers = new Map<GlobalControlKey, ReturnType<typeof setTimeout>>();
  let closed = false;

  const snapshot = (): ChaosStateMessage => buildSnapshot(state, options.now());

  const clearTimer = (key: GlobalControlKey): void => {
    const existing = timers.get(key);
    if (existing !== undefined) {
      clearTimeout(existing);
      timers.delete(key);
    }
  };

  const scheduleRevert = (key: GlobalControlKey, onRevert: () => void): number => {
    clearTimer(key);
    const revertsAt = options.now() + revertMs;
    const handle = setTimeout(() => {
      timers.delete(key);
      if (closed) return;
      onRevert();
      options.broadcast(snapshot());
    }, revertMs);
    timers.set(key, handle);
    return revertsAt;
  };

  const ctx: ApplyContext = { state, target, clearTimer, scheduleRevert };

  return {
    apply(message) {
      if (closed) return;
      if (message.action === "history_failure_rate") {
        applyFailureRate(ctx, message.rate);
      } else {
        applyToggle(ctx, message.action, message.enabled);
      }
      options.broadcast(snapshot());
    },
    sendState: (peer) => peer.send(snapshot()),
    snapshot,
    close() {
      closed = true;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    },
  };
}
