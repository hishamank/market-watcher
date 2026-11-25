"use client";

import type {
  HistoryResponse,
  Range,
  StockDetailResponse,
  StockListResponse,
} from "@mini/contracts";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useCore } from "../core-provider.tsx";
import {
  historyQueryOptions,
  stockListQueryOptions,
  stockQueryOptions,
  stocksBySymbolsQueryOptions,
} from "../rest/stock-queries.ts";

export function useStockList(): UseQueryResult<StockListResponse> {
  const { restClient, quoteStore } = useCore();
  return useQuery(stockListQueryOptions(restClient, quoteStore));
}

export function useStocks(symbols: readonly string[]): UseQueryResult<StockListResponse> {
  const { restClient, quoteStore } = useCore();
  return useQuery(stocksBySymbolsQueryOptions(restClient, symbols, quoteStore));
}

export function useStock(symbol: string): UseQueryResult<StockDetailResponse> {
  const { restClient, quoteStore } = useCore();
  return useQuery(stockQueryOptions(restClient, symbol, quoteStore));
}

export function useHistory(symbol: string, range: Range): UseQueryResult<HistoryResponse> {
  const { restClient } = useCore();
  return useQuery(historyQueryOptions(restClient, symbol, range));
}
