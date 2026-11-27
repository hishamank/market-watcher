import type { RequestId, SymbolErrorCode } from "@mini/contracts";
import { createPacedFlush, RATE_LIMIT_PAUSE_MS } from "./paced-flush.ts";
import { createRequestTracker, type PendingRequest } from "./request-tracker.ts";
import { createUnsubscribeScheduler } from "./unsubscribe-scheduler.ts";

export const UNSUBSCRIBE_DELAY_MS = 2_000;

export type { SubscriptionManager, SubscriptionManagerOptions } from "./subscription-types.ts";
import type { SubscriptionManager, SubscriptionManagerOptions } from "./subscription-types.ts";

export function createSubscriptionManager(
  options: SubscriptionManagerOptions,
): SubscriptionManager {
  const refCounts = new Map<string, number>();
  const activeOnServer = new Set<string>();
  const queuedSubscribes = new Set<string>();
  const dueUnsubscribes = new Set<string>();
  const capacityRejected = new Set<string>();
  const resends = new Set<string>();
  const requests = createRequestTracker(onTimeout);
  const pacer = createPacedFlush(flush);
  const unsubscribes = createUnsubscribeScheduler(
    options.unsubscribeDelayMs ?? UNSUBSCRIBE_DELAY_MS,
    (due) => {
      due.forEach((symbol) => dueUnsubscribes.add(symbol));
      pacer.runWhenAllowed();
    },
  );

  const wanted = (symbol: string) => refCounts.has(symbol) && !activeOnServer.has(symbol);

  function sendUnsubscribes(): boolean {
    const toUnsubscribe = [...dueUnsubscribes].filter(
      (symbol) => !refCounts.has(symbol) && activeOnServer.has(symbol),
    );
    dueUnsubscribes.clear();
    if (toUnsubscribe.length === 0) return false;
    for (const symbol of toUnsubscribe) activeOnServer.delete(symbol);
    requests.noteUnsubscribe(toUnsubscribe);
    options.sendUnsubscribe(toUnsubscribe);
    capacityRejected.forEach((symbol) => queuedSubscribes.add(symbol));
    capacityRejected.clear();
    return true;
  }

  function sendSubscribes(): boolean {
    const toSubscribe = [...queuedSubscribes].filter(wanted);
    queuedSubscribes.clear();
    if (toSubscribe.length === 0) return false;
    const isResend = toSubscribe.some((symbol) => resends.has(symbol));
    for (const symbol of toSubscribe) {
      activeOnServer.add(symbol);
      capacityRejected.delete(symbol);
      resends.delete(symbol);
    }
    const request = requests.open(toSubscribe, isResend);
    options.sendSubscribe(request.requestId, toSubscribe);
    return true;
  }

  function flush(): boolean {
    if (!options.canSend()) return false;
    const unsubscribed = sendUnsubscribes();
    return sendSubscribes() || unsubscribed;
  }

  function requeue(symbols: readonly string[]): void {
    for (const symbol of symbols) {
      activeOnServer.delete(symbol);
      if (refCounts.has(symbol)) queuedSubscribes.add(symbol);
      else unsubscribes.cancel(symbol);
    }
  }

  function onTimeout(request: PendingRequest): void {
    const claimed = requests.claim(request, request.symbols).filter((s) => refCounts.has(s));
    if (claimed.length === 0) return;
    if (request.isResend) {
      options.onUnanswered();
      return;
    }
    claimed.forEach((symbol) => resends.add(symbol));
    requeue(claimed);
    pacer.runWhenAllowed();
  }

  function release(symbol: string): void {
    const count = refCounts.get(symbol) ?? 0;
    if (count > 1) {
      refCounts.set(symbol, count - 1);
      return;
    }
    refCounts.delete(symbol);
    queuedSubscribes.delete(symbol);
    capacityRejected.delete(symbol);
    options.onSymbolReleased?.(symbol);
    if (activeOnServer.has(symbol)) unsubscribes.schedule(symbol);
  }

  function acquire(symbol: string): () => void {
    refCounts.set(symbol, (refCounts.get(symbol) ?? 0) + 1);
    unsubscribes.cancel(symbol);
    dueUnsubscribes.delete(symbol);
    if (!activeOnServer.has(symbol)) {
      queuedSubscribes.add(symbol);
      if (options.canSend()) pacer.schedule();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      release(symbol);
    };
  }

  function resetSession(): void {
    pacer.reset();
    unsubscribes.clear();
    requests.clear();
    for (const set of [
      queuedSubscribes,
      dueUnsubscribes,
      activeOnServer,
      capacityRejected,
      resends,
    ]) {
      set.clear();
    }
  }

  function recordSymbolError(
    code: SymbolErrorCode,
    requestId: RequestId,
    symbols: readonly string[],
  ): void {
    const request = requests.find(requestId);
    symbols.forEach((symbol) => request?.outcomes.set(symbol, code));
  }

  function applyOutcomes(request: PendingRequest, claimed: readonly string[]): string[] {
    for (const symbol of claimed) {
      const code = request.outcomes.get(symbol);
      if (code === undefined || code === "unavailable") continue;
      activeOnServer.delete(symbol);
      unsubscribes.cancel(symbol);
      if (code !== "subscription_limit" || !refCounts.has(symbol)) continue;
      if (requests.freedSince(request)) queuedSubscribes.add(symbol);
      else capacityRejected.add(symbol);
    }
    const settled = claimed.filter((symbol) => !queuedSubscribes.has(symbol));
    if (queuedSubscribes.size > 0) pacer.runWhenAllowed();
    return settled;
  }

  return {
    acquire,
    getReferencedSymbols: () => Array.from(refCounts.keys()),
    resubscribeAll() {
      resetSession();
      const symbols = Array.from(refCounts.keys());
      symbols.forEach((symbol) => queuedSubscribes.add(symbol));
      pacer.runNow();
      return symbols;
    },
    settleSnapshot(requestId, confirm) {
      const request = requests.close(requestId);
      if (request === undefined) return [];
      const claimed = requests.claim(request, request.symbols);
      confirm?.(claimed.filter((symbol) => !request.outcomes.has(symbol)));
      options.onSettled?.(claimed, request.outcomes);
      return applyOutcomes(request, claimed);
    },
    recordSymbolError,
    settleRateLimited(requestId) {
      const request = requestId === undefined ? undefined : requests.close(requestId);
      if (request !== undefined) requeue(requests.claim(request, request.symbols));
      pacer.holdFor(RATE_LIMIT_PAUSE_MS);
      if (queuedSubscribes.size > 0) pacer.schedule();
    },
    resetSession,
  };
}
