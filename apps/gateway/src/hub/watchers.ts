import type { Member } from "./member.ts";

export interface Watchers {
  of(symbol: string): Iterable<Member>;
  isWatched(symbol: string): boolean;
  add(member: Member, symbols: readonly string[]): void;
  remove(member: Member, symbols: readonly string[]): string[];
}

export function createWatchers(onCount: (symbol: string, count: number) => void): Watchers {
  const bySymbol = new Map<string, Set<Member>>();

  function add(member: Member, symbols: readonly string[]): void {
    for (const symbol of symbols) {
      const members = bySymbol.get(symbol) ?? new Set<Member>();
      members.add(member);
      bySymbol.set(symbol, members);
      onCount(symbol, members.size);
      member.symbols.add(symbol);
    }
  }

  function detach(member: Member, symbol: string): void {
    const members = bySymbol.get(symbol);
    if (members?.delete(member)) {
      onCount(symbol, members.size);
    }
    if (members?.size === 0) {
      bySymbol.delete(symbol);
    }
    member.symbols.delete(symbol);
    member.changed.delete(symbol);
    member.unquoted.delete(symbol);
  }

  function remove(member: Member, symbols: readonly string[]): string[] {
    const held = symbols.filter((symbol) => bySymbol.get(symbol)?.has(member));
    held.forEach((symbol) => detach(member, symbol));
    return held;
  }

  return {
    of: (symbol) => bySymbol.get(symbol) ?? [],
    isWatched: (symbol) => bySymbol.has(symbol),
    add,
    remove,
  };
}
