import type { FeedSession } from "./feed-session.ts";
import type { ClientMessage, FeedMode, MarketStatus } from "@mini/contracts";
import type { AppLifecycle } from "../platform/app-lifecycle.ts";
import type { NetworkStatus } from "../platform/network-status.ts";
import type { ChaosSnapshot } from "./chaos-state-store.ts";
import type { ConnectionHealthRecorder } from "./connection-health.ts";
import type { QuoteStore } from "./quote-store.ts";
import type { SocketFactory } from "./transport.ts";

export type ConnectionStatus = "connecting" | "connected" | "stale" | "offline";

export type StatusListener = () => void;

export type MarketStatusListener = () => void;

export type ChaosStateListener = () => void;

export type ReconnectListener = () => void;

export interface SocketClientOptions {
  url: string;
  session?: FeedSession;
  quoteStore: QuoteStore;
  health?: ConnectionHealthRecorder | undefined;
  network: NetworkStatus;
  lifecycle?: AppLifecycle | undefined;
  socketFactory?: SocketFactory | undefined;
  random?: (() => number) | undefined;
  onWarning?: ((message: string, detail?: unknown) => void) | undefined;
  unsubscribeDelayMs?: number | undefined;
  backgroundGraceMs?: number | undefined;
}

export interface SocketClient {
  start(): void;
  stop(): void;
  getStatus(): ConnectionStatus;
  subscribeStatus(listener: StatusListener): () => void;
  acquireSymbol(symbol: string): () => void;
  retryNow(): void;
  send(message: ClientMessage): boolean;
  getMarketStatus(): MarketStatus | null;
  subscribeMarketStatus(listener: MarketStatusListener): () => void;
  getChaosState(): ChaosSnapshot | null;
  subscribeChaosState(listener: ChaosStateListener): () => void;
  getFeedMode(): FeedMode | null;
  subscribeFeedMode(listener: () => void): () => void;
  subscribeReconnect(listener: ReconnectListener): () => void;
}
