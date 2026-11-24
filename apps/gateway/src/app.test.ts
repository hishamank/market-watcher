import { describe, expect, it } from "vitest";
import { buildApp } from "./app.ts";

describe("GET /stocks", () => {
  it("reports the simulated feed with an open market", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/stocks" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      feedMode: "simulated",
      marketStatus: "open",
      stocks: [],
    });
    await app.close();
  });
});
