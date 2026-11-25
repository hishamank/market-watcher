import { RECONNECT_BASE_MS, RECONNECT_MAX_MS } from "./config.ts";
import { parseStreamMessage, type StreamEvent } from "./stream-messages.ts";

export interface SocketHandlers {
  message(data: string): void;
  close(): void;
}

export interface StreamSocket {
  send(data: string): void;
  close(): void;
}

export type OpenSocket = (url: string, handlers: SocketHandlers) => StreamSocket;

export interface StreamOptions {
  url: string;
  keyId: string;
  secretKey: string;
  openSocket: OpenSocket;
  onTrade(symbol: string, price: string, time: number): void;
  warn(detail: object, message: string): void;
  random: () => number;
}

export interface TradeStream {
  update(symbols: ReadonlySet<string>): void;
  close(): void;
}

interface Connection {
  readonly socket: StreamSocket;
  authenticated: boolean;
  sent: Set<string>;
}

export function reconnectDelayMs(attempt: number, random: () => number): number {
  return Math.round(random() * Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt));
}

function send(current: Connection, action: string, symbols: string[]): void {
  if (symbols.length > 0) {
    current.socket.send(JSON.stringify({ action, trades: symbols }));
  }
}

function sync(current: Connection, wanted: ReadonlySet<string>): void {
  send(
    current,
    "unsubscribe",
    [...current.sent].filter((symbol) => !wanted.has(symbol)),
  );
  send(
    current,
    "subscribe",
    [...wanted].filter((symbol) => !current.sent.has(symbol)),
  );
  current.sent = new Set(wanted);
}

export function createTradeStream(options: StreamOptions): TradeStream {
  let wanted = new Set<string>();
  let connection: Connection | undefined;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const handle = (current: Connection, event: StreamEvent): void => {
    if (event.kind === "connected") {
      const { keyId: key, secretKey: secret } = options;
      current.socket.send(JSON.stringify({ action: "auth", key, secret }));
    } else if (event.kind === "authenticated") {
      current.authenticated = true;
      attempt = 0;
      sync(current, wanted);
    } else if (event.kind === "error") {
      options.warn({ code: event.code, msg: event.msg }, "Alpaca stream sent an error");
    } else {
      options.onTrade(event.symbol, event.price, event.time);
    }
  };
  const receive = (current: Connection, data: string): void =>
    parseStreamMessage(data).forEach((event) => handle(current, event));

  const connect = (): void => {
    timer = undefined;
    if (closed || connection !== undefined || wanted.size === 0) {
      return;
    }
    let current: Connection | undefined;
    const handlers: SocketHandlers = {
      message: (data) => {
        if (current !== undefined && current === connection) receive(current, data);
      },
      close: () => {
        if (current === undefined || current !== connection) return;
        connection = undefined;
        if (!closed) {
          timer = setTimeout(connect, reconnectDelayMs(attempt, options.random));
          attempt += 1;
        }
      },
    };
    current = {
      socket: options.openSocket(options.url, handlers),
      authenticated: false,
      sent: new Set(),
    };
    connection = current;
  };

  return {
    update(symbols) {
      wanted = new Set(symbols);
      if (connection === undefined && timer === undefined) {
        connect();
      } else if (connection?.authenticated) {
        sync(connection, wanted);
      }
    },
    close() {
      closed = true;
      clearTimeout(timer);
      connection?.socket.close();
      connection = undefined;
    },
  };
}
