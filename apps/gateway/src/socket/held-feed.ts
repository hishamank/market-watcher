import { createFakeFeed, type FakeFeed } from "../hub/fake-feed.ts";

export interface HeldCall {
  readonly action: "subscribe" | "unsubscribe";
  readonly symbols: readonly string[];
  resolve(): void;
  reject(): void;
}

export interface HeldFeed extends FakeFeed {
  readonly calls: HeldCall[];
  passThrough(): void;
  holdCalls(): void;
}

export function createHeldFeed(): HeldFeed {
  const base = createFakeFeed();
  const calls: HeldCall[] = [];
  let passing = false;

  function hold(action: HeldCall["action"], symbols: readonly string[]): void {
    let open = true;
    const settled = new Promise<void>((resolve, reject) => {
      const once = (settle: () => void) => () => {
        if (open) {
          open = false;
          settle();
        }
      };
      calls.push({
        action,
        symbols: [...symbols],
        resolve: once(() => resolve(base.live[action](symbols))),
        reject: once(() => reject(new Error(`upstream ${action} failed`))),
      });
    });
    if (passing) {
      calls.at(-1)?.resolve();
    }
    return settled as unknown as void;
  }

  return {
    ...base,
    calls,
    passThrough() {
      passing = true;
      calls.forEach((call) => call.resolve());
    },
    holdCalls() {
      passing = false;
    },
    live: {
      ...base.live,
      subscribe: (symbols) => hold("subscribe", symbols),
      unsubscribe: (symbols) => hold("unsubscribe", symbols),
    },
  };
}
