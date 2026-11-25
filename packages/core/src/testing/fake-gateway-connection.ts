import {
  encodeFrame,
  parseClientFrame,
  PROTOCOL_VERSION,
  type ClientMessage,
  type FeedMode,
  type MarketStatus,
  type Quote,
  type RequestId,
  type ServerMessage,
  type SymbolErrorCode,
  type WelcomeMessage,
} from "@mini/contracts";
import { cancelTimeout, scheduleTimeout, type TimerHandle } from "../realtime/timers.ts";
import { SOCKET_READY_STATE, type RealtimeSocket } from "../realtime/transport.ts";
import { answerSubscribe, createHeldReplies } from "./fake-gateway-replies.ts";
import type { FakeGatewayConnection } from "./fake-gateway-types.ts";

export interface GatewayConnectionConfig {
  url: string;
  heartbeatIntervalMs: number;
  maxSubscriptions: number;
  feedMode: FeedMode;
  marketStatus: MarketStatus;
  autoOpen: boolean;
  autoWelcome: boolean;
  autoSnapshot: boolean;
  holdReplies: boolean;
  quotes: ReadonlyMap<string, Quote>;
  unknownSet: ReadonlySet<string>;
}

export function createFakeGatewayConnection(
  config: GatewayConnectionConfig,
): FakeGatewayConnection {
  let readyState: number = SOCKET_READY_STATE.CONNECTING;
  let openTimer: TimerHandle | null = null;
  const sentMessages: ClientMessage[] = [];
  const rawSentFrames: string[] = [];
  const subscribedSymbols = new Set<string>();
  const held = createHeldReplies();

  const socket: RealtimeSocket = {
    get readyState() {
      return readyState;
    },
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send(data: string) {
      if (readyState !== SOCKET_READY_STATE.OPEN) {
        throw new Error("Cannot send on a socket that is not open");
      }
      rawSentFrames.push(data);
      const parsed = parseClientFrame(data);
      if (!parsed.ok) {
        sendServerMessage({ type: "error", code: "invalid_message", message: parsed.error.detail });
        return;
      }
      sentMessages.push(parsed.message);
      handleClientMessage(parsed.message);
    },
    close(code?: number, reason?: string) {
      if (openTimer !== null) {
        cancelTimeout(openTimer);
        openTimer = null;
      }
      if (readyState === SOCKET_READY_STATE.CLOSED) {
        return;
      }
      readyState = SOCKET_READY_STATE.CLOSED;
      socket.onclose?.({
        ...(code !== undefined ? { code } : {}),
        ...(reason !== undefined ? { reason } : {}),
      });
    },
  };

  function sendRaw(raw: unknown): void {
    if (readyState === SOCKET_READY_STATE.OPEN) {
      socket.onmessage?.({ data: raw });
    }
  }

  function sendServerMessage(message: ServerMessage): void {
    sendRaw(encodeFrame(message));
  }

  function sendWelcome(overrides: Partial<WelcomeMessage> = {}): void {
    sendServerMessage({
      type: "welcome",
      protocolVersion: PROTOCOL_VERSION,
      feedMode: config.feedMode,
      marketStatus: config.marketStatus,
      heartbeatIntervalMs: config.heartbeatIntervalMs,
      maxSubscriptions: config.maxSubscriptions,
      serverTime: Date.now(),
      ...overrides,
    });
  }

  function lastRequestId(): RequestId {
    const last = sentMessages.findLast((message) => message.type === "subscribe");
    if (last?.type !== "subscribe") {
      throw new Error("No subscribe has been sent");
    }
    return last.requestId;
  }

  function sendSymbolError(
    code: SymbolErrorCode,
    symbols: string[],
    requestId = lastRequestId(),
  ): void {
    sendServerMessage({ type: "error", code, message: code, requestId, symbols });
  }

  function handleClientMessage(message: ClientMessage): void {
    if (message.type === "unsubscribe") {
      for (const symbol of message.symbols) {
        subscribedSymbols.delete(symbol);
      }
      return;
    }
    if (message.type !== "subscribe" || !config.autoSnapshot) {
      return;
    }
    const messages = answerSubscribe(message.requestId, message.symbols, {
      ...config,
      subscribedSymbols,
    });
    if (config.holdReplies) held.push(message.requestId, messages);
    else messages.forEach(sendServerMessage);
  }

  function open(): void {
    if (openTimer !== null) {
      cancelTimeout(openTimer);
      openTimer = null;
    }
    if (readyState !== SOCKET_READY_STATE.CONNECTING) {
      return;
    }
    readyState = SOCKET_READY_STATE.OPEN;
    socket.onopen?.();
    if (config.autoWelcome) {
      sendWelcome();
    }
  }

  if (config.autoOpen) {
    openTimer = scheduleTimeout(() => {
      openTimer = null;
      open();
    }, 0);
  }

  return {
    url: config.url,
    socket,
    sentMessages,
    rawSentFrames,
    subscribedSymbols,
    open,
    sendServerMessage,
    sendWelcome,
    sendSnapshot: (quotes, requestId = lastRequestId()) =>
      sendServerMessage({ type: "snapshot", requestId, quotes }),
    sendQuotes: (quotes) => sendServerMessage({ type: "quotes", quotes }),
    sendHeartbeat: (skippedFrames) =>
      sendServerMessage({
        type: "heartbeat",
        serverTime: Date.now(),
        ...(skippedFrames !== undefined ? { skippedFrames } : {}),
      }),
    sendMarketStatus: (next) => sendServerMessage({ type: "market_status", marketStatus: next }),
    sendSymbolError,
    sendRateLimited: (requestId) =>
      sendServerMessage({
        type: "error",
        code: "rate_limited",
        message: "Too many messages",
        ...(requestId !== undefined ? { requestId } : {}),
      }),
    lastRequestId,
    heldRequestIds: held.ids,
    deliverHeldReplies: (count) => held.takeFirst(count).forEach(sendServerMessage),
    deliverReply: (requestId) => held.take(requestId).forEach(sendServerMessage),
    discardReply: (requestId) => void held.take(requestId),
    sendRaw,
    drop: (code = 1006, reason = "dropped") => socket.close(code, reason),
    emitError: (error = new Error("socket error")) => socket.onerror?.(error),
  };
}
