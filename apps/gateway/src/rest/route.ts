import {
  BAR_SIZE_BY_RANGE,
  type FeedMode,
  HistoryQuerySchema,
  type HistoryResponse,
  HistoryResponseSchema,
  type StockDetailResponse,
  StockDetailResponseSchema,
  StockListQuerySchema,
  type StockListResponse,
  StockListResponseSchema,
  type StockPageResponse,
  StockSymbolParamsSchema,
} from "@mini/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { CatalogueEntry, Feed, HistorySource } from "../feeds/types.ts";
import type { Warn } from "../hub/quote-book.ts";
import { RestError } from "./errors.ts";
import { type ConnectionStats, healthResponse } from "./health.ts";
import { createHistoryCache, type HistoryCache } from "./history-cache.ts";
import { fetchQuotesMap } from "./quotes.ts";
import { handleStockSearch } from "./search-catalogue.ts";
import { stockPage } from "./stock-pages.ts";

export interface RestRouteOptions {
  feed: Feed;
  feedMode: FeedMode;
  now: () => number;
  connectionStats: () => ConnectionStats;
  revision?: string;
  historyFallbacks?: readonly HistorySource[];
  historyCacheMaxEntries?: number;
  historySourceTimeoutMs?: number;
}

interface RouteContext {
  readonly feed: Feed;
  readonly feedMode: FeedMode;
  readonly now: () => number;
  readonly warn: Warn;
  readonly historyCache: HistoryCache;
}

function resolveEntries(feed: Feed, symbols: readonly string[]): CatalogueEntry[] {
  const entries: CatalogueEntry[] = [];
  for (const symbol of new Set(symbols)) {
    const entry = feed.catalogue.get(symbol);
    if (entry !== undefined) {
      entries.push(entry);
    }
  }
  return entries;
}

async function handleStockList(
  request: FastifyRequest,
  ctx: RouteContext,
): Promise<StockListResponse | StockPageResponse> {
  const parsedQuery = StockListQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    throw new RestError(400, "invalid_request", "Invalid stock list query parameters");
  }
  const { symbols, cursor, limit } = parsedQuery.data;
  if (cursor !== undefined || limit !== undefined) return stockPage(ctx, cursor, limit);
  const requested = symbols ?? ctx.feed.catalogue.defaultList();
  const entries = resolveEntries(ctx.feed, requested);
  const quotes = await fetchQuotesMap(
    ctx.feed,
    entries.map((entry) => entry.symbol),
    ctx.warn,
    ctx.now,
  );
  const stocks = entries.flatMap((entry) => {
    const quote = quotes.get(entry.symbol);
    return quote === undefined ? [] : [{ symbol: entry.symbol, name: entry.name, quote }];
  });
  return StockListResponseSchema.parse({
    feedMode: ctx.feedMode,
    marketStatus: ctx.feed.calendar.status(ctx.now()),
    stocks,
  });
}

async function handleStockDetail(
  request: FastifyRequest,
  ctx: RouteContext,
): Promise<StockDetailResponse> {
  const parsedParams = StockSymbolParamsSchema.safeParse(request.params);
  if (!parsedParams.success) {
    throw new RestError(400, "invalid_request", "Invalid symbol parameter");
  }
  const entry = ctx.feed.catalogue.get(parsedParams.data.symbol);
  if (entry === undefined) {
    throw new RestError(404, "not_found", `Symbol ${parsedParams.data.symbol} not found`);
  }
  const quotes = await fetchQuotesMap(ctx.feed, [entry.symbol], ctx.warn, ctx.now);
  const quote = quotes.get(entry.symbol);
  if (quote === undefined) {
    throw new RestError(503, "unavailable", `Quote for ${entry.symbol} is unavailable`);
  }
  return StockDetailResponseSchema.parse({
    feedMode: ctx.feedMode,
    marketStatus: ctx.feed.calendar.status(ctx.now()),
    stock: { symbol: entry.symbol, name: entry.name, quote },
  });
}

async function handleStockHistory(
  request: FastifyRequest,
  ctx: RouteContext,
): Promise<HistoryResponse> {
  const parsedParams = StockSymbolParamsSchema.safeParse(request.params);
  if (!parsedParams.success) {
    throw new RestError(400, "invalid_request", "Invalid symbol parameter");
  }
  const parsedQuery = HistoryQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    throw new RestError(400, "invalid_request", "Invalid range query parameter");
  }
  const entry = ctx.feed.catalogue.get(parsedParams.data.symbol);
  if (entry === undefined) {
    throw new RestError(404, "not_found", `Symbol ${parsedParams.data.symbol} not found`);
  }
  const { range } = parsedQuery.data;
  let result;
  try {
    result = await ctx.historyCache.get(entry.symbol, range);
  } catch {
    throw new RestError(503, "unavailable", `History for ${entry.symbol} is unavailable`);
  }
  const currentNow = ctx.now();
  const base = {
    feedMode: ctx.feedMode,
    marketStatus: ctx.feed.calendar.status(currentNow),
    symbol: entry.symbol,
    range,
    barSize: BAR_SIZE_BY_RANGE[range],
    previousClose: result.series.previousClose,
    bars: result.series.bars,
    ...(result.ageMs !== undefined ? { ageMs: result.ageMs } : {}),
  };
  const payload =
    range === "1D"
      ? { ...base, session: result.series.session ?? ctx.feed.calendar.session(currentNow) }
      : base;
  return HistoryResponseSchema.parse(payload);
}

export async function restRoute(app: FastifyInstance, options: RestRouteOptions): Promise<void> {
  const warn: Warn = (detail, message) => app.log.warn(detail, message);
  const sources: readonly HistorySource[] = [
    options.feed.history,
    ...(options.historyFallbacks ?? []),
  ];
  const historyCache = createHistoryCache({
    sources,
    calendar: options.feed.calendar,
    now: options.now,
    warn,
    ...(options.historyCacheMaxEntries !== undefined
      ? { maxEntries: options.historyCacheMaxEntries }
      : {}),
    ...(options.historySourceTimeoutMs !== undefined
      ? { sourceTimeoutMs: options.historySourceTimeoutMs }
      : {}),
  });

  app.addHook("onClose", async () => {
    historyCache.close();
  });

  const ctx: RouteContext = {
    feed: options.feed,
    feedMode: options.feedMode,
    now: options.now,
    warn,
    historyCache,
  };

  app.get("/stocks", (request) => handleStockList(request, ctx));
  app.get("/stocks/search", (request) => handleStockSearch(request, ctx));
  app.get("/stocks/:symbol", (request) => handleStockDetail(request, ctx));
  app.get("/stocks/:symbol/history", (request) => handleStockHistory(request, ctx));
  app.get("/health", () =>
    healthResponse(options.connectionStats(), historyCache.stats(), options.revision),
  );
}
