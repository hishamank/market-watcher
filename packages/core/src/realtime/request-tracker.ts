import type { RequestId, SymbolErrorCode } from "@mini/contracts";
import { cancelTimeout, scheduleTimeout, type TimerHandle } from "./timers.ts";

export const REPLY_DEADLINE_MS = 10_000;

export interface PendingRequest {
  readonly requestId: RequestId;
  readonly deadlineAt: number;
  readonly symbols: readonly string[];
  readonly unsubscribesAtSend: number;
  readonly isResend: boolean;
  readonly outcomes: Map<string, SymbolErrorCode>;
}

export interface RequestTracker {
  snapshot(): Pick<PendingRequest, "requestId" | "symbols" | "deadlineAt" | "isResend">[];
  open(symbols: readonly string[], isResend: boolean): PendingRequest;
  find(requestId: RequestId): PendingRequest | undefined;
  close(requestId: RequestId): PendingRequest | undefined;
  claim(request: PendingRequest, symbols: readonly string[]): string[];
  noteUnsubscribe(symbols: readonly string[]): void;
  freedSince(request: PendingRequest): boolean;
  clear(): void;
}

export function createRequestTracker(onTimeout: (request: PendingRequest) => void): RequestTracker {
  const pending = new Map<RequestId, { request: PendingRequest; timer: TimerHandle }>();
  const latestFor = new Map<string, RequestId>();
  let nextRequestId = 1;
  let unsubscribes = 0;

  function close(requestId: RequestId): PendingRequest | undefined {
    const entry = pending.get(requestId);
    if (entry === undefined) return undefined;
    pending.delete(requestId);
    cancelTimeout(entry.timer);
    return entry.request;
  }

  function open(symbols: readonly string[], isResend: boolean): PendingRequest {
    const request = {
      requestId: nextRequestId,
      deadlineAt: Date.now() + REPLY_DEADLINE_MS,
      symbols: [...symbols],
      unsubscribesAtSend: unsubscribes,
      isResend,
      outcomes: new Map<string, SymbolErrorCode>(),
    };
    nextRequestId += 1;
    for (const symbol of symbols) latestFor.set(symbol, request.requestId);
    const timer = scheduleTimeout(() => {
      if (close(request.requestId) !== undefined) onTimeout(request);
    }, REPLY_DEADLINE_MS);
    pending.set(request.requestId, { request, timer });
    return request;
  }

  function claim(request: PendingRequest, symbols: readonly string[]): string[] {
    const claimed = symbols.filter(
      (symbol) => request.symbols.includes(symbol) && latestFor.get(symbol) === request.requestId,
    );
    for (const symbol of claimed) latestFor.delete(symbol);
    return claimed;
  }

  return {
    snapshot: () =>
      [...pending.values()].map(({ request }) => ({
        requestId: request.requestId,
        symbols: [...request.symbols],
        deadlineAt: request.deadlineAt,
        isResend: request.isResend,
      })),
    open,
    find: (requestId) => pending.get(requestId)?.request,
    close,
    claim,
    noteUnsubscribe(symbols) {
      unsubscribes += 1;
      for (const symbol of symbols) latestFor.delete(symbol);
    },
    freedSince: (request) => request.unsubscribesAtSend < unsubscribes,
    clear() {
      for (const entry of pending.values()) cancelTimeout(entry.timer);
      pending.clear();
      latestFor.clear();
      nextRequestId = 1;
      unsubscribes = 0;
    },
  };
}
