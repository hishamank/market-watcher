import {
  type HistoryResponse,
  HistoryResponseSchema,
  type Range,
  type RestErrorCode,
  type RestErrorResponse,
  RestErrorResponseSchema,
  type StockDetailResponse,
  StockDetailResponseSchema,
  type StockListResponse,
  StockListResponseSchema,
} from "@mini/contracts";

export interface AbortSignalLike {
  readonly aborted: boolean;
}

export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export interface HttpRequestInit {
  readonly signal?: AbortSignalLike | undefined;
  readonly headers: Readonly<Record<string, string>>;
}

export type HttpFetch = (url: string, init: HttpRequestInit) => Promise<HttpResponse>;

export type RestClientErrorCode = RestErrorCode | "network_error" | "invalid_response";

export class RestClientError extends Error {
  readonly status: number;
  readonly code: RestClientErrorCode;
  readonly body: RestErrorResponse | undefined;

  constructor(
    status: number,
    code: RestClientErrorCode,
    message: string,
    body?: RestErrorResponse,
  ) {
    super(message);
    this.name = "RestClientError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export interface RestClient {
  listStocks(signal?: AbortSignalLike): Promise<StockListResponse>;
  getStocks(symbols: readonly string[], signal?: AbortSignalLike): Promise<StockListResponse>;
  getStock(symbol: string, signal?: AbortSignalLike): Promise<StockDetailResponse>;
  getHistory(symbol: string, range: Range, signal?: AbortSignalLike): Promise<HistoryResponse>;
}

export interface RestClientOptions {
  gatewayUrl: string;
  fetch?: HttpFetch | undefined;
}

interface ResponseSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

interface GlobalWithFetch {
  fetch?: HttpFetch;
}

export function createDefaultFetch(): HttpFetch {
  return (url, init) => {
    const globalFetch = (globalThis as unknown as GlobalWithFetch).fetch;
    if (typeof globalFetch !== "function") {
      return Promise.reject(new Error("Global fetch is not available"));
    }
    return globalFetch(url, init);
  };
}

export function buildRestBaseUrl(gatewayUrl: string): string {
  return gatewayUrl
    .replace(/\/+$/, "")
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://");
}

async function readJson(response: HttpResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function toError(status: number, payload: unknown): RestClientError {
  const parsed = RestErrorResponseSchema.safeParse(payload);
  if (parsed.success) {
    const { code, message } = parsed.data.error;
    return new RestClientError(status, code, message, parsed.data);
  }
  return new RestClientError(status, "invalid_response", `Unexpected gateway response ${status}`);
}

export function createRestClient(options: RestClientOptions): RestClient {
  const baseUrl = buildRestBaseUrl(options.gatewayUrl);
  const fetchFn = options.fetch ?? createDefaultFetch();

  async function request<T>(
    path: string,
    schema: ResponseSchema<T>,
    signal?: AbortSignalLike,
  ): Promise<T> {
    let response: HttpResponse;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        signal,
        headers: { accept: "application/json" },
      });
    } catch (error) {
      if (signal?.aborted === true) throw error;
      throw new RestClientError(0, "network_error", "The gateway could not be reached");
    }
    const payload = await readJson(response);
    if (!response.ok) {
      throw toError(response.status, payload);
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new RestClientError(response.status, "invalid_response", "Unexpected gateway response");
    }
    return parsed.data;
  }

  const segment = (value: string) => encodeURIComponent(value);

  return {
    listStocks: (signal) => request("/stocks", StockListResponseSchema, signal),
    getStocks: (symbols, signal) =>
      request(`/stocks?symbols=${segment(symbols.join(","))}`, StockListResponseSchema, signal),
    getStock: (symbol, signal) =>
      request(`/stocks/${segment(symbol)}`, StockDetailResponseSchema, signal),
    getHistory: (symbol, range, signal) =>
      request(
        `/stocks/${segment(symbol)}/history?range=${segment(range)}`,
        HistoryResponseSchema,
        signal,
      ),
  };
}
