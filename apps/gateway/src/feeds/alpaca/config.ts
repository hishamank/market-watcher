export const STREAM_SYMBOL_LIMIT = 30;
export const POLL_INTERVAL_MS = 5_000;
export const SNAPSHOT_BATCH_SIZE = 100;
export const SNAPSHOT_REUSE_MS = 5_000;
export const STATUS_CHECK_INTERVAL_MS = 1_000;
export const CALENDAR_PAST_DAYS = 40;
export const CALENDAR_FUTURE_DAYS = 14;
export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;
export const MAX_BAR_PAGES = 10;
export const REQUEST_BUDGET = 180;
export const HISTORY_REQUEST_BUDGET = 60;
export const BUDGET_WINDOW_MS = 60_000;
export const BACKOFF_BASE_MS = 5_000;
export const BACKOFF_MAX_MS = 60_000;
export const REQUEST_TIMEOUT_MS = 4_000;

export const DEFAULT_TRADING_URL = "https://paper-api.alpaca.markets";
export const DEFAULT_DATA_URL = "https://data.alpaca.markets";
export const DEFAULT_STREAM_URL = "wss://stream.data.alpaca.markets/v2/iex";
export const DATA_FEED = "iex";

export interface AlpacaConfig {
  keyId: string;
  secretKey: string;
  tradingUrl: string;
  dataUrl: string;
  streamUrl: string;
}

export class AlpacaStartupError extends Error {}

type Env = Readonly<Record<string, string | undefined>>;

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

export function readAlpacaConfig(env: Env): AlpacaConfig {
  const keyId = present(env["ALPACA_KEY_ID"]);
  const secretKey = present(env["ALPACA_SECRET_KEY"]);
  if (keyId === undefined || secretKey === undefined) {
    throw new AlpacaStartupError(
      "FEED=alpaca needs ALPACA_KEY_ID and ALPACA_SECRET_KEY in the environment. " +
        "The gateway does not fall back to the simulator.",
    );
  }
  return {
    keyId,
    secretKey,
    tradingUrl: present(env["ALPACA_TRADING_URL"]) ?? DEFAULT_TRADING_URL,
    dataUrl: present(env["ALPACA_DATA_URL"]) ?? DEFAULT_DATA_URL,
    streamUrl: present(env["ALPACA_STREAM_URL"]) ?? DEFAULT_STREAM_URL,
  };
}
