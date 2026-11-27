import { expect, test } from "@playwright/test";

test("C1 connection-scoped gateway hides shared controls and keeps connection health", async ({
  page,
}) => {
  await page.routeWebSocket("**/ws?*", (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      const frame = JSON.parse(String(message));
      socket.send(
        frame.type === "chaos_state" ? JSON.stringify({ ...frame, scope: "connection" }) : message,
      );
    });
  });
  await page.goto("/?debug=1");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("chaos-drop")).toBeVisible();
  await expect(page.getByTestId("chaos-freeze")).toBeVisible();
  await expect(page.getByTestId("chaos-offline")).toBeVisible();
  await expect(page.getByTestId("health-reconnects")).toBeVisible();
  for (const id of [
    "chaos-tick-spike",
    "chaos-history-latency",
    "chaos-force-closed",
    "chaos-history-failures-100",
  ]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
});
