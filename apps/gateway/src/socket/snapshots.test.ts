import { afterEach, expect, test, vi } from "vitest";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

test("a symbol that keeps failing does not starve a healthy one in the same batch", async () => {
  const base = createFakeFeed();
  const calls: string[][] = [];
  let down = true;
  const feed = {
    ...base,
    live: {
      ...base.live,
      async snapshot(symbols: readonly string[]) {
        calls.push([...symbols]);
        if (down || symbols.includes("NVDA")) {
          throw new Error("snapshot failed");
        }
        return base.live.snapshot(symbols);
      },
    },
  };
  gateway = await startGateway(feed);
  const client = await gateway.connect();

  client.send({ type: "subscribe", requestId: 1, symbols: ["NVDA", "AAPL"] });
  await expect(client.next("error")).resolves.toMatchObject({
    code: "unavailable",
    symbols: ["NVDA", "AAPL"],
  });
  await client.next("snapshot");

  down = false;
  const quotes = await client.next("quotes");
  expect(quotes.quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
  const seen = calls.length;
  await vi.waitFor(
    () =>
      expect(calls.slice(seen).filter((call) => call.includes("NVDA")).length).toBeGreaterThan(1),
    { timeout: 3_000 },
  );
  expect(
    client.all("quotes").flatMap((frame) => frame.quotes.map((quote) => quote.symbol)),
  ).toEqual(["AAPL"]);
});

test("a read that never settles does not hold back a quote fetched beside it", async () => {
  const base = createFakeFeed();
  let down = true;
  const feed = {
    ...base,
    live: {
      ...base.live,
      async snapshot(symbols: readonly string[]) {
        if (!down && symbols.length === 1 && symbols[0] === "NVDA") {
          return new Promise<never>(() => undefined);
        }
        if (down || symbols.includes("NVDA")) {
          throw new Error("snapshot failed");
        }
        return base.live.snapshot(symbols);
      },
    },
  };
  gateway = await startGateway(feed);
  const client = await gateway.connect();

  client.send({ type: "subscribe", requestId: 1, symbols: ["NVDA", "AAPL"] });
  await client.next("snapshot");
  expect(client.all("error")).toMatchObject([{ code: "unavailable", symbols: ["NVDA", "AAPL"] }]);

  down = false;
  const quotes = await client.next("quotes");
  expect(quotes.quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
});
