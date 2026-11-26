import type { Bar, MarketStatus, Quote, Range, Session } from "@mini/contracts";

export interface CatalogueEntry {
  symbol: string;
  name: string;
}

export interface Catalogue {
  all(): readonly CatalogueEntry[];
  get(symbol: string): CatalogueEntry | undefined;
  defaultList(): readonly string[];
}

export interface LiveFeed {
  subscribe(symbols: readonly string[]): void;
  unsubscribe(symbols: readonly string[]): void;
  snapshot(symbols: readonly string[]): Promise<Quote[]>;
  onQuote(listener: (quote: Quote) => void): () => void;
  lastKnown?(symbols: readonly string[]): Quote[];
  watchCount?(symbol: string, count: number): void;
}

export interface HistoryRequest {
  symbol: string;
  range: Range;
  now: number;
  signal?: AbortSignal;
}

export interface HistorySeries {
  bars: Bar[];
  previousClose: string;
  session?: Session;
}

export interface HistorySource {
  history(request: HistoryRequest): Promise<HistorySeries>;
}

export interface MarketCalendar {
  status(now: number): MarketStatus;
  session(now: number): Session;
  onStatusChange(listener: (status: MarketStatus) => void): () => void;
}

export interface Feed {
  live: LiveFeed;
  history: HistorySource;
  catalogue: Catalogue;
  calendar: MarketCalendar;
}
