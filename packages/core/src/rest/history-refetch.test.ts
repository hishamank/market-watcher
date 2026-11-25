import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "../realtime/quote-store.ts";
import { createSocketClient } from "../realtime/socket-client.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork, makeQuote } from "../testing/fake-platform.ts";
import {
  createFakeRest,
  dayHistoryBody,
  FAKE_GATEWAY_URL,
  historyPath,
  ok,
  stockListBody,
} from "../testing/fake-rest.ts";
import { refetchHistoryOnReconnect } from "./history-refetch.ts";
import { createRestClient } from "./rest-client.ts";
import { historyQueryOptions, stockListQueryOptions } from "./stock-queries.ts";

function setup() {
  const gateway = createFakeGateway();
  const socketClient = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore: createQuoteStore(),
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    onWarning: () => {},
  });
  const rest = createFakeRest((path) => {
    if (path === "/stocks") return ok(stockListBody([makeQuote("AAPL", "190.00", 1)]));
    if (path.includes("/history")) return ok(dayHistoryBody("AAPL", [{ time: 1, close: "1.00" }]));
    return undefined;
  });
  const restClient = createRestClient({ gatewayUrl: FAKE_GATEWAY_URL, fetch: rest.fetch });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { gateway, socketClient, rest, restClient, queryClient };
}

describe("history refetch on reconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refetches only the active history queries when the socket returns to connected", async () => {
    const { gateway, socketClient, rest, restClient, queryClient } = setup();
    const stop = refetchHistoryOnReconnect(socketClient, queryClient);
    const visible = new QueryObserver(queryClient, historyQueryOptions(restClient, "AAPL", "1D"));
    const unsubscribe = visible.subscribe(() => {});
    const list = new QueryObserver(queryClient, stockListQueryOptions(restClient));
    const unsubscribeList = list.subscribe(() => {});
    await queryClient.prefetchQuery(historyQueryOptions(restClient, "AAPL", "1Y"));
    await vi.advanceTimersByTimeAsync(0);

    socketClient.acquireSymbol("AAPL");
    socketClient.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(socketClient.getStatus()).toBe("connected");
    expect(rest.countOf(historyPath("AAPL", "1D"))).toBe(1);

    gateway.latestConnection().drop();
    expect(socketClient.getStatus()).toBe("stale");
    await vi.advanceTimersByTimeAsync(500);
    expect(socketClient.getStatus()).toBe("connected");
    await vi.advanceTimersByTimeAsync(0);

    expect(rest.countOf(historyPath("AAPL", "1D"))).toBe(2);
    expect(rest.countOf(historyPath("AAPL", "1Y"))).toBe(1);
    expect(rest.countOf("/stocks")).toBe(1);

    stop();
    gateway.latestConnection().drop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(socketClient.getStatus()).toBe("connected");
    expect(rest.countOf(historyPath("AAPL", "1D"))).toBe(2);

    unsubscribe();
    unsubscribeList();
    socketClient.stop();
  });
});
