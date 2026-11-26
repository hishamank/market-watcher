import { StockEarningsResponseSchema, type StockEarningsResponse } from "@mini/contracts";
import { queryOptions } from "@tanstack/react-query";
import {
  createRestRequester,
  type AbortSignalLike,
  type RestClientOptions,
} from "./rest-client.ts";

export type EarningsFetcher = (
  symbol: string,
  signal?: AbortSignalLike,
) => Promise<StockEarningsResponse>;

export function createEarningsFetcher(options: RestClientOptions): EarningsFetcher {
  const request = createRestRequester(options);
  return (symbol, signal) =>
    request(`/stocks/${encodeURIComponent(symbol)}/earnings`, StockEarningsResponseSchema, signal);
}

export function earningsQueryOptions(fetchEarnings: EarningsFetcher, symbol: string) {
  return queryOptions({
    queryKey: ["stock-earnings", symbol],
    queryFn: async ({ signal }) => {
      const data = await fetchEarnings(symbol, signal);
      if (data.symbol !== symbol) throw new Error("Earnings symbol mismatch");
      return data;
    },
    staleTime: 900_000,
    retry: false,
  });
}
