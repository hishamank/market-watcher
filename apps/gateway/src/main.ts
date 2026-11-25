import { buildApp, parseRateLimitMax, parseTrustProxy } from "./app.ts";
import { createSimulatorFeed } from "./feeds/index.ts";
import { parseAllowedOrigins } from "./socket/admission.ts";

const feedName = process.env["FEED"] ?? "simulator";
if (feedName !== "simulator") {
  console.error(`FEED=${feedName} is not available yet. Only FEED=simulator is wired in.`);
  process.exit(1);
}

const seed = process.env["SIM_SEED"];
const feed = createSimulatorFeed(seed === undefined ? {} : { seed });
const port = Number(process.env["PORT"] ?? 4000);
const host = process.env["HOST"] ?? "localhost";
const rateLimit = parseRateLimitMax(process.env["REST_RATE_LIMIT_MAX"]);
const app = buildApp({
  feed,
  feedMode: "simulated",
  allowedOrigins: parseAllowedOrigins(process.env["ALLOWED_ORIGINS"]),
  trustProxy: parseTrustProxy(process.env["TRUST_PROXY"]),
  ...(rateLimit !== undefined ? { rateLimit } : {}),
});
app.addHook("onClose", async () => feed.close());

await app.listen({ port, host });
console.log(`gateway listening on http://${host}:${port}`);
