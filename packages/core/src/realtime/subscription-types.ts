import type { RequestId, SymbolErrorCode } from "@mini/contracts";

export interface SubscriptionManagerOptions {
  canSend(): boolean;
  sendSubscribe(requestId: RequestId, symbols: readonly string[]): void;
  sendUnsubscribe(symbols: readonly string[]): void;
  onSymbolReleased?: ((symbol: string) => void) | undefined;
  onUnanswered(): void;
  onSettled?:
    | ((symbols: readonly string[], outcomes: ReadonlyMap<string, SymbolErrorCode>) => void)
    | undefined;
  unsubscribeDelayMs?: number | undefined;
}

export interface SubscriptionManager {
  acquire(symbol: string): () => void;
  getReferencedSymbols(): string[];
  resubscribeAll(): string[];
  settleSnapshot(requestId: RequestId, confirm?: (symbols: readonly string[]) => void): string[];
  recordSymbolError(code: SymbolErrorCode, requestId: RequestId, symbols: readonly string[]): void;
  settleRateLimited(requestId: RequestId | undefined): void;
  resetSession(): void;
}
