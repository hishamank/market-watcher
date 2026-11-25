"use client";

import {
  changeBetween,
  type Bar,
  type Change,
  type HistoryResponse,
  type Quote,
  type Range,
  type Session,
} from "@mini/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { mergeLiveQuote } from "../history/merge-live-quote.ts";
import { useQuote } from "./use-quote.ts";
import { useHistory } from "./use-stocks.ts";

export interface LiveHistoryResult {
  readonly status: UseQueryResult<HistoryResponse>["status"];
  readonly error: Error | null;
  readonly refetch: UseQueryResult<HistoryResponse>["refetch"];
  readonly bars: readonly Bar[];
  readonly baseline: string | undefined;
  readonly previousClose: string | undefined;
  readonly rangeChange: Change | undefined;
  readonly session: Session | undefined;
  readonly ageMs: number | undefined;
  readonly asOf: number | undefined;
}

const NO_BARS: readonly Bar[] = [];

function baselineOf(history: HistoryResponse): string | undefined {
  return history.range === "1D" ? history.previousClose : history.bars[0]?.close;
}

function rangeChangeOf(baseline: string | undefined, bars: readonly Bar[]): Change | undefined {
  const last = bars.at(-1);
  if (baseline === undefined || last === undefined) return undefined;
  return changeBetween(baseline, last.close);
}

function asOfOf(history: HistoryResponse, updatedAt: number): number | undefined {
  return history.ageMs === undefined ? undefined : updatedAt - history.ageMs;
}

interface HistoryInputs {
  readonly status: LiveHistoryResult["status"];
  readonly error: Error | null;
  readonly refetch: LiveHistoryResult["refetch"];
  readonly data: HistoryResponse | undefined;
  readonly dataUpdatedAt: number;
}

function deriveLiveHistory(input: HistoryInputs, quote: Quote | undefined): LiveHistoryResult {
  const { status, error, refetch, data, dataUpdatedAt } = input;
  const base = { status, error, refetch };
  if (data === undefined) {
    return {
      ...base,
      bars: NO_BARS,
      baseline: undefined,
      previousClose: undefined,
      rangeChange: undefined,
      session: undefined,
      ageMs: undefined,
      asOf: undefined,
    };
  }
  const bars = data.ageMs === undefined ? mergeLiveQuote(data, quote) : data.bars;
  const baseline = baselineOf(data);
  return {
    ...base,
    bars,
    baseline,
    previousClose: data.previousClose,
    rangeChange: rangeChangeOf(baseline, bars),
    session: data.range === "1D" ? data.session : undefined,
    ageMs: data.ageMs,
    asOf: asOfOf(data, dataUpdatedAt),
  };
}

export function useLiveHistory(symbol: string, range: Range): LiveHistoryResult {
  const { status, error, refetch, data, dataUpdatedAt } = useHistory(symbol, range);
  const quote = useQuote(symbol);
  return useMemo(
    () => deriveLiveHistory({ status, error, refetch, data, dataUpdatedAt }, quote),
    [status, error, refetch, data, dataUpdatedAt, quote],
  );
}
