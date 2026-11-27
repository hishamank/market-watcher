import { compareDecimal, type Quote, type Stock } from "@mini/contracts";

export const STOCK_SORT_FIELDS = [
  "name",
  "symbol",
  "price",
  "change",
  "changePercent",
  "previousClose",
  "dayHigh",
  "dayLow",
  "lastUpdate",
] as const;

export type StockSortField = (typeof STOCK_SORT_FIELDS)[number];
export type StockSortDirection = "asc" | "desc";

export interface StockSort {
  readonly field: StockSortField;
  readonly direction: StockSortDirection;
}

type QuoteField = Exclude<StockSortField, "name" | "symbol">;

export function firstStockSortDirection(field: StockSortField): StockSortDirection {
  return field === "name" || field === "symbol" ? "asc" : "desc";
}

export function nextStockSort(
  current: StockSort | undefined,
  field: StockSortField,
): StockSort | undefined {
  const first = firstStockSortDirection(field);
  if (current?.field !== field) return { field, direction: first };
  if (current.direction !== first) return undefined;
  return { field, direction: first === "asc" ? "desc" : "asc" };
}

function quoteValue(quote: Quote, field: QuoteField): string | undefined {
  if (field === "dayHigh") return quote.dayRange?.high;
  if (field === "dayLow") return quote.dayRange?.low;
  if (field === "lastUpdate") return String(quote.timestamp);
  return quote[field];
}

function missingLast(first: string | undefined, second: string | undefined): number {
  if (first === second) return 0;
  return first === undefined ? 1 : -1;
}

export function sortStocks(
  stocks: readonly Stock[],
  sort: StockSort,
  quoteOf: (stock: Stock) => Quote,
  locale: string,
): readonly Stock[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const sign = sort.direction === "asc" ? 1 : -1;
  const primary = (first: Stock, second: Stock): number => {
    if (sort.field === "name") return sign * collator.compare(first.name, second.name);
    if (sort.field === "symbol") return sign * collator.compare(first.symbol, second.symbol);
    const left = quoteValue(quoteOf(first), sort.field);
    const right = quoteValue(quoteOf(second), sort.field);
    if (left === undefined || right === undefined) return missingLast(left, right);
    return sign * compareDecimal(left, right);
  };
  return [...stocks].sort(
    (first, second) => primary(first, second) || collator.compare(first.symbol, second.symbol),
  );
}

export interface SortSnapshot {
  readonly key: string;
  readonly order: readonly string[];
}

export interface HeldOrder {
  readonly stocks: readonly Stock[];
  readonly snapshot: SortSnapshot | undefined;
}

function keepOrder(
  order: readonly string[],
  stocks: readonly Stock[],
): readonly Stock[] | undefined {
  const position = new Map(order.map((symbol, index) => [symbol, index]));
  if (stocks.some((stock) => !position.has(stock.symbol))) return undefined;
  return [...stocks].sort(
    (first, second) => (position.get(first.symbol) ?? 0) - (position.get(second.symbol) ?? 0),
  );
}

export function holdSortOrder(
  snapshot: SortSnapshot | undefined,
  key: string | undefined,
  stocks: readonly Stock[],
  sortNow: () => readonly Stock[],
): HeldOrder {
  if (key === undefined) return { stocks, snapshot: undefined };
  if (stocks.length === 0) return { stocks, snapshot };
  const kept = snapshot?.key === key ? keepOrder(snapshot.order, stocks) : undefined;
  if (kept !== undefined && snapshot !== undefined) {
    const unchanged = kept.length === snapshot.order.length;
    const order = kept.map((stock) => stock.symbol);
    return { stocks: kept, snapshot: unchanged ? snapshot : { key, order } };
  }
  const sorted = sortNow();
  return { stocks: sorted, snapshot: { key, order: sorted.map((stock) => stock.symbol) } };
}
