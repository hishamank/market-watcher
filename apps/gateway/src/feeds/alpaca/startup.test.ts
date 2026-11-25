import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { AlpacaStartupError, loadAlpacaFeed } from "./index.ts";
import { createFakeAlpaca, TEST_CONFIG } from "./testing.ts";

test("FEED=alpaca without keys exits at startup with a clear message", () => {
  const gatewayRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: gatewayRoot,
    env: { PATH: process.env["PATH"], FEED: "alpaca", PORT: "0" },
    encoding: "utf8",
    timeout: 20_000,
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("FEED=alpaca needs ALPACA_KEY_ID and ALPACA_SECRET_KEY");
  expect(result.stdout).not.toContain("gateway listening");
});

test("missing keys reject before any call to Alpaca", async () => {
  const alpaca = createFakeAlpaca();
  const load = loadAlpacaFeed({ ALPACA_KEY_ID: "only-the-id" }, { fetch: alpaca.fetch });
  await expect(load).rejects.toBeInstanceOf(AlpacaStartupError);
  expect(alpaca.requests).toEqual([]);
});

test("keys Alpaca rejects stop startup without echoing the secret", async () => {
  const alpaca = createFakeAlpaca();
  alpaca.failing.set("*", 401);
  const env = { ALPACA_KEY_ID: TEST_CONFIG.keyId, ALPACA_SECRET_KEY: TEST_CONFIG.secretKey };
  const error = await loadAlpacaFeed(env, { fetch: alpaca.fetch }).catch((err: unknown) => err);

  expect(error).toBeInstanceOf(AlpacaStartupError);
  expect((error as Error).message).toMatch(/^Alpaca rejected ALPACA_KEY_ID and ALPACA_SECRET_KEY/);
  expect((error as Error).message).not.toContain(TEST_CONFIG.secretKey);
});
