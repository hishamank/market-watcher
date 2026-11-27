import type { RecoveryReason } from "./socket-diagnostics.ts";
import { encodeFrame, type ClientMessage } from "@mini/contracts";
import { computeBackoffDelay } from "./backoff.ts";
import { createSendBudget } from "./send-budget.ts";
import { cancelTimeout, scheduleTimeout, type TimerHandle } from "./timers.ts";
import { SOCKET_READY_STATE, type RealtimeSocket, type SocketFactory } from "./transport.ts";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 5_000;
const MISSED_HEARTBEATS_TO_STALE = 2;

export interface ManagedConnectionOptions {
  url: string;
  socketFactory: SocketFactory;
  random: () => number;
  isActive(): boolean;
  onRawFrame(data: unknown): void;
  onLinkLost(reason: RecoveryReason): void;
}

export interface ManagedConnection {
  queuedMessages(): number;
  open(): void;
  close(): void;
  isOpen(): boolean;
  send(message: ClientMessage): boolean;
  setHeartbeatInterval(ms: number): void;
  resetSilenceTimer(): void;
  scheduleReconnect(): void;
  cancelReconnect(): void;
  resetBackoff(): void;
}

export function createManagedConnection(options: ManagedConnectionOptions): ManagedConnection {
  let socket: RealtimeSocket | null = null;
  let silenceTimer: TimerHandle | null = null;
  let reconnectTimer: TimerHandle | null = null;
  let heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
  let reconnectAttempt = 0;
  const outbox = createSendBudget<ClientMessage>((message) => {
    if (socket?.readyState === SOCKET_READY_STATE.OPEN) socket.send(encodeFrame(message));
  });

  function clearSilenceTimer(): void {
    if (silenceTimer !== null) {
      cancelTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function cancelReconnect(): void {
    if (reconnectTimer !== null) {
      cancelTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function close(): void {
    clearSilenceTimer();
    outbox.clear();
    if (socket === null) {
      return;
    }
    const current = socket;
    socket = null;
    current.onopen = null;
    current.onmessage = null;
    current.onerror = null;
    current.onclose = null;
    try {
      current.close();
    } catch {}
  }

  function resetSilenceTimer(): void {
    clearSilenceTimer();
    silenceTimer = scheduleTimeout(() => {
      silenceTimer = null;
      options.onLinkLost("silence_timeout");
    }, heartbeatIntervalMs * MISSED_HEARTBEATS_TO_STALE);
  }

  function open(): void {
    close();
    cancelReconnect();
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
    const ws = options.socketFactory(options.url);
    socket = ws;
    ws.onopen = () => {
      if (socket === ws && options.isActive()) {
        resetSilenceTimer();
      }
    };
    ws.onmessage = (event) => {
      if (socket === ws && options.isActive()) {
        options.onRawFrame(event.data);
      }
    };
    ws.onerror = () => {
      if (socket === ws && options.isActive()) {
        options.onLinkLost("socket_error");
      }
    };
    ws.onclose = () => {
      if (socket === ws && options.isActive()) {
        options.onLinkLost("socket_closed");
      }
    };
    resetSilenceTimer();
  }

  function send(message: ClientMessage): boolean {
    if (socket === null || socket.readyState !== SOCKET_READY_STATE.OPEN) {
      return false;
    }
    outbox.enqueue(message);
    return true;
  }

  function scheduleReconnect(): void {
    cancelReconnect();
    if (!options.isActive()) {
      return;
    }
    const delayMs = computeBackoffDelay(reconnectAttempt, options.random);
    reconnectAttempt += 1;
    reconnectTimer = scheduleTimeout(() => {
      reconnectTimer = null;
      if (options.isActive()) {
        open();
      }
    }, delayMs);
  }

  return {
    queuedMessages: outbox.size,
    open,
    close,
    isOpen: () => socket !== null && socket.readyState === SOCKET_READY_STATE.OPEN,
    send,
    setHeartbeatInterval(ms) {
      heartbeatIntervalMs = ms;
      resetSilenceTimer();
    },
    resetSilenceTimer,
    scheduleReconnect,
    cancelReconnect,
    resetBackoff() {
      reconnectAttempt = 0;
    },
  };
}
