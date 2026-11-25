import { describe, expect, it } from "vitest";
import { buildApp } from "./app.ts";
import { createFakeFeed } from "./hub/fake-feed.ts";
import { startGateway } from "./socket/testing.ts";

describe("GET /stocks", () => {
  it("reports the simulated feed with an open market and default stocks", async () => {
    const app = buildApp({
      feed: createFakeFeed(),
      feedMode: "simulated",
      allowedOrigins: new Set(),
      logger: false,
    });
    const response = await app.inject({ method: "GET", url: "/stocks" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      feedMode: "simulated",
      marketStatus: "open",
      stocks: [
        { symbol: "AAPL", name: "AAPL Inc." },
        { symbol: "MSFT", name: "MSFT Inc." },
        { symbol: "NVDA", name: "NVDA Inc." },
        { symbol: "SPY", name: "SPY Inc." },
      ],
    });
    await app.close();
  });
});

describe("gateway logging", () => {
  it("enables structured Fastify logging by default", async () => {
    const app = buildApp({
      feed: createFakeFeed(),
      feedMode: "simulated",
      allowedOrigins: new Set(),
    });
    expect(app.log.level).toBe("info");
    await app.close();
  });

  it("logs a structured warning when a client sends an invalid frame", async () => {
    const records: Record<string, unknown>[] = [];
    const gateway = await startGateway(createFakeFeed(), {
      level: "warn",
      stream: {
        write(chunk: string) {
          records.push(JSON.parse(chunk) as Record<string, unknown>);
        },
      },
    });
    try {
      const client = await gateway.connect();
      client.socket.send("not json");
      await expect(client.next("error")).resolves.toMatchObject({ code: "invalid_message" });
      expect(records).toContainEqual(
        expect.objectContaining({
          level: 40,
          kind: "invalid_json",
          msg: "dropped an invalid frame",
        }),
      );
    } finally {
      await gateway.close();
    }
  });

  it("logs the message and stack of an adapter failure", async () => {
    const records: Record<string, unknown>[] = [];
    const base = createFakeFeed();
    const feed = {
      ...base,
      live: {
        ...base.live,
        subscribe() {
          throw new Error("adapter refused AAPL");
        },
      },
    };
    const gateway = await startGateway(feed, {
      level: "warn",
      stream: { write: (chunk: string) => records.push(JSON.parse(chunk)) },
    });
    try {
      const client = await gateway.connect();
      client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
      await expect(client.next("snapshot")).resolves.toMatchObject({
        quotes: [{ symbol: "AAPL" }],
      });
      expect(records).toContainEqual(
        expect.objectContaining({
          msg: "upstream subscribe failed, will retry",
          err: expect.objectContaining({
            type: "Error",
            message: "adapter refused AAPL",
            stack: expect.stringContaining("adapter refused AAPL"),
          }),
        }),
      );
    } finally {
      await gateway.close();
    }
  });
});
