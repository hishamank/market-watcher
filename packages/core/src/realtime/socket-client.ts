/* oxlint-disable max-lines -- Keep feed quarantine beside connection lifecycle; ADR 0077. */
import { createFeedSession } from "./feed-session.ts";
import type { MarketStatus } from "@mini/contracts";
import { createChaosStateStore } from "./chaos-state-store.ts";
import { createFeedModeStore } from "./feed-mode-store.ts";
import { addListener, notifyAll } from "./listeners.ts";
import { createManagedConnection } from "./socket-connection.ts";
import { createPlatformBridge } from "./socket-lifecycle.ts";
import { settleAvailability } from "./settle-availability.ts";
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
import { createSocketDiagnostics, type RecoveryReason } from "./socket-diagnostics.ts";
const DEFAULT_BACKGROUND_GRACE_MS = 10_000;
export function createSocketClient(options: SocketClientOptions): SocketClient {
  const statusListeners = new Set<StatusListener>();
  const marketStatusListeners = new Set<MarketStatusListener>();
  const reconnectListeners = new Set<ReconnectListener>();
  const chaosStore = createChaosStateStore();
  const feedModeStore = createFeedModeStore();
  const gate = createRecoveryGate();
  const session = options.session ?? createFeedSession();

  let status: ConnectionStatus = "connecting";
  let started = false;
  let hasEverWelcomed = false;
  let hasEverConnected = false;
  let marketStatus: MarketStatus | null = null;
  const diagnostics = createSocketDiagnostics({
    getStatus: () => status,
    getConnection: () => connection,
    getSubscriptions: () => subscriptions,
    gate,
    quoteStore: options.quoteStore,
  });
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
    if (
      session.isBlocked() ||
      status === "offline" ||
      !gate.isOpen(subscriptions.getReferencedSymbols())
    )
      return;
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
      symbols.forEach((symbol) => options.quoteStore.setAvailability(symbol, "recovering"));
      connection.send({ type: "subscribe", requestId, symbols: [...symbols] });
    },
    sendUnsubscribe: (symbols) => {
      gate.unsettle(symbols);
      connection.send({ type: "unsubscribe", symbols: [...symbols] });
    },
    onSymbolReleased: checkConnected,
    onSettled: (symbols, outcomes) => settleAvailability(options.quoteStore, symbols, outcomes),
    onUnanswered: () => {
      connection.close();
      handleLinkLost("subscription_deadline");
    },
    unsubscribeDelayMs: options.unsubscribeDelayMs,
  });
  function handleLinkLost(reason: RecoveryReason): void {
    diagnostics.recovery(reason);
    clearSession();
    if (session.isBlocked() || !started || platform.isPausedInBackground()) return;
    if (platform.isOffline()) {
      setStatus("offline");
      return;
    }
    setStatus("stale");
    connection.scheduleReconnect();
  }
  const clearSession = (): void => {
    connection.close();
    subscriptions.resetSession();
    gate.reset();
  };
  const openFreshSocket = (): void => {
    if (session.isBlocked()) return;
    gate.reset();
    connection.open();
  };
  const resumeOnline = (): void => {
    if (session.isBlocked()) return;
    connection.resetBackoff();
    setStatus(hasEverWelcomed ? "stale" : "connecting");
    openFreshSocket();
  };
  const platform = createPlatformBridge({
    network: options.network,
    lifecycle: options.lifecycle,
    backgroundGraceMs: options.backgroundGraceMs ?? DEFAULT_BACKGROUND_GRACE_MS,
    onOffline: () => {
      diagnostics.recovery("network_offline");
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
      diagnostics.recovery("background_pause");
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
    health: options.health,
    subscriptions,
    gate,
    onValidFrame: () => connection.resetSilenceTimer(),
    onWelcome: (info: WelcomeInfo) => {
      if (!session.accept(info.feedMode)) return false;
      gate.welcome();
      hasEverWelcomed = true;
      feedModeStore.learn(info.feedMode);
      setMarketStatus(info.marketStatus);
      connection.setHeartbeatInterval(info.heartbeatIntervalMs);
    },
    onMarketStatus: setMarketStatus,
    onChaosState: chaosStore.update,
    onSnapshotsSettled: checkConnected,
    onGatewayError: diagnostics.gatewayError,
    onWarning: options.onWarning ?? logWarning,
  };
  const connection = createManagedConnection({
    url: options.url,
    socketFactory: options.socketFactory ?? createDefaultSocket,
    random: options.random ?? Math.random,
    isActive: () =>
      !session.isBlocked() && started && !platform.isPausedInBackground() && !platform.isOffline(),
    onRawFrame: (data) => processRawServerFrame(data, frameContext),
    onLinkLost: handleLinkLost,
  });

  session.subscribe(() => {
    connection.cancelReconnect();
    clearSession();
    setStatus("stale");
  });

  return {
    getDiagnostics: diagnostics.snapshot,
    start() {
      if (started || session.isBlocked()) return;
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
      if (
        session.isBlocked() ||
        !started ||
        platform.isPausedInBackground() ||
        platform.isOffline()
      )
        return;
      if (status === "connected") return;
      connection.resetBackoff();
      connection.cancelReconnect();
      subscriptions.resetSession();
      openFreshSocket();
    },
    send: (message) => connection.send(message),
    getMarketStatus: () => marketStatus,
    subscribeMarketStatus: (listener) => addListener(marketStatusListeners, listener),
    getChaosState: chaosStore.get,
    subscribeChaosState: chaosStore.subscribe,
    getFeedMode: feedModeStore.get,
    subscribeFeedMode: feedModeStore.subscribe,
    subscribeReconnect: (listener) => addListener(reconnectListeners, listener),
  };
}
