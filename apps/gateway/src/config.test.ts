import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { checkTrustProxy, ConfigError, loadConfig, parseOrigins, parsePort } from "./config.ts";
import { createFakeFeed } from "./hub/fake-feed.ts";
import { startGateway } from "./socket/testing.ts";

const gatewayRoot = fileURLToPath(new URL("../", import.meta.url));

function start(env: Record<string, string>) {
  return spawnSync(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: gatewayRoot,
    env: { PATH: process.env["PATH"], ...env },
    encoding: "utf8",
    timeout: 20_000,
  });
}

test.each([
  [{ PORT: "abc" }, "PORT=abc is not a port"],
  [{ PORT: "70000" }, "PORT=70000 is not a port"],
  [{ ALLOWED_ORIGINS: "localhost:3000" }, "ALLOWED_ORIGINS entry localhost:3000 is not an origin"],
  [{ TRUST_PROXY: "fly" }, "TRUST_PROXY entry fly is not understood"],
  [{ REST_RATE_LIMIT_MAX: "lots" }, "REST_RATE_LIMIT_MAX=lots is not a positive whole number"],
  [{ LOG_CLIENT_ADDRESSES: "yes" }, "LOG_CLIENT_ADDRESSES=yes is not a switch"],
])("the gateway refuses to start with %j", (env, message) => {
  const result = start({ PORT: "0", ...env });
  expect(result.status).toBe(1);
  expect(result.stderr.trim().split("\n")).toHaveLength(1);
  expect(result.stderr).toContain(message);
  expect(result.stdout).not.toContain("gateway listening");
});

test("ports, origins and proxy settings accept only their documented forms", () => {
  expect(parsePort(undefined)).toBe(4000);
  expect(parsePort(" 0 ")).toBe(0);
  expect(parsePort("65535")).toBe(65_535);
  expect(() => parsePort("4000.5")).toThrow(ConfigError);
  expect(() => parsePort("-1")).toThrow(ConfigError);

  expect([...parseOrigins(undefined)]).toEqual(["http://localhost:3000", "http://localhost:3100"]);
  expect([...parseOrigins("https://a.example, http://192.168.0.130:4000")]).toEqual([
    "https://a.example",
    "http://192.168.0.130:4000",
  ]);
  for (const bad of ["https://a.example/", "https://a.example/app", "ftp://a.example", "*"]) {
    expect(() => parseOrigins(bad)).toThrow(ConfigError);
  }

  for (const good of [undefined, "", "false", "true", "2", "10.0.0.0/8, ::1", "loopback"]) {
    expect(() => checkTrustProxy(good)).not.toThrow();
  }
  for (const bad of ["10.0.0.0/40", "proxy.example", "1.2.3"]) {
    expect(() => checkTrustProxy(bad)).toThrow(ConfigError);
  }
});

test("a long bad value is cut short in the message", () => {
  const error = (() => {
    try {
      return loadConfig({ PORT: "9".repeat(500) });
    } catch (err: unknown) {
      return err;
    }
  })();
  expect(error).toBeInstanceOf(ConfigError);
  expect((error as Error).message.length).toBeLessThan(160);
});

test("request logs leave out the client address unless it is asked for", async () => {
  const seen: Record<string, unknown>[] = [];
  const stream = { write: (line: string) => void seen.push(JSON.parse(line)) };
  for (const flag of ["false", "true"]) {
    const { logger } = loadConfig({ LOG_CLIENT_ADDRESSES: flag });
    const options = logger === true ? { stream } : { ...(logger as object), stream };
    const gateway = await startGateway(createFakeFeed(), options);
    await gateway.app.inject({ url: "/health" });
    await gateway.close();
  }
  const requests = seen.flatMap((entry) => (entry["req"] ? [entry["req"]] : []));
  expect(requests[0]).toEqual({ method: "GET", url: "/health" });
  expect(requests[1]).toMatchObject({ method: "GET", url: "/health", remoteAddress: "127.0.0.1" });
});
