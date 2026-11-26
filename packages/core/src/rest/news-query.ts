import { StockNewsResponseSchema, type StockNewsResponse } from "@mini/contracts";
import { queryOptions } from "@tanstack/react-query";
import {
  createRestRequester,
  type AbortSignalLike,
  type RestClientOptions,
} from "./rest-client.ts";

export type NewsFetcher = (symbol: string, signal?: AbortSignalLike) => Promise<StockNewsResponse>;

export function createNewsFetcher(options: RestClientOptions): NewsFetcher {
  const request = createRestRequester(options);
  return (symbol, signal) =>
    request(`/stocks/${encodeURIComponent(symbol)}/news`, StockNewsResponseSchema, signal);
}

export function newsQueryOptions(fetchNews: NewsFetcher, symbol: string) {
  return queryOptions({
    queryKey: ["stock-news", symbol],
    queryFn: async ({ signal }) => {
      const data = await fetchNews(symbol, signal);
      if (data.symbol !== symbol) throw new Error("News symbol mismatch");
      return data;
    },
    staleTime: 600_000,
    retry: false,
  });
}
