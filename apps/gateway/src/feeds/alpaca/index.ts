import { WebSocket } from "ws";
import type { Feed } from "../types.ts";
import { type AlpacaCalendar, loadAlpacaCalendar } from "./calendar.ts";
import { type AlpacaCatalogue, loadAlpacaCatalogue } from "./catalogue.ts";
import { type AlpacaConfig, AlpacaStartupError, DATA_FEED, readAlpacaConfig } from "./config.ts";
import { type AlpacaHttp, AlpacaHttpError, createAlpacaHttp, type Fetch } from "./http.ts";
import { createAlpacaHistory } from "./history.ts";
import { type AlpacaLive, createAlpacaLive } from "./live.ts";
import { createTradeStream, type OpenSocket } from "./stream.ts";

export { AlpacaStartupError } from "./config.ts";

export interface AlpacaFeed extends Feed {
  readonly live: AlpacaLive;
  readonly catalogue: AlpacaCatalogue;
  readonly calendar: AlpacaCalendar;
  close(): void;
}

export interface AlpacaDependencies {
  fetch?: Fetch;
  openSocket?: OpenSocket;
  now?: () => number;
  random?: () => number;
  warn?: (detail: object, message: string) => void;
}

type Env = Readonly<Record<string, string | undefined>>;

export const openWebSocket: OpenSocket = (url, handlers) => {
  const socket = new WebSocket(url);
  socket.on("message", (data: Buffer) => handlers.message(data.toString()));
  socket.on("close", () => handlers.close());
  socket.on("error", () => undefined);
  return { send: (data) => socket.send(data), close: () => socket.close() };
};

function startupError(err: unknown): AlpacaStartupError {
  if (err instanceof AlpacaHttpError && err.rejectedKeys) {
    return new AlpacaStartupError(
      `Alpaca rejected ALPACA_KEY_ID and ALPACA_SECRET_KEY (${err.message}). ` +
        "The gateway does not fall back to the simulator.",
    );
  }
  const reason = err instanceof Error ? err.message : String(err);
  return new AlpacaStartupError(`Alpaca could not be reached at startup: ${reason}`);
}

async function probeMarketData(http: AlpacaHttp): Promise<void> {
  await http.get("data", "/v2/stocks/snapshots", { symbols: "SPY", feed: DATA_FEED });
}

export async function createAlpacaFeed(
  config: AlpacaConfig,
  deps: AlpacaDependencies = {},
): Promise<AlpacaFeed> {
  const now = deps.now ?? (() => Date.now());
  const warn = deps.warn ?? ((detail, message) => console.warn(message, detail));
  const http = createAlpacaHttp(config, deps.fetch ?? ((url, init) => fetch(url, init)));
  const [calendarResult, catalogueResult, probe] = await Promise.allSettled([
    loadAlpacaCalendar(http, now, warn),
    loadAlpacaCatalogue(http, warn),
    probeMarketData(http),
  ]);
  if (
    calendarResult.status === "rejected" ||
    catalogueResult.status === "rejected" ||
    probe.status === "rejected"
  ) {
    if (calendarResult.status === "fulfilled") calendarResult.value.close();
    const failure = [calendarResult, catalogueResult, probe].find(
      (result) => result.status === "rejected",
    );
    throw startupError(failure?.reason);
  }
  const calendar = calendarResult.value;
  const catalogue = catalogueResult.value;
  const live = createAlpacaLive({
    http,
    calendar,
    now,
    warn,
    openStream: (onTrade) =>
      createTradeStream({
        url: config.streamUrl,
        keyId: config.keyId,
        secretKey: config.secretKey,
        openSocket: deps.openSocket ?? openWebSocket,
        onTrade,
        warn,
        random: deps.random ?? Math.random,
      }),
  });
  calendar.onStatusChange(() => {
    void catalogue.refresh();
    live
      .resync()
      .catch((err: unknown) => warn({ err }, "Alpaca resync after status change failed"));
  });
  return {
    live,
    history: createAlpacaHistory(http, calendar),
    catalogue,
    calendar,
    close() {
      live.close();
      calendar.close();
    },
  };
}

export function loadAlpacaFeed(env: Env, deps: AlpacaDependencies = {}): Promise<AlpacaFeed> {
  return Promise.resolve()
    .then(() => readAlpacaConfig(env))
    .then((config) => createAlpacaFeed(config, deps));
}
