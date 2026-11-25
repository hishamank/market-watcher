export interface Watched {
  readonly order: ReadonlyMap<string, number>;
  readonly counts: ReadonlyMap<string, number>;
}

export function pickStreamed(
  watched: Watched,
  incumbents: ReadonlySet<string>,
  limit: number,
): Set<string> {
  const count = (symbol: string) => watched.counts.get(symbol) ?? 1;
  const ranked = [...watched.order.keys()].sort(
    (a, b) =>
      count(b) - count(a) ||
      Number(incumbents.has(b)) - Number(incumbents.has(a)) ||
      (watched.order.get(a) ?? 0) - (watched.order.get(b) ?? 0),
  );
  return new Set(ranked.slice(0, limit));
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((symbol) => b.has(symbol));
}
