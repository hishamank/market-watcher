import { expect, test } from "@playwright/test";

test("L1 S1 visible stock links do not prefetch detail routes", async ({ page }) => {
  const speculative: string[] = [];
  page.on("request", (request) => {
    if (request.headers()["next-router-prefetch"] === "1") {
      speculative.push(new URL(request.url()).pathname);
    }
  });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await page.getByTestId("search-input").fill("a");
  await expect(page.getByRole("option")).toHaveCount(10);
  await page.waitForTimeout(1_000);
  expect(speculative.filter((path) => path.startsWith("/stocks/"))).toEqual([]);
  await page.getByTestId("search-result-AAPL").getByRole("link").click();
  await expect(page.getByTestId("detail-name")).toHaveText("Apple Inc.");
  await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
});
