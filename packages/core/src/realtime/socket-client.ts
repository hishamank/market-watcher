import type { FeedMode, MarketStatus } from "@mini/contracts";
import { createManagedConnection } from "./socket-connection.ts";
import { createPlatformBridge } from "./socket-lifecycle.ts";
import { createRecoveryGate } from "./recovery-gate.ts";
import { processRawServerFrame, type WelcomeInfo } from "./socket-message-handler.ts";
import type {
  ConnectionStatus,
  MarketStatusListener,
  ReconnectListener,
  SocketClient,
  SocketClientOptions,
  StatusListener,
} from "./socket-types.ts";
import { createSubscriptionManager } from "./subscription-manager.ts";
import { logWarning } from "./timers.ts";
import { createDefaultSocket } from "./transport.ts";

const DEFAULT_BACKGROUND_GRACE_MS = 10_000;

function notifyAll(listeners: ReadonlySet<() => void>): void {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

function addListener(listeners: Set<() => void>, listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function createSocketClient(options: SocketClientOptions): SocketClient {
  const statusListeners = new Set<StatusListener>();
  const marketStatusListeners = new Set<MarketStatusListener>();
  const reconnectListeners = new Set<ReconnectListener>();
  const gate = createRecoveryGate();

  let status: ConnectionStatus = "connecting";
  let started = false;
  let hasEverWelcomed = false;
  let hasEverConnected = false;
  let feedMode: FeedMode | null = null;
  let marketStatus: MarketStatus | null = null;

  function setStatus(next: ConnectionStatus): void {
    if (status === next) return;
    status = next;
    notifyAll(statusListeners);
  }

  function setMarketStatus(next: MarketStatus): void {
    if (marketStatus === next) return;
    marketStatus = next;
    notifyAll(marketStatusListeners);
  }

  function checkConnected(): void {
    if (status === "offline" || !gate.isOpen(subscriptions.getReferencedSymbols())) return;
    const wasReconnect = hasEverConnected && status !== "connected";
    hasEverConnected = true;
    connection.resetBackoff();
    setStatus("connected");
    if (wasReconnect) notifyAll(reconnectListeners);
  }

  const subscriptions = createSubscriptionManager({
    canSend: () => gate.isWelcomed() && connection.isOpen(),
    sendSubscribe: (requestId, symbols) => {
      gate.unsettle(symbols);
      connection.send({ type: "subscribe", requestId, symbols: [...symbols] });
    },
    sendUnsubscribe: (symbols) => {
      gate.unsettle(symbols);
      connection.send({ type: "unsubscribe", symbols: [...symbols] });
    },
    onSymbolReleased: checkConnected,
    onUnanswered: () => {
      connection.close();
      handleLinkLost();
    },
    unsubscribeDelayMs: options.unsubscribeDelayMs,
  });

  function handleLinkLost(): void {
    clearSession();
    if (!started || platform.isPausedInBackground()) return;
    if (platform.isOffline()) {
      setStatus("offline");
      return;
    }
    setStatus("stale");
    connection.scheduleReconnect();
  }

  function clearSession(): void {
    connection.close();
    subscriptions.resetSession();
    gate.reset();
  }

  function openFreshSocket(): void {
    gate.reset();
    connection.open();
  }

  function resumeOnline(): void {
    connection.resetBackoff();
    setStatus(hasEverWelcomed ? "stale" : "connecting");
    openFreshSocket();
  }

  const platform = createPlatformBridge({
    network: options.network,
    lifecycle: options.lifecycle,
    backgroundGraceMs: options.backgroundGraceMs ?? DEFAULT_BACKGROUND_GRACE_MS,
    onOffline: () => {
      connection.cancelReconnect();
      clearSession();
      setStatus("offline");
    },
    onOnline: (paused) => {
      if (paused) {
        connection.resetBackoff();
        setStatus(hasEverWelcomed ? "stale" : "connecting");
        return;
      }
      resumeOnline();
    },
    onBackgroundPause: () => {
      connection.cancelReconnect();
      clearSession();
      if (status === "connected") setStatus("stale");
    },
    onForegroundResume: () => {
      if (!platform.isOffline()) resumeOnline();
    },
  });

  const frameContext = {
    quoteStore: options.quoteStore,
    subscriptions,
    gate,
    onValidFrame: () => connection.resetSilenceTimer(),
    onWelcome: (info: WelcomeInfo) => {
      gate.welcome();
      hasEverWelcomed = true;
      feedMode = info.feedMode;
      setMarketStatus(info.marketStatus);
      connection.setHeartbeatInterval(info.heartbeatIntervalMs);
    },
    onMarketStatus: setMarketStatus,
    onSnapshotsSettled: checkConnected,
    onWarning: options.onWarning ?? logWarning,
  };

  const connection = createManagedConnection({
    url: options.url,
    socketFactory: options.socketFactory ?? createDefaultSocket,
    random: options.random ?? Math.random,
    isActive: () => started && !platform.isPausedInBackground() && !platform.isOffline(),
    onRawFrame: (data) => processRawServerFrame(data, frameContext),
    onLinkLost: handleLinkLost,
  });

  return {
    start() {
      if (started) return;
      started = true;
      platform.start();
      if (platform.isOffline()) {
        setStatus("offline");
        return;
      }
      if (!platform.isPausedInBackground()) resumeOnline();
    },
    stop() {
      if (!started) return;
      started = false;
      platform.stop();
      connection.cancelReconnect();
      clearSession();
    },
    getStatus: () => status,
    subscribeStatus: (listener) => addListener(statusListeners, listener),
    acquireSymbol: subscriptions.acquire,
    retryNow() {
      if (!started || platform.isPausedInBackground() || platform.isOffline()) return;
      if (status === "connected") return;
      connection.resetBackoff();
      connection.cancelReconnect();
      subscriptions.resetSession();
      openFreshSocket();
    },
    send: (message) => connection.send(message),
    getMarketStatus: () => marketStatus,
    subscribeMarketStatus: (listener) => addListener(marketStatusListeners, listener),
    getFeedMode: () => feedMode,
    subscribeReconnect: (listener) => addListener(reconnectListeners, listener),
  };
}
