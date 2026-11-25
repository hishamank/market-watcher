export interface Settlements {
  wait(symbol: string): Promise<void>;
  wake(symbols: readonly string[]): void;
  take(symbols: readonly string[]): () => void;
  wakeAll(): void;
}

export function createSettlements(): Settlements {
  const waiting = new Map<string, (() => void)[]>();
  const taken = new Set<(() => void)[]>();

  function wake(symbols: readonly string[]): void {
    for (const symbol of symbols) {
      waiting.get(symbol)?.forEach((resolve) => resolve());
      waiting.delete(symbol);
    }
  }

  function take(symbols: readonly string[]): () => void {
    const held = symbols.flatMap((symbol) => waiting.get(symbol) ?? []);
    symbols.forEach((symbol) => waiting.delete(symbol));
    taken.add(held);
    return () => {
      taken.delete(held);
      held.forEach((resolve) => resolve());
    };
  }

  return {
    wait: (symbol) =>
      new Promise((resolve) => waiting.set(symbol, [...(waiting.get(symbol) ?? []), resolve])),
    wake,
    take,
    wakeAll() {
      wake([...waiting.keys()]);
      taken.forEach((held) => held.forEach((resolve) => resolve()));
      taken.clear();
    },
  };
}
