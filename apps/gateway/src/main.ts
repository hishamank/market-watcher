import { buildApp } from "./app.ts";
import { createFakeFeed } from "./hub/fake-feed.ts";
import { parseAllowedOrigins } from "./socket/admission.ts";

const port = Number(process.env["PORT"] ?? 4000);
const app = buildApp({
  feed: createFakeFeed(),
  feedMode: "simulated",
  allowedOrigins: parseAllowedOrigins(process.env["ALLOWED_ORIGINS"]),
});

await app.listen({ port, host: "localhost" });
console.log(`gateway listening on http://localhost:${port}`);
