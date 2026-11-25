import { buildApp, parseRateLimitMax, parseTrustProxy } from "./app.ts";
import {
  AlpacaStartupError,
  createSimulatorFeed,
  type Feed,
  loadAlpacaFeed,
} from "./feeds/index.ts";
import { parseAllowedOrigins } from "./socket/admission.ts";

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

const selected = await selectFeed(process.env["FEED"] ?? "simulator").catch((err: unknown) => {
  console.error(err instanceof AlpacaStartupError ? err.message : err);
  process.exit(1);
});
const { feed } = selected;
const port = Number(process.env["PORT"] ?? 4000);
const rateLimit = parseRateLimitMax(process.env["REST_RATE_LIMIT_MAX"]);
const app = buildApp({
  feed,
  feedMode: selected.live ? "live" : "simulated",
  allowedOrigins: parseAllowedOrigins(process.env["ALLOWED_ORIGINS"]),
  trustProxy: parseTrustProxy(process.env["TRUST_PROXY"]),
  ...(rateLimit !== undefined ? { rateLimit } : {}),
});
app.addHook("onClose", async () => feed.close());

await app.listen({ port, host: "localhost" });
console.log(`gateway listening on http://localhost:${port}`);
