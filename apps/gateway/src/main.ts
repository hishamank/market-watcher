import { buildApp } from "./app.ts";
import { ConfigError, type GatewayConfig, loadConfig } from "./config.ts";
import {
  AlpacaStartupError,
  createSimulatorFeed,
  type Feed,
  loadAlpacaFeed,
} from "./feeds/index.ts";
import { createShutdown } from "./shutdown.ts";
import { ChaosScopeError } from "./socket/chaos-scope.ts";

async function selectFeed(
  feedName: string,
): Promise<{ feed: Feed & { close(): void }; live: boolean }> {
  if (feedName === "simulator") {
    const seed = process.env["SIM_SEED"];
    return { feed: createSimulatorFeed(seed === undefined ? {} : { seed }), live: false };
  }
  if (feedName === "alpaca") {
    return { feed: await loadAlpacaFeed(process.env), live: true };
  }
  throw new AlpacaStartupError(
    `FEED=${feedName} is not a feed mode. Use FEED=simulator or FEED=alpaca.`,
  );
}

function readConfig(): GatewayConfig {
  try {
    return loadConfig(process.env);
  } catch (err: unknown) {
    console.error(err instanceof ConfigError || err instanceof ChaosScopeError ? err.message : err);
    process.exit(1);
  }
}

const config = readConfig();
const selected = await selectFeed(process.env["FEED"] ?? "simulator").catch((err: unknown) => {
  console.error(err instanceof AlpacaStartupError ? err.message : err);
  process.exit(1);
});
const { feed } = selected;
const { port, host, chaosScope, revision, rateLimit } = config;
const app = buildApp({
  feed,
  feedMode: selected.live ? "live" : "simulated",
  allowedOrigins: config.allowedOrigins,
  chaosScope,
  revision,
  trustProxy: config.trustProxy,
  logger: config.logger,
  ...(rateLimit !== undefined ? { rateLimit } : {}),
});
app.addHook("onClose", async () => feed.close());

const shutdown = createShutdown({ app });
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void shutdown(signal));
}

await app.listen({ port, host });
console.log(`gateway listening on http://${host}:${port}`);
console.log(`gateway revision: ${revision}`);
if (!selected.live) console.log(`chaos scope: ${chaosScope}`);
