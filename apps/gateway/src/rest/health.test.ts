import { HealthResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { type Gateway, startGateway } from "../socket/testing.ts";
import { type RestGateway, startRestGateway } from "./testing.ts";

let socketGateway: Gateway | undefined;
let restGateway: RestGateway | undefined;

afterEach(async () => {
  await socketGateway?.close();
  await restGateway?.close();
  socketGateway = undefined;
  restGateway = undefined;
});

async function health(gateway: Gateway) {
  const response = await gateway.app.inject({ method: "GET", url: "/health" });
  expect(response.statusCode).toBe(200);
  return HealthResponseSchema.parse(response.json());
}

describe("GET /health", () => {
  it("counts open connections and the symbols held upstream", async () => {
    socketGateway = await startGateway();
    await expect(health(socketGateway)).resolves.toEqual({
      connections: 0,
      upstreamSymbols: 0,
      historyCacheHitRate: 0,
    });

    const first = await socketGateway.connect();
    const second = await socketGateway.connect();
    first.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] });
    second.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
    await Promise.all([first.next("snapshot"), second.next("snapshot")]);
    await expect(health(socketGateway)).resolves.toMatchObject({
      connections: 2,
      upstreamSymbols: 2,
    });

    first.socket.close();
    await expect
      .poll(() => health(socketGateway as Gateway))
      .toMatchObject({ connections: 1, upstreamSymbols: 1 });
  });

  it("reports the history cache hit rate from hits and misses", async () => {
    restGateway = await startRestGateway();
    const rate = async () => {
      const response = await (restGateway as RestGateway).get("/health");
      return HealthResponseSchema.parse(await response.json()).historyCacheHitRate;
    };
    await expect(rate()).resolves.toBe(0);

    await restGateway.get("/stocks/AAPL/history?range=1D");
    await expect(rate()).resolves.toBe(0);

    await restGateway.get("/stocks/AAPL/history?range=1D");
    await restGateway.get("/stocks/AAPL/history?range=1D");
    await restGateway.get("/stocks/MSFT/history?range=1D");
    await expect(rate()).resolves.toBe(0.5);
  });
});
