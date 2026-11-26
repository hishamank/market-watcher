import { STOCK_PAGE_SIZE, type StockPageResponse, StockPageResponseSchema } from "@mini/contracts";
import type { Catalogue, CatalogueEntry, Feed } from "../feeds/types.ts";
import type { Warn } from "../hub/quote-book.ts";
import { fetchQuotesMap } from "./quotes.ts";

export interface StockPageContext {
  readonly feed: Feed;
  readonly feedMode: StockPageResponse["feedMode"];
  readonly now: () => number;
  readonly warn: Warn;
}

interface BrowseOrder {
  readonly entries: readonly CatalogueEntry[];
  readonly position: ReadonlyMap<string, number>;
  readonly defaultCount: number;
}

const orders = new WeakMap<readonly CatalogueEntry[], BrowseOrder>();

function bySymbol(a: CatalogueEntry, b: CatalogueEntry): number {
  return a.symbol < b.symbol ? -1 : 1;
}

function browseOrder(catalogue: Catalogue): BrowseOrder {
  const all = catalogue.all();
  const cached = orders.get(all);
  if (cached !== undefined) return cached;
  const defaults = catalogue.defaultList().flatMap((symbol) => catalogue.get(symbol) ?? []);
  const defaultSymbols = new Set(defaults.map((entry) => entry.symbol));
  const rest = all.filter((entry) => !defaultSymbols.has(entry.symbol)).sort(bySymbol);
  const entries = [...defaults, ...rest];
  const position = new Map(entries.map((entry, index) => [entry.symbol, index]));
  const order = { entries, position, defaultCount: defaults.length };
  orders.set(all, order);
  return order;
}

function startAfter(order: BrowseOrder, cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  const known = order.position.get(cursor);
  if (known !== undefined) return known + 1;
  const next = order.entries.findIndex(
    (entry, index) => index >= order.defaultCount && entry.symbol > cursor,
  );
  return next === -1 ? order.entries.length : next;
}

export async function stockPage(
  ctx: StockPageContext,
  cursor: string | undefined,
  limit = STOCK_PAGE_SIZE,
): Promise<StockPageResponse> {
  const order = browseOrder(ctx.feed.catalogue);
  const start = startAfter(order, cursor);
  const entries = order.entries.slice(start, start + limit);
  const last = entries.at(-1);
  const symbols = entries.map((entry) => entry.symbol);
  const quotes = await fetchQuotesMap(ctx.feed, symbols, ctx.warn, ctx.now, {
    allowEmpty: cursor !== undefined,
  });
  const stocks = entries.flatMap((entry) => {
    const quote = quotes.get(entry.symbol);
    return quote === undefined ? [] : [{ symbol: entry.symbol, name: entry.name, quote }];
  });
  return StockPageResponseSchema.parse({
    feedMode: ctx.feedMode,
    marketStatus: ctx.feed.calendar.status(ctx.now()),
    stocks,
    nextCursor: last === undefined || start + limit >= order.entries.length ? null : last.symbol,
  });
}
