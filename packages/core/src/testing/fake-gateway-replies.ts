import type { Quote, RequestId, ServerMessage } from "@mini/contracts";
import { defaultQuoteFor } from "./fake-gateway-types.ts";

export interface SubscribeReplyContext {
  maxSubscriptions: number;
  quotes: ReadonlyMap<string, Quote>;
  unknownSet: ReadonlySet<string>;
  subscribedSymbols: Set<string>;
}

export function answerSubscribe(
  requestId: RequestId,
  symbols: readonly string[],
  ctx: SubscribeReplyContext,
): ServerMessage[] {
  const snapshotQuotes: Quote[] = [];
  const unknown: string[] = [];
  const overLimit: string[] = [];
  for (const symbol of new Set(symbols)) {
    if (ctx.unknownSet.has(symbol)) {
      unknown.push(symbol);
    } else if (
      !ctx.subscribedSymbols.has(symbol) &&
      ctx.subscribedSymbols.size >= ctx.maxSubscriptions
    ) {
      overLimit.push(symbol);
    } else {
      ctx.subscribedSymbols.add(symbol);
      snapshotQuotes.push(ctx.quotes.get(symbol) ?? defaultQuoteFor(symbol));
    }
  }
  const replies: ServerMessage[] = [];
  if (unknown.length > 0) {
    replies.push({
      type: "error",
      code: "unknown_symbol",
      message: "Unknown symbols",
      requestId,
      symbols: unknown,
    });
  }
  if (overLimit.length > 0) {
    replies.push({
      type: "error",
      code: "subscription_limit",
      message: "Subscription limit reached",
      requestId,
      symbols: overLimit,
    });
  }
  replies.push({ type: "snapshot", requestId, quotes: snapshotQuotes });
  return replies;
}

export interface HeldReplies {
  push(requestId: RequestId, messages: ServerMessage[]): void;
  take(requestId: RequestId): ServerMessage[];
  takeFirst(count?: number): ServerMessage[];
  ids(): RequestId[];
}

export function createHeldReplies(): HeldReplies {
  const held: { requestId: RequestId; messages: ServerMessage[] }[] = [];
  return {
    push: (requestId, messages) => void held.push({ requestId, messages }),
    take(requestId) {
      const index = held.findIndex((entry) => entry.requestId === requestId);
      return index === -1 ? [] : (held.splice(index, 1)[0]?.messages ?? []);
    },
    takeFirst: (count = held.length) => held.splice(0, count).flatMap((entry) => entry.messages),
    ids: () => held.map((entry) => entry.requestId),
  };
}
