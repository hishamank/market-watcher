import { RestErrorResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { parseRateLimitMax, parseTrustProxy } from "../app.ts";
import { REST_RATE_LIMIT_MAX } from "./limits.ts";
import { type RestGateway, startRestGateway, TEST_ORIGIN } from "./testing.ts";

const active: RestGateway[] = [];

async function launch(options?: Parameters<typeof startRestGateway>[0]): Promise<RestGateway> {
  const gateway = await startRestGateway(options);
  active.push(gateway);
  return gateway;
}

afterEach(async () => {
  while (active.length > 0) {
    await active.pop()?.close();
  }
});

describe("REST CORS", () => {
  it("allows configured origins and missing Origin, and omits CORS headers for foreign origins", async () => {
    const gw = await launch();

    const allowed = await gw.get("/stocks/AAPL", { Origin: TEST_ORIGIN });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);

    const preflight = await gw.options("/stocks/AAPL", {
      Origin: TEST_ORIGIN,
      "Access-Control-Request-Method": "GET",
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);

    const foreign = await gw.get("/stocks/AAPL", { Origin: "https://evil.example" });
    expect(foreign.status).toBe(200);
    expect(foreign.headers.get("access-control-allow-origin")).toBeNull();

    const noOrigin = await gw.get("/stocks/AAPL");
    expect(noOrigin.status).toBe(200);
  });

  it("includes CORS headers on error responses for allowed origins", async () => {
    const gw = await launch();
    const res = await gw.get("/stocks/NOPE123", { Origin: TEST_ORIGIN });
    expect(res.status).toBe(404);
    expect(res.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    expect(RestErrorResponseSchema.parse(await res.json()).error.code).toBe("not_found");
  });
});

describe("REST rate limit and trustProxy", () => {
  it("returns 429 with the REST error body after 120 requests from one IP", async () => {
    const gw = await launch();
    for (let i = 0; i < REST_RATE_LIMIT_MAX; i += 1) {
      const res = await gw.get("/stocks/AAPL");
      expect(res.status).toBe(200);
    }

    const blocked = await gw.get("/stocks/AAPL", { Origin: TEST_ORIGIN });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).not.toBeNull();
    expect(blocked.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    const body = RestErrorResponseSchema.parse(await blocked.json());
    expect(body.feedMode).toBe("simulated");
    expect(body.marketStatus).toBe("open");
    expect(body.error.code).toBe("rate_limited");
  });

  it("ignores X-Forwarded-For by default and honours it when trustProxy is set", async () => {
    const direct = await launch({ rateLimit: { max: 2, timeWindow: 60_000 } });
    expect((await direct.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.1" })).status).toBe(
      200,
    );
    expect((await direct.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.2" })).status).toBe(
      200,
    );
    expect((await direct.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.3" })).status).toBe(
      429,
    );

    const proxied = await launch({
      trustProxy: parseTrustProxy("1"),
      rateLimit: { max: 2, timeWindow: 60_000 },
    });
    expect((await proxied.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.1" })).status).toBe(
      200,
    );
    expect((await proxied.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.1" })).status).toBe(
      200,
    );
    expect((await proxied.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.1" })).status).toBe(
      429,
    );
    expect((await proxied.get("/stocks/AAPL", { "X-Forwarded-For": "203.0.113.2" })).status).toBe(
      200,
    );
  });

  it("parses TRUST_PROXY values safely", () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy("")).toBe(false);
    expect(parseTrustProxy("false")).toBe(false);
    expect(parseTrustProxy("0")).toBe(false);
    expect(parseTrustProxy("true")).toBe(true);
    const oneHop = parseTrustProxy("1");
    expect(typeof oneHop).toBe("function");
    if (typeof oneHop === "function") {
      expect(oneHop("127.0.0.1", 0)).toBe(true);
      expect(oneHop("203.0.113.1", 1)).toBe(false);
    }
    expect(parseTrustProxy("127.0.0.1")).toBe("127.0.0.1");
    expect(parseTrustProxy("127.0.0.1, 10.0.0.0/8")).toEqual(["127.0.0.1", "10.0.0.0/8"]);
  });

  it("falls back to the default REST limit for an invalid or overflowing REST_RATE_LIMIT_MAX", () => {
    for (const value of [undefined, "", "0", "-5", "1.5", "invalid", "9".repeat(309)]) {
      expect(parseRateLimitMax(value)).toBeUndefined();
    }
    expect(parseRateLimitMax(" 500 ")).toEqual({ max: 500, timeWindow: 60_000 });
  });

  it("returns the structured 404 error body for unknown routes", async () => {
    const gw = await launch();
    const res = await gw.get("/unknown-route");
    expect(res.status).toBe(404);
    expect(RestErrorResponseSchema.parse(await res.json()).error.code).toBe("not_found");
  });
});
