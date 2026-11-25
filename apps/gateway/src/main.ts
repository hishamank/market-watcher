import { buildApp, parseTrustProxy } from "./app.ts";
import { createSimulatorFeed } from "./feeds/index.ts";
import { REST_RATE_LIMIT_WINDOW_MS } from "./rest/limits.ts";
import { parseAllowedOrigins } from "./socket/admission.ts";

const feedName = process.env["FEED"] ?? "simulator";
if (feedName !== "simulator") {
  console.error(`FEED=${feedName} is not available yet. Only FEED=simulator is wired in.`);
  process.exit(1);
}

const seed = process.env["SIM_SEED"];
const feed = createSimulatorFeed(seed === undefined ? {} : { seed });
const port = Number(process.env["PORT"] ?? 4000);
const rawRateLimitMax = process.env["REST_RATE_LIMIT_MAX"]?.trim();
const rateLimitMax =
  rawRateLimitMax !== undefined && /^[1-9]\d*$/.test(rawRateLimitMax)
    ? Number(rawRateLimitMax)
    : undefined;
const app = buildApp({
  feed,
  feedMode: "simulated",
  allowedOrigins: parseAllowedOrigins(process.env["ALLOWED_ORIGINS"]),
  trustProxy: parseTrustProxy(process.env["TRUST_PROXY"]),
  ...(rateLimitMax !== undefined
    ? { rateLimit: { max: rateLimitMax, timeWindow: REST_RATE_LIMIT_WINDOW_MS } }
    : {}),
});
app.addHook("onClose", async () => feed.close());

await app.listen({ port, host: "localhost" });
console.log(`gateway listening on http://localhost:${port}`);
