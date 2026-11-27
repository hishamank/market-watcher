import { type SearchResponse, SearchResponseSchema } from "@mini/contracts";
import { queryOptions } from "@tanstack/react-query";
import {
  type AbortSignalLike,
  createRestRequester,
  type RestClientOptions,
} from "./rest-client.ts";

export const SEARCH_DEBOUNCE_MS = 150;
export const SEARCH_STALE_MS = 60_000;

export type SearchFetcher = (query: string, signal?: AbortSignalLike) => Promise<SearchResponse>;

export function createSearchFetcher(options: RestClientOptions): SearchFetcher {
  const request = createRestRequester(options);
  return (query, signal) =>
    request(`/stocks/search?q=${encodeURIComponent(query)}`, SearchResponseSchema, signal);
}

export function searchQueryKey(query: string) {
  return ["stocks", "search", query.toLowerCase()] as const;
}

export function searchQueryOptions(searchStocks: SearchFetcher, query: string) {
  return queryOptions({
    queryKey: searchQueryKey(query),
    queryFn: ({ signal }) => searchStocks(query, signal),
    enabled: query.length > 0,
    staleTime: SEARCH_STALE_MS,
    retry: false,
  });
}
