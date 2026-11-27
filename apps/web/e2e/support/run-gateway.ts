import { writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { FeedMode } from "@mini/contracts";
import { buildApp } from "../../../gateway/src/app.ts";
import { createSimulatorFeed } from "../../../gateway/src/feeds/simulator/index.ts";
import { simulatorProfileSource } from "../../../gateway/src/profiles/simulator.ts";
import { simulatorStatisticsSource } from "../../../gateway/src/statistics/simulator.ts";
import { simulatorNewsSource } from "../../../gateway/src/news/simulator.ts";
import { simulatorEarningsSource } from "../../../gateway/src/earnings/simulator.ts";
import { gatewayPidFile, gatewayPort, webPort } from "./gateway-process.ts";

function fixtureApp(feedMode: FeedMode) {
  const feed = createSimulatorFeed({ seed: "42" });
  const app = buildApp({
    feed,
    feedMode,
    logger: false,
    allowedOrigins: new Set([`http://localhost:${webPort}`]),
    rateLimit: { max: 100000, timeWindow: 60000 },
    profileSource: simulatorProfileSource,
    statisticsSource: simulatorStatisticsSource,
    newsSource: simulatorNewsSource,
    earningsSource: simulatorEarningsSource,
  });
  app.addHook("onClose", async () => feed.close());
  return app;
}

let app = fixtureApp("simulated");
let mode: FeedMode = "simulated";
await app.listen({ port: gatewayPort, host: "localhost" });
writeFileSync(gatewayPidFile, String(process.pid));

const control = createServer(async (request, response) => {
  const next = request.url?.slice(1);
  if (request.method !== "POST" || (next !== "live" && next !== "simulated")) {
    response.writeHead(400).end();
    return;
  }
  if (next !== mode) {
    for (const socket of app.websocketServer.clients) socket.terminate();
    await app.close();
    app = fixtureApp(next);
    await app.listen({ port: gatewayPort, host: "localhost" });
    mode = next;
  }
  response.writeHead(204).end();
});
control.listen(gatewayPort + 1, "localhost");
