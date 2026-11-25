"use client";

import type { SearchMatch } from "@mini/contracts";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCore } from "../core-provider.tsx";
import { cancelTimeout, scheduleTimeout } from "../realtime/timers.ts";
import { SEARCH_DEBOUNCE_MS, searchQueryOptions } from "../rest/search-query.ts";

export interface SearchResult {
  readonly query: string;
  readonly results: readonly SearchMatch[];
  readonly status: "idle" | "loading" | "success" | "error";
  readonly isFetching: boolean;
  readonly error: Error | null;
  readonly retry: () => void;
}

const NO_RESULTS: readonly SearchMatch[] = [];

function deriveStatus(
  trimmed: string,
  activeQuery: string,
  isPending: boolean,
  isError: boolean,
  isFetching: boolean,
): SearchResult["status"] {
  if (trimmed.length === 0) return "idle";
  if (activeQuery.length === 0) return "loading";
  if (isPending || (isError && isFetching)) return "loading";
  if (isError) return "error";
  return "success";
}

export function useSearch(query: string): SearchResult {
  const { searchStocks, track } = useCore();
  const trimmed = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const delayMs = trimmed.length === 0 ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = scheduleTimeout(() => {
      setDebouncedQuery(trimmed);
    }, delayMs);
    return () => cancelTimeout(timer);
  }, [trimmed]);

  const activeQuery = trimmed.length === 0 ? "" : debouncedQuery;

  const { data, error, isPending, isError, isFetching, refetch } = useQuery(
    searchQueryOptions(searchStocks, activeQuery, (resolvedQuery, resultCount) => {
      track({ name: "search_performed", queryLength: resolvedQuery.length, resultCount });
    }),
  );

  const status = deriveStatus(trimmed, activeQuery, isPending, isError, isFetching);
  const results = status === "success" ? (data?.results ?? NO_RESULTS) : NO_RESULTS;
  const activeFetching = activeQuery.length > 0 && isFetching;
  const activeError = status === "error" ? error : null;

  const retry = useCallback(() => {
    if (activeQuery.length > 0) {
      void refetch();
    }
  }, [activeQuery, refetch]);

  return useMemo(
    () => ({
      query: activeQuery,
      results,
      status,
      isFetching: activeFetching,
      error: activeError,
      retry,
    }),
    [activeQuery, results, status, activeFetching, activeError, retry],
  );
}
