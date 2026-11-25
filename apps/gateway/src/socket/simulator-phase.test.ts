import { expect, test, vi } from "vitest";
import { createSimulatorFeed } from "../feeds/simulator/index.ts";
import { fakeTimers, startGateway, type TestClient } from "./testing.ts";

async function subscribe(client: TestClient) {
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  const snapshot = await client.next("snapshot");
  expect(client.all("error")).toEqual([]);
  return snapshot.quotes;
}

test("a forced close keeps quotes available and midnight refills both subscribers", async () => {
  vi.useFakeTimers(fakeTimers());
  const midnight = Date.UTC(2025, 5, 25);
  let time = midnight - 1;
  const now = () => time;
  const feed = createSimulatorFeed({ clock: now });
  const gateway = await startGateway(feed, false, "simulated", now);
  try {
    const alice = await gateway.connect();
    feed.updateSettings({ forceClosed: true });
    expect(await alice.next("market_status")).toMatchObject({ marketStatus: "closed" });
    expect(await subscribe(alice)).toEqual([feed.quoteAt("AAPL", time)]);
    time = midnight;
    const bob = await gateway.connect();
    expect(await subscribe(bob)).toEqual([feed.quoteAt("AAPL", time)]);
    await vi.advanceTimersByTimeAsync(250);
    expect((await alice.next("quotes")).quotes).toEqual([feed.quoteAt("AAPL", time)]);
  } finally {
    await gateway.close();
    feed.close();
    vi.useRealTimers();
  }
});
