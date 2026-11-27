import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

test("G1 feed change hides prices until the user reloads", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  let incompatible = false;
  let disconnect = () => {};
  await page.routeWebSocket("**/ws?*", (socket) => {
    const server = socket.connectToServer();
    disconnect = () => server.close({ code: 1001, reason: "Replacement gateway" });
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (incompatible && message.type === "welcome") message.feedMode = "live";
      socket.send(JSON.stringify(message));
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  incompatible = true;
  disconnect();
  await expect(page.getByTestId("feed-reload-required")).toBeVisible();
  await expect(page.getByTestId("app-root")).toHaveCount(0);
  await expect(page.getByTestId("feed-mode-badge")).toHaveCount(0);
  await expect(page.getByTestId("feed-reload-required")).toContainText("Prices are hidden");
  incompatible = false;
  await page.getByTestId("feed-reload").click();
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("feed-mode-badge")).toHaveText("Simulated");
  expect(problems).toEqual([]);
});

test("G1 incompatible history response quarantines the page before chart update", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await page.route("**/stocks/AAPL/history?range=1Y", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, feedMode: "live" } });
  });
  await page.getByTestId("range-tab-1Y").click();
  await expect(page.getByTestId("feed-reload-required")).toBeVisible();
  await expect(page.getByTestId("app-root")).toHaveCount(0);
  expect(problems).toEqual([]);
});
