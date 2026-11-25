import type { Quote } from "@mini/contracts";
import { createFakeGatewayConnection } from "./fake-gateway-connection.ts";
import type {
  FakeGateway,
  FakeGatewayConnection,
  FakeGatewayOptions,
} from "./fake-gateway-types.ts";

export type {
  FakeGateway,
  FakeGatewayConnection,
  FakeGatewayOptions,
} from "./fake-gateway-types.ts";

export function createFakeGateway(options: FakeGatewayOptions = {}): FakeGateway {
  const quotes = new Map<string, Quote>();
  for (const quote of options.initialQuotes ?? []) {
    quotes.set(quote.symbol, quote);
  }
  const unknownSet = new Set(options.unknownSymbols ?? []);
  const connections: FakeGatewayConnection[] = [];

  return {
    socketFactory: (url: string) => {
      const connection = createFakeGatewayConnection({
        url,
        heartbeatIntervalMs: options.heartbeatIntervalMs ?? 5_000,
        maxSubscriptions: options.maxSubscriptions ?? 100,
        feedMode: options.feedMode ?? "simulated",
        marketStatus: options.marketStatus ?? "open",
        autoOpen: options.autoOpen ?? true,
        autoWelcome: options.autoWelcome ?? true,
        autoSnapshot: options.autoSnapshot ?? true,
        holdReplies: options.holdReplies ?? false,
        quotes,
        unknownSet,
      });
      connections.push(connection);
      return connection.socket;
    },
    connections,
    latestConnection() {
      const last = connections[connections.length - 1];
      if (last === undefined) {
        throw new Error("No gateway connections have been opened");
      }
      return last;
    },
    setQuote(quote: Quote) {
      quotes.set(quote.symbol, quote);
    },
    getQuote(symbol: string) {
      return quotes.get(symbol);
    },
    allSentMessages() {
      return connections.flatMap((connection) => connection.sentMessages);
    },
  };
}
