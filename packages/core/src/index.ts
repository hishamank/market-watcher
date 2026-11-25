export { CoreProvider, createCoreServices, useCore } from "./core-provider.tsx";
export type { CoreContextValue, CoreProviderProps } from "./core-provider.tsx";
export { useConnectionStatus } from "./hooks/use-connection-status.ts";
export type { ConnectionStatusResult } from "./hooks/use-connection-status.ts";
export { useQuote } from "./hooks/use-quote.ts";
export type { AppLifecycle, LifecycleListener, LifecycleState } from "./platform/app-lifecycle.ts";
export type { KeyValueListener, KeyValueStore } from "./platform/key-value-store.ts";
export type { NetworkListener, NetworkState, NetworkStatus } from "./platform/network-status.ts";
export {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  computeBackoffCeiling,
  computeBackoffDelay,
} from "./realtime/backoff.ts";
export { createQuoteStore } from "./realtime/quote-store.ts";
export type { QuoteListener, QuoteStore } from "./realtime/quote-store.ts";
export { createSocketClient } from "./realtime/socket-client.ts";
export type {
  ConnectionStatus,
  ReconnectListener,
  SocketClient,
  SocketClientOptions,
  StatusListener,
} from "./realtime/socket-types.ts";
export { UNSUBSCRIBE_DELAY_MS } from "./realtime/subscription-manager.ts";
export { buildSocketUrl, createDefaultSocket, SOCKET_READY_STATE } from "./realtime/transport.ts";
export type {
  RealtimeSocket,
  SocketCloseEvent,
  SocketFactory,
  SocketMessageEvent,
} from "./realtime/transport.ts";
