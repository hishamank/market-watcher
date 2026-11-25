export interface RecoveryGate {
  reset(): void;
  welcome(): void;
  isWelcomed(): boolean;
  settle(symbols: readonly string[]): void;
  unsettle(symbols: readonly string[]): void;
  isOpen(referencedSymbols: readonly string[]): boolean;
}

export function createRecoveryGate(): RecoveryGate {
  const settledSymbols = new Set<string>();
  let welcomed = false;

  return {
    reset() {
      welcomed = false;
      settledSymbols.clear();
    },
    welcome() {
      welcomed = true;
      settledSymbols.clear();
    },
    isWelcomed: () => welcomed,
    settle(symbols) {
      for (const symbol of symbols) settledSymbols.add(symbol);
    },
    unsettle(symbols) {
      for (const symbol of symbols) settledSymbols.delete(symbol);
    },
    isOpen: (referencedSymbols) =>
      welcomed && referencedSymbols.every((symbol) => settledSymbols.has(symbol)),
  };
}
