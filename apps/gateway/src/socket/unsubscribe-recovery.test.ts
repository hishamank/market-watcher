import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "vitest";
import { createQuoteStore } from "../../../../packages/core/src/realtime/quote-store.ts";
import { createSocketClient } from "../../../../packages/core/src/realtime/socket-client.ts";
import { createFakeNetwork } from "../../../../packages/core/src/testing/fake-platform.ts";
import { createDefaultSocket } from "../../../../packages/core/src/realtime/transport.ts";
import { startGateway } from "./testing.ts";

for (const reacquire of [false, true]) {
  test(`an over-limit unsubscribe converges with reacquire=${reacquire}`, async () => {
    const gateway = await startGateway();
    const released = Promise.withResolvers<void>();
    let injected = false;
    let connections = 0;
    const store = createQuoteStore();
    const client = createSocketClient({
      url: gateway.url(),
      quoteStore: store,
      network: createFakeNetwork("online"),
      random: () => 1,
      onWarning: () => {},
      socketFactory: (url) => {
        connections += 1;
        const socket = createDefaultSocket(url);
        const send = socket.send.bind(socket);
        socket.send = (data) => {
          if (!injected && data.includes('"unsubscribe"') && data.includes('"AAPL"')) {
            injected = true;
            for (let index = 0; index < 20; index += 1) {
              send(JSON.stringify({ type: "unsubscribe", symbols: ["NVDA"] }));
            }
            send(data);
            released.resolve();
            return;
          }
          send(data);
        };
        return socket;
      },
    });
    try {
      client.start();
      const release = client.acquireSymbol("AAPL");
      client.acquireSymbol("MSFT");
      await expect.poll(() => store.getQuote("AAPL")).toBeDefined();
      await expect.poll(() => store.getQuote("MSFT")).toBeDefined();
      release();
      await released.promise;
      if (reacquire) client.acquireSymbol("AAPL");
      await expect
        .poll(() => gateway.feed.upstream().sort(), { timeout: 5000 })
        .toEqual(reacquire ? ["AAPL", "MSFT"] : ["MSFT"]);
      await expect.poll(() => client.getStatus()).toBe("connected");
      await delay(1200);
      expect(connections).toBe(1);
      expect(gateway.feed.upstream().sort()).toEqual(reacquire ? ["AAPL", "MSFT"] : ["MSFT"]);
    } finally {
      client.stop();
      await gateway.close();
    }
  }, 12000);
}
