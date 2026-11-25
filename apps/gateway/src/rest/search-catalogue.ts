import {
  type FeedMode,
  MAX_SEARCH_RESULTS,
  type SearchMatch,
  SearchQuerySchema,
  type SearchResponse,
  SearchResponseSchema,
} from "@mini/contracts";
import type { FastifyRequest } from "fastify";
import type { CatalogueEntry, Feed } from "../feeds/types.ts";
import { RestError } from "./errors.ts";

export interface SearchRouteContext {
  readonly feed: Feed;
  readonly feedMode: FeedMode;
  readonly now: () => number;
}

const ALPHANUMERIC = /[a-z0-9]/i;

function matchesWordStart(text: string, needle: string): boolean {
  let index = text.indexOf(needle);
  while (index !== -1) {
    if (index === 0 || !ALPHANUMERIC.test(text[index - 1] ?? "")) {
      return true;
    }
    index = text.indexOf(needle, index + 1);
  }
  return false;
}

function matchRank(entry: CatalogueEntry, needle: string): number | null {
  const symbol = entry.symbol.toLowerCase();
  if (symbol === needle) return 0;
  if (symbol.startsWith(needle)) return 1;
  if (matchesWordStart(entry.name.toLowerCase(), needle)) return 2;
  return null;
}

export function searchCatalogue(
  entries: readonly CatalogueEntry[],
  query: string,
  limit = MAX_SEARCH_RESULTS,
): SearchMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0 || limit <= 0) return [];

  const buckets: [SearchMatch[], SearchMatch[], SearchMatch[]] = [[], [], []];
  for (const entry of entries) {
    const rank = matchRank(entry, needle);
    if (rank !== null) {
      buckets[rank]?.push({ symbol: entry.symbol, name: entry.name });
    }
  }
  return [...buckets[0], ...buckets[1], ...buckets[2]].slice(0, limit);
}

export function handleStockSearch(
  request: FastifyRequest,
  ctx: SearchRouteContext,
): SearchResponse {
  const parsedQuery = SearchQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    throw new RestError(400, "invalid_request", "Invalid search query parameter");
  }
  const results = searchCatalogue(ctx.feed.catalogue.all(), parsedQuery.data.q);
  return SearchResponseSchema.parse({
    feedMode: ctx.feedMode,
    marketStatus: ctx.feed.calendar.status(ctx.now()),
    results,
  });
}
