import type {
  ClientMessage,
  FeedMode,
  MarketStatus,
  Quote,
  RequestId,
  ServerMessage,
  SymbolErrorCode,
  WelcomeMessage,
} from "@mini/contracts";
import type { RealtimeSocket, SocketFactory } from "../realtime/transport.ts";

export interface FakeGatewayOptions {
  heartbeatIntervalMs?: number | undefined;
  maxSubscriptions?: number | undefined;
  feedMode?: FeedMode | undefined;
  marketStatus?: MarketStatus | undefined;
  autoOpen?: boolean | undefined;
  autoWelcome?: boolean | undefined;
  autoSnapshot?: boolean | undefined;
  holdReplies?: boolean | undefined;
  initialQuotes?: readonly Quote[] | undefined;
  unknownSymbols?: readonly string[] | undefined;
}

export interface FakeGatewayConnection {
  readonly url: string;
  readonly socket: RealtimeSocket;
  readonly sentMessages: readonly ClientMessage[];
  readonly rawSentFrames: readonly string[];
  readonly subscribedSymbols: ReadonlySet<string>;
  open(): void;
  sendServerMessage(message: ServerMessage): void;
  sendWelcome(overrides?: Partial<WelcomeMessage>): void;
  sendSnapshot(quotes: Quote[], requestId?: RequestId): void;
  sendQuotes(quotes: Quote[]): void;
  sendHeartbeat(skippedFrames?: number): void;
  sendMarketStatus(marketStatus: MarketStatus): void;
  sendSymbolError(code: SymbolErrorCode, symbols: string[], requestId?: RequestId): void;
  sendRateLimited(requestId?: RequestId): void;
  lastRequestId(): RequestId;
  heldRequestIds(): RequestId[];
  deliverHeldReplies(count?: number): void;
  deliverReply(requestId: RequestId): void;
  discardReply(requestId: RequestId): void;
  sendRaw(raw: unknown): void;
  drop(code?: number, reason?: string): void;
  emitError(error?: unknown): void;
}

export interface FakeGateway {
  readonly socketFactory: SocketFactory;
  readonly connections: readonly FakeGatewayConnection[];
  latestConnection(): FakeGatewayConnection;
  setQuote(quote: Quote): void;
  getQuote(symbol: string): Quote | undefined;
  allSentMessages(): ClientMessage[];
}

export function defaultQuoteFor(symbol: string): Quote {
  return {
    symbol,
    price: "100.00",
    change: "0.00",
    changePercent: "0.00",
    previousClose: "100.00",
    timestamp: 1_764_000_000_000,
  };
}
