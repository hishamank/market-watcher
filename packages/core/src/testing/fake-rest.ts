import type { Bar, HistoryResponse, Quote, Range } from "@mini/contracts";
import type { HttpFetch } from "../rest/rest-client.ts";

export interface FakeRestReply {
  readonly status: number;
  readonly body: unknown;
}

export type FakeRestRoute = (path: string) => FakeRestReply | undefined;

export interface FakeRest {
  readonly fetch: HttpFetch;
  readonly requests: readonly string[];
  countOf(path: string): number;
}

export const FAKE_GATEWAY_URL = "http://gateway.test";

const envelope = { feedMode: "simulated", marketStatus: "open" } as const;

export function createFakeRest(route: FakeRestRoute): FakeRest {
  const requests: string[] = [];
  const fetch: HttpFetch = async (url) => {
    const path = url.startsWith(FAKE_GATEWAY_URL) ? url.slice(FAKE_GATEWAY_URL.length) : url;
    requests.push(path);
    const reply = route(path) ?? notFound(path);
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body };
  };
  return {
    fetch,
    requests,
    countOf: (path) => requests.filter((request) => request === path).length,
  };
}

export function ok(body: unknown): FakeRestReply {
  return { status: 200, body };
}

export function notFound(path: string): FakeRestReply {
  return {
    status: 404,
    body: { ...envelope, error: { code: "not_found", message: `No route ${path}` } },
  };
}

export function stockListBody(quotes: readonly Quote[]) {
  return {
    ...envelope,
    stocks: quotes.map((quote) => ({ symbol: quote.symbol, name: `${quote.symbol} Inc`, quote })),
  };
}

export function stockDetailBody(quote: Quote) {
  return { ...envelope, stock: { symbol: quote.symbol, name: `${quote.symbol} Inc`, quote } };
}

export function dayHistoryBody(symbol: string, bars: readonly Bar[]): HistoryResponse {
  return {
    ...envelope,
    symbol,
    range: "1D",
    barSize: "5m",
    previousClose: "100.00",
    bars: [...bars],
    session: { open: 0, close: 86_400_000 },
  };
}

export function historyPath(symbol: string, range: Range): string {
  return `/stocks/${symbol}/history?range=${range}`;
}
