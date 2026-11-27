import { HealthResponseSchema } from "@mini/contracts";
import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";
import { gatewayUrl } from "./support/gateway-process.ts";

test("H1 health tiles update live and count a reconnect after drop connection", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/?debug=1");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");

  const reconnects = page.getByTestId("health-reconnects");
  await expect(page.getByTestId("health-fps")).not.toHaveText("0", { timeout: 4_000 });
  await expect(page.getByTestId("health-latency")).toHaveText(/^\d+ ms$/);
  await expect(page.getByTestId("health-skipped")).toHaveText(/^\d+$/, { timeout: 7_000 });
  const before = Number(await reconnects.textContent());

  await page.getByTestId("chaos-drop").click();
  await expect.poll(async () => Number(await reconnects.textContent())).toBeGreaterThan(before);
  const diagnostics = page.getByTestId("health-diagnostics");
  await expect
    .poll(async () => JSON.parse((await diagnostics.textContent()) ?? "{}"))
    .toMatchObject({
      transportStatus: "connected",
      handshakeComplete: true,
      recoverySettled: true,
      pendingSubscriptions: [],
      lastRecoveryReason: "socket_closed",
    });
  expect(problems).toEqual([]);
});

test("H1 GET /health returns connections, upstream symbols and cache hit rate", async ({
  request,
}) => {
  const response = await request.get(`${gatewayUrl}/health`);
  expect(response.ok()).toBe(true);
  const body = HealthResponseSchema.parse(await response.json());
  expect(Object.keys(body).sort()).toEqual([
    "connections",
    "historyCacheHitRate",
    "upstreamSymbols",
  ]);
});
