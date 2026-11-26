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
  readonly source: readonly CatalogueEntry[];
  readonly entries: readonly CatalogueEntry[];
  readonly position: ReadonlyMap<string, number>;
  readonly defaultCount: number;
}

interface BrowseOrders {
  readonly latest: BrowseOrder;
  readonly previous: BrowseOrder | undefined;
}

const ordersByCatalogue = new WeakMap<Catalogue, BrowseOrders>();

function bySymbol(a: CatalogueEntry, b: CatalogueEntry): number {
  return a.symbol < b.symbol ? -1 : 1;
}

function buildOrder(catalogue: Catalogue, all: readonly CatalogueEntry[]): BrowseOrder {
  const defaults = catalogue.defaultList().flatMap((symbol) => catalogue.get(symbol) ?? []);
  const defaultSymbols = new Set(defaults.map((entry) => entry.symbol));
  const rest = all.filter((entry) => !defaultSymbols.has(entry.symbol)).sort(bySymbol);
  const entries = [...defaults, ...rest];
  const position = new Map(entries.map((entry, index) => [entry.symbol, index]));
  return { source: all, entries, position, defaultCount: defaults.length };
}

function browseOrders(catalogue: Catalogue): BrowseOrders {
  const all = catalogue.all();
  const known = ordersByCatalogue.get(catalogue);
  if (known?.latest.source === all) return known;
  const orders = { latest: buildOrder(catalogue, all), previous: known?.latest };
  ordersByCatalogue.set(catalogue, orders);
  return orders;
}

function nextListedAfter(orders: BrowseOrders, cursor: string): number | undefined {
  const { latest, previous } = orders;
  const before = previous?.position.get(cursor);
  if (previous === undefined || before === undefined) return undefined;
  const listed = previous.entries
    .slice(before + 1)
    .find((entry) => latest.position.has(entry.symbol));
  return listed === undefined ? latest.entries.length : latest.position.get(listed.symbol);
}

function startAfter(orders: BrowseOrders, cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  const order = orders.latest;
  const known = order.position.get(cursor);
  if (known !== undefined) return known + 1;
  const listed = nextListedAfter(orders, cursor);
  if (listed !== undefined) return listed;
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
  const orders = browseOrders(ctx.feed.catalogue);
  const order = orders.latest;
  const start = startAfter(orders, cursor);
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
