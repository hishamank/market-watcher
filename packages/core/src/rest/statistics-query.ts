import { StockStatisticsResponseSchema, type StockStatisticsResponse } from "@mini/contracts";
import { queryOptions } from "@tanstack/react-query";
import {
  createRestRequester,
  type AbortSignalLike,
  type RestClientOptions,
} from "./rest-client.ts";

export type StatisticsFetcher = (
  symbol: string,
  signal?: AbortSignalLike,
) => Promise<StockStatisticsResponse>;

export function createStatisticsFetcher(options: RestClientOptions): StatisticsFetcher {
  const request = createRestRequester(options);
  return (symbol, signal) =>
    request(
      `/stocks/${encodeURIComponent(symbol)}/statistics`,
      StockStatisticsResponseSchema,
      signal,
    );
}

export function statisticsQueryOptions(fetchStatistics: StatisticsFetcher, symbol: string) {
  return queryOptions({
    queryKey: ["stock-statistics", symbol],
    queryFn: async ({ signal }) => {
      const data = await fetchStatistics(symbol, signal);
      if (data.symbol !== symbol) throw new Error("Statistics symbol mismatch");
      return data;
    },
    staleTime: 900_000,
    retry: false,
  });
}
