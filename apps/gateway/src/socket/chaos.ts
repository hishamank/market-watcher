import type {
  ChaosMessage,
  ChaosScope,
  ChaosStateMessage,
  HistoryFailureRate,
  ServerMessage,
} from "@mini/contracts";
import type { Feed } from "../feeds/types.ts";
import { CHAOS_REVERT_MS } from "../hub/limits.ts";
import type { Peer } from "../hub/member.ts";
import {
  asSettingsTarget,
  buildSnapshot,
  type ChaosState,
  initialState,
  type SimulatorSettingsTarget,
  TOGGLE_SPECS,
  type ToggleKey,
  toSimulatorRate,
} from "./chaos-state.ts";

export type GlobalChaosMessage = Exclude<ChaosMessage, { action: "drop" | "freeze" }>;

type GlobalControlKey = GlobalChaosMessage["action"];

export interface ChaosControllerOptions {
  feed: Feed;
  now: () => number;
  broadcast: (message: ServerMessage) => void;
  scope?: ChaosScope;
  revertMs?: number;
}

export interface ChaosController {
  readonly scope: ChaosScope;
  apply(message: GlobalChaosMessage): void;
  sendState(peer: Peer): void;
  snapshot(): ChaosStateMessage;
  close(): void;
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
  if (ctx.state[field].revertsAt !== null) {
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
  const revertsAt =
    ctx.state.historyFailureRate.revertsAt ??
    ctx.scheduleRevert("history_failure_rate", () => {
      ctx.state.historyFailureRate = { rate: 0, revertsAt: null };
      ctx.target?.updateSettings({ historyFailureRate: 0 });
    });
  ctx.state.historyFailureRate = { rate, revertsAt };
  ctx.target?.updateSettings({ historyFailureRate: toSimulatorRate(rate) });
}

export function createChaosController(options: ChaosControllerOptions): ChaosController {
  const target = asSettingsTarget(options.feed);
  const scope = options.scope ?? "global";
  const revertMs = options.revertMs ?? CHAOS_REVERT_MS;
  const state = initialState(target);
  const timers = new Map<GlobalControlKey, ReturnType<typeof setTimeout>>();
  let closed = false;

  const snapshot = (): ChaosStateMessage => buildSnapshot(state, scope, options.now());

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
    scope,
    apply(message) {
      if (closed || scope !== "global") return;
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
