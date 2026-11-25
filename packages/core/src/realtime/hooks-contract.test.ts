import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSocketUrl, createCoreServices, createDefaultSocket } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
} from "../testing/fake-platform.ts";

describe("core services, transport seam and hook contracts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds versioned websocket urls from http, https and ws gateway urls", () => {
    expect(buildSocketUrl("http://localhost:4000")).toBe("ws://localhost:4000/ws?v=1");
    expect(buildSocketUrl("http://localhost:4000/")).toBe("ws://localhost:4000/ws?v=1");
    expect(buildSocketUrl("https://api.example.com")).toBe("wss://api.example.com/ws?v=1");
    expect(buildSocketUrl("ws://localhost:4000/ws")).toBe("ws://localhost:4000/ws?v=1");
    expect(buildSocketUrl("wss://api.example.com/ws?v=1")).toBe("wss://api.example.com/ws?v=1");
  });

  it("isolates stores and socket clients across separate provider instances", () => {
    const gatewayA = createFakeGateway();
    const gatewayB = createFakeGateway();

    const instanceA = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gatewayA.socketFactory,
    });
    const instanceB = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("offline"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gatewayB.socketFactory,
    });

    instanceA.socketClient.start();
    instanceB.socketClient.start();
    vi.advanceTimersByTime(0);

    instanceA.quoteStore.upsert(makeQuote("AAPL", "200.00", 1_000));

    expect(instanceA.socketClient.getStatus()).toBe("connected");
    expect(instanceB.socketClient.getStatus()).toBe("offline");
    expect(instanceA.quoteStore.getQuote("AAPL")?.price).toBe("200.00");
    expect(instanceB.quoteStore.getQuote("AAPL")).toBeUndefined();
    expect(gatewayA.latestConnection().url).toBe("ws://localhost:4000/ws?v=1");
    expect(gatewayB.connections).toHaveLength(0);

    instanceA.socketClient.stop();
    instanceB.socketClient.stop();
  });

  it("supports the useSyncExternalStore subscribe and snapshot contract for quotes and status", () => {
    const gateway = createFakeGateway({ autoWelcome: false });
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gateway.socketFactory,
    });

    const statusSnapshots: string[] = [];
    const unsubscribeStatus = services.socketClient.subscribeStatus(() => {
      statusSnapshots.push(services.socketClient.getStatus());
    });

    const aaplSnapshots: Array<string | undefined> = [];
    const unsubscribeQuote = services.quoteStore.subscribe("AAPL", () => {
      aaplSnapshots.push(services.quoteStore.getQuote("AAPL")?.price);
    });

    expect(services.socketClient.getStatus()).toBe("connecting");
    expect(services.quoteStore.getQuote("AAPL")).toBeUndefined();

    const release = services.socketClient.acquireSymbol("AAPL");
    services.socketClient.start();
    vi.advanceTimersByTime(0);

    gateway.latestConnection().sendWelcome();
    gateway.latestConnection().sendQuotes([makeQuote("AAPL", "195.50", 1_764_000_002_000)]);
    gateway.latestConnection().drop();

    expect(statusSnapshots).toEqual(["connected", "stale"]);
    expect(aaplSnapshots).toEqual(["100.00", "195.50"]);

    release();
    unsubscribeQuote();
    unsubscribeStatus();
    services.socketClient.stop();
  });

  it("uses globalThis.WebSocket in the default socket factory when available", () => {
    const globalRef = globalThis as unknown as { WebSocket?: unknown };
    const previous = globalRef.WebSocket;
    const urls: string[] = [];

    class StubSocket {
      readyState = 0;
      onopen = null;
      onmessage = null;
      onerror = null;
      onclose = null;
      constructor(url: string) {
        urls.push(url);
      }
      send() {}
      close() {}
    }

    globalRef.WebSocket = StubSocket;
    try {
      const socket = createDefaultSocket("ws://localhost:4000/ws?v=1");
      expect(socket.readyState).toBe(0);
      expect(urls).toEqual(["ws://localhost:4000/ws?v=1"]);
    } finally {
      globalRef.WebSocket = previous;
    }
  });
});
