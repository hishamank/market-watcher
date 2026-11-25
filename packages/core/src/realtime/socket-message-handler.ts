import {
  type ChaosStateMessage,
  type ErrorMessage,
  parseServerFrame,
  type FeedMode,
  type MarketStatus,
  type ServerMessage,
} from "@mini/contracts";
import type { QuoteStore } from "./quote-store.ts";
import type { RecoveryGate } from "./recovery-gate.ts";
import type { SubscriptionManager } from "./subscription-manager.ts";

export interface WelcomeInfo {
  heartbeatIntervalMs: number;
  feedMode: FeedMode;
  marketStatus: MarketStatus;
}

export interface FrameHandlerContext {
  quoteStore: QuoteStore;
  subscriptions: SubscriptionManager;
  gate: RecoveryGate;
  onValidFrame(): void;
  onWelcome(info: WelcomeInfo): void;
  onMarketStatus(marketStatus: MarketStatus): void;
  onChaosState(message: ChaosStateMessage): void;
  onSnapshotsSettled(): void;
  onWarning(message: string, detail?: unknown): void;
}

function handleParsedMessage(message: ServerMessage, ctx: FrameHandlerContext): void {
  switch (message.type) {
    case "welcome":
      ctx.onWelcome({
        heartbeatIntervalMs: message.heartbeatIntervalMs,
        feedMode: message.feedMode,
        marketStatus: message.marketStatus,
      });
      ctx.subscriptions.resubscribeAll();
      ctx.onSnapshotsSettled();
      return;
    case "snapshot":
      ctx.quoteStore.upsertMany(message.quotes);
      ctx.gate.settle(ctx.subscriptions.settleSnapshot(message.requestId));
      ctx.onSnapshotsSettled();
      return;
    case "quotes":
      ctx.quoteStore.upsertMany(message.quotes);
      return;
    case "heartbeat":
      return;
    case "market_status":
      ctx.onMarketStatus(message.marketStatus);
      return;
    case "chaos_state":
      ctx.onChaosState(message);
      return;
    case "error":
      handleError(message, ctx);
      return;
  }
}

function handleError(message: ErrorMessage, ctx: FrameHandlerContext): void {
  if ("symbols" in message) {
    ctx.subscriptions.recordSymbolError(message.code, message.requestId, message.symbols);
  } else if (message.code === "rate_limited") {
    ctx.subscriptions.settleRateLimited(message.requestId);
  }
  ctx.onWarning("Gateway error message", message);
}

export function processRawServerFrame(raw: unknown, ctx: FrameHandlerContext): void {
  const parsed = parseServerFrame(raw);
  if (!parsed.ok) {
    ctx.onWarning("Dropped invalid server frame", parsed.error);
    return;
  }
  ctx.onValidFrame();
  handleParsedMessage(parsed.message, ctx);
}
