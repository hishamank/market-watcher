import { describe, expect, it } from "vitest";
import { makeQuote } from "../testing/fake-platform.ts";
import {
  createFakeRest,
  dayHistoryBody,
  FAKE_GATEWAY_URL,
  historyPath,
  ok,
  stockDetailBody,
  stockListBody,
} from "../testing/fake-rest.ts";
import { createRestClient, RestClientError } from "./rest-client.ts";

const aaplQuote = makeQuote("AAPL", "187.42", 1_764_000_000_000);
const bars = [{ time: 1_000, close: "187.00" }];

function clientFor(route: Parameters<typeof createFakeRest>[0]) {
  const rest = createFakeRest(route);
  return {
    rest,
    client: createRestClient({ gatewayUrl: `${FAKE_GATEWAY_URL}/`, fetch: rest.fetch }),
  };
}

describe("REST client", () => {
  it("requests every endpoint and parses each response with the contract schemas", async () => {
    const { rest, client } = clientFor((path) => {
      if (path === "/stocks") return ok(stockListBody([aaplQuote]));
      if (path === "/stocks?symbols=AAPL%2CPLTR") return ok(stockListBody([aaplQuote]));
      if (path === "/stocks/AAPL") return ok(stockDetailBody(aaplQuote));
      if (path === historyPath("AAPL", "1D")) return ok(dayHistoryBody("AAPL", bars));
      return undefined;
    });

    expect((await client.listStocks()).stocks[0]?.quote).toEqual(aaplQuote);
    expect((await client.getStocks(["AAPL", "PLTR"])).stocks).toHaveLength(1);
    expect((await client.getStock("AAPL")).stock.name).toBe("AAPL Inc");
    expect((await client.getHistory("AAPL", "1D")).bars).toEqual(bars);
    expect(rest.requests).toEqual([
      "/stocks",
      "/stocks?symbols=AAPL%2CPLTR",
      "/stocks/AAPL",
      "/stocks/AAPL/history?range=1D",
    ]);
  });

  it("returns the gateway's error body as a typed error", async () => {
    const { client } = clientFor(() => undefined);

    const error = await client.getStock("NOPE123").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RestClientError);
    expect(error).toMatchObject({
      status: 404,
      code: "not_found",
      body: { feedMode: "simulated", error: { code: "not_found" } },
    });
  });

  it("rejects a success body that breaks the schema", async () => {
    const { client } = clientFor(() => ok(stockListBody([{ ...aaplQuote, price: "187.4" }])));

    await expect(client.listStocks()).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("types an error body that is not the gateway's shape as an invalid response", async () => {
    const { client } = clientFor(() => ({ status: 502, body: "<html>bad gateway</html>" }));

    await expect(client.listStocks()).rejects.toMatchObject({
      status: 502,
      code: "invalid_response",
      body: undefined,
    });
  });

  it("types an unreachable gateway as a network error", async () => {
    const client = createRestClient({
      gatewayUrl: FAKE_GATEWAY_URL,
      fetch: () => Promise.reject(new TypeError("fetch failed")),
    });

    await expect(client.listStocks()).rejects.toMatchObject({ status: 0, code: "network_error" });
  });

  it("passes an abort through untouched", async () => {
    const aborted = new Error("aborted");
    const client = createRestClient({
      gatewayUrl: FAKE_GATEWAY_URL,
      fetch: () => Promise.reject(aborted),
    });

    await expect(client.listStocks({ aborted: true })).rejects.toBe(aborted);
  });
});
