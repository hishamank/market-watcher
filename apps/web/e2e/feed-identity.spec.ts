import { expect } from "@playwright/test";
import { test, replaceFeed } from "./support/feed-fixture.ts";
import { collectConsoleProblems } from "./support/console.ts";

for (const first of ["live", "simulated"] as const) {
  test(`G1 ${first} replacement hides prices until reload`, async ({ page, useLiveFeed }) => {
    await useLiveFeed();
    await replaceFeed(first);
    const problems = collectConsoleProblems(page);
    await page.goto("/");
    await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
    const next = first === "live" ? "simulated" : "live";
    await replaceFeed(next);
    await expect(page.getByTestId("feed-reload-required")).toBeVisible();
    await expect(page.getByTestId("app-root")).toHaveCount(0);
    await expect(page.getByTestId("feed-mode-badge")).toHaveCount(0);
    await expect(page.getByTestId("feed-reload-required")).toContainText("Prices are hidden");
    await page.getByTestId("feed-reload").click();
    await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
    await expect(page.getByTestId("app-root")).toHaveAttribute("data-feed-mode", next);
    expect(problems).toEqual([]);
  });
}

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
