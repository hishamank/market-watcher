import type { Quote, RequestId, SymbolErrorCode } from "@mini/contracts";
import { MAX_SUBSCRIPTIONS } from "./limits.ts";
import type { Peer } from "./member.ts";
import type { SubscribePlan } from "./subscribe-plan.ts";

export interface SubscribeRequest {
  readonly requestId: RequestId;
  readonly symbols: readonly string[];
}

const MESSAGES: Record<SymbolErrorCode, string> = {
  unknown_symbol: "These symbols are not in the catalogue",
  subscription_limit: `A connection holds at most ${MAX_SUBSCRIPTIONS} subscriptions`,
  unavailable: "No quote yet, the first one arrives as a tick",
};

function symbolError(
  peer: Peer,
  code: SymbolErrorCode,
  requestId: RequestId,
  symbols: string[],
): void {
  if (symbols.length > 0) {
    peer.reply({ type: "error", code, message: MESSAGES[code], requestId, symbols });
  }
}

export function sendAnswer(
  peer: Peer,
  requestId: RequestId,
  plan: SubscribePlan,
  latest: ReadonlyMap<string, Quote>,
): string[] {
  const quotes = plan.accepted.flatMap((symbol) => latest.get(symbol) ?? []);
  const unavailable = plan.accepted.filter((symbol) => !latest.has(symbol));
  symbolError(peer, "unknown_symbol", requestId, plan.unknown);
  symbolError(peer, "subscription_limit", requestId, plan.overLimit);
  symbolError(peer, "unavailable", requestId, unavailable);
  peer.reply({ type: "snapshot", requestId, quotes });
  return unavailable;
}

export function withDeadline(work: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([work.then(() => undefined), deadline]).finally(() => clearTimeout(timer));
}
