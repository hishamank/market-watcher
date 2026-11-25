import type { AlpacaConfig } from "./config.ts";

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
export type Api = "trading" | "data";
export type Params = Readonly<Record<string, string | undefined>>;

export interface AlpacaHttp {
  get(api: Api, path: string, params?: Params, signal?: AbortSignal): Promise<unknown>;
}

export class AlpacaHttpError extends Error {
  readonly status: number;

  constructor(status: number, path: string) {
    super(`Alpaca answered ${path} with HTTP ${status}`);
    this.status = status;
  }

  get rejectedKeys(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

interface SourceContext {
  source?: string;
}

export function parseExactJson(text: string): unknown {
  return JSON.parse(text, (_key, value: unknown, context?: SourceContext) =>
    typeof value === "number" && context?.source !== undefined ? context.source : value,
  );
}

function buildUrl(base: string, path: string, params: Params): string {
  const url = new URL(path, base);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(name, value);
    }
  }
  return url.toString();
}

export function createAlpacaHttp(config: AlpacaConfig, fetchImpl: Fetch): AlpacaHttp {
  const headers = {
    "APCA-API-KEY-ID": config.keyId,
    "APCA-API-SECRET-KEY": config.secretKey,
    Accept: "application/json",
  };
  return {
    async get(api, path, params = {}, signal) {
      const base = api === "trading" ? config.tradingUrl : config.dataUrl;
      const response = await fetchImpl(buildUrl(base, path, params), {
        headers,
        ...(signal !== undefined ? { signal } : {}),
      });
      if (!response.ok) {
        throw new AlpacaHttpError(response.status, path);
      }
      return parseExactJson(await response.text());
    },
  };
}
