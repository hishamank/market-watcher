import { buildApp, parseRateLimitMax, parseTrustProxy } from "./app.ts";
import {
  AlpacaStartupError,
  createSimulatorFeed,
  type Feed,
  loadAlpacaFeed,
} from "./feeds/index.ts";
import { parseRevision } from "./revision.ts";
import { createShutdown } from "./shutdown.ts";
import { parseAllowedOrigins } from "./socket/admission.ts";
import { ChaosScopeError, parseChaosScope } from "./socket/chaos-scope.ts";

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

function readChaosScope(): ReturnType<typeof parseChaosScope> {
  try {
    return parseChaosScope(process.env["CHAOS_SCOPE"]);
  } catch (err: unknown) {
    console.error(err instanceof ChaosScopeError ? err.message : err);
    process.exit(1);
  }
}

const chaosScope = readChaosScope();
const revision = parseRevision(process.env["GATEWAY_REVISION"]);
const selected = await selectFeed(process.env["FEED"] ?? "simulator").catch((err: unknown) => {
  console.error(err instanceof AlpacaStartupError ? err.message : err);
  process.exit(1);
});
const { feed } = selected;
const port = Number(process.env["PORT"] ?? 4000);
const host = process.env["HOST"] ?? "localhost";
const rateLimit = parseRateLimitMax(process.env["REST_RATE_LIMIT_MAX"]);
const app = buildApp({
  feed,
  feedMode: selected.live ? "live" : "simulated",
  allowedOrigins: parseAllowedOrigins(process.env["ALLOWED_ORIGINS"]),
  chaosScope,
  revision,
  trustProxy: parseTrustProxy(process.env["TRUST_PROXY"]),
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
