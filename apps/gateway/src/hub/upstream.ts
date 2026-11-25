import type { LiveFeed } from "../feeds/types.ts";
import { CLOSE_TIMEOUT_MS } from "./limits.ts";
import type { Warn } from "./quote-book.ts";
import { createSettlements } from "./settlements.ts";

type LineState = "active" | "unknown";
type Action = "subscribe" | "unsubscribe";

export interface Upstream {
  reconcile(symbols: readonly string[]): Promise<void>;
  retry(): void;
  close(): Promise<void>;
}

interface Lines {
  readonly state: Map<string, LineState>;
  readonly failed: Set<string>;
}

function runUpstream(action: () => unknown): Promise<void> {
  try {
    return Promise.resolve(action()).then(() => undefined);
  } catch (error) {
    return Promise.reject(error);
  }
}

function finalStop(live: LiveFeed, symbols: readonly string[], warn: Warn): Promise<void> {
  if (symbols.length === 0) {
    return Promise.resolve();
  }
  const stop = runUpstream(() => live.unsubscribe(symbols)).catch((err: unknown) =>
    warn({ err, symbols }, "final upstream unsubscribe failed"),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, CLOSE_TIMEOUT_MS);
  });
  return Promise.race([stop, deadline]).finally(() => clearTimeout(timer));
}

function record(lines: Lines, symbols: readonly string[], action: Action, ok: boolean): void {
  for (const symbol of symbols) {
    if (!ok) {
      lines.state.set(symbol, "unknown");
      lines.failed.add(symbol);
      continue;
    }
    lines.failed.delete(symbol);
    if (action === "subscribe") {
      lines.state.set(symbol, "active");
    } else {
      lines.state.delete(symbol);
    }
  }
}

export function createUpstream(
  live: LiveFeed,
  isWanted: (symbol: string) => boolean,
  warn: Warn,
): Upstream {
  const lines: Lines = { state: new Map(), failed: new Set() };
  const busy = new Set<string>();
  const dirty = new Set<string>();
  const settlements = createSettlements();
  let closed = false;

  function run(symbols: readonly string[], action: Action): void {
    if (symbols.length === 0) {
      return;
    }
    symbols.forEach((symbol) => busy.add(symbol));
    const settled = settlements.take(symbols);
    void runUpstream(() => live[action](symbols))
      .then(
        () => record(lines, symbols, action, true),
        (err: unknown) => {
          record(lines, symbols, action, false);
          warn({ err, symbols }, `upstream ${action} failed, will retry`);
        },
      )
      .finally(() => {
        symbols.forEach((symbol) => busy.delete(symbol));
        settled();
        pump();
      });
  }

  function pump(): void {
    if (closed) {
      return;
    }
    const ready = [...dirty].filter((symbol) => !busy.has(symbol));
    ready.forEach((symbol) => dirty.delete(symbol));
    const toStop = ready.filter((symbol) => !isWanted(symbol) && lines.state.has(symbol));
    const toStart = ready.filter(
      (symbol) => isWanted(symbol) && lines.state.get(symbol) !== "active",
    );
    settlements.wake(
      ready.filter((symbol) => !toStop.includes(symbol) && !toStart.includes(symbol)),
    );
    run(toStop, "unsubscribe");
    run(toStart, "subscribe");
  }

  function reconcile(symbols: readonly string[]): Promise<void> {
    if (closed) {
      return Promise.resolve();
    }
    const unique = [...new Set(symbols)];
    const settled = Promise.all(unique.map((symbol) => settlements.wait(symbol)));
    unique.forEach((symbol) => dirty.add(symbol));
    pump();
    return settled.then(() => undefined);
  }

  function close(): Promise<void> {
    closed = true;
    dirty.clear();
    lines.failed.clear();
    settlements.wakeAll();
    return finalStop(live, [...new Set([...lines.state.keys(), ...busy])], warn);
  }

  return {
    reconcile,
    retry() {
      const due = [...lines.failed];
      lines.failed.clear();
      void reconcile(due);
    },
    close,
  };
}
