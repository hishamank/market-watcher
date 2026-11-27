import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

test("D10 statistics format values and distinguish missing fund data", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-statistics")).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("statistics-marketCap")).toHaveText("$2.80T");
  await expect(page.getByTestId("statistics-dividendYield")).toHaveText("0.45%");
  await expect(page.getByTestId("statistics-averageVolume")).toHaveText("52.40M");
  await expect(page.getByTestId("statistics-source")).toHaveText("Sample statistics · USD");
  await expect(page.getByTestId("stock-statistics").getByRole("button")).toHaveCount(0);
  await expect(page.getByTestId("statistics-yearRange")).toHaveText("—");
  await expect(page.getByTestId("statistics-trailingPE")).toHaveText("—");
  await page.goto("/stocks/SPY");
  await expect(page.getByTestId("statistics-marketCap")).toHaveText("—");
  await expect(page.getByTestId("statistics-trailingEps")).toHaveText("—");
  await expect(page.getByTestId("statistics-yearRange")).toHaveText("—");
  await expect(page.getByTestId("statistics-trailingPE")).toHaveText("—");
  const emptyResponse = page.waitForResponse((response) =>
    response.url().endsWith("/stocks/NVDA/statistics"),
  );
  await page.goto("/stocks/NVDA");
  await emptyResponse;
  await expect(page.getByTestId("stock-statistics")).toHaveCount(0);
  await expect(page.getByTestId("detail-price")).toBeVisible();
  expect(problems).toEqual([]);
});

test("D10 statistics failure retries independently of prices and overview", async ({ page }) => {
  let failing = true;
  await page.route("**/stocks/AAPL/statistics", (route) =>
    failing
      ? route.fulfill({
          status: 503,
          json: {
            error: { code: "unavailable", message: "Unavailable" },
            feedMode: "simulated",
            marketStatus: "open",
          },
        })
      : route.continue(),
  );
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-statistics")).toHaveAttribute("data-state", "error");
  await expect(page.getByTestId("company-profile")).toHaveAttribute("data-state", "ready");
  const before = await page.getByTestId("detail-price").textContent();
  await expect(page.getByTestId("detail-price")).not.toHaveText(before ?? "", { timeout: 10000 });
  failing = false;
  await page.getByTestId("statistics-retry").click();
  await expect(page.getByTestId("stock-statistics")).toHaveAttribute("data-state", "ready");
});

test("D10 negative EPS, zero yield and flat ranges stay honest", async ({ page }) => {
  await page.route("**/stocks/AAPL/statistics", (route) =>
    route.fulfill({
      json: {
        symbol: "AAPL",
        source: "yahoo",
        fetchedAt: 1795776000000,
        statistics: {
          currency: "USD",
          marketCap: null,
          trailingPE: null,
          trailingEps: "-2.25",
          dividendYield: "0",
          averageVolume: 0,
          yearRange: { low: "100", high: "100" },
        },
      },
    }),
  );
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("statistics-trailingEps")).toHaveText("−$2.25");
  await expect(page.getByTestId("statistics-dividendYield")).toHaveText("0.00%");
  await expect(page.getByTestId("statistics-range-marker")).toHaveCount(0);
  await expect(page.getByTestId("statistics-source")).toContainText("Source: Yahoo Finance");
  await expect(page.getByTestId("statistics-source")).toContainText("Retrieved");
});

for (const width of [360, 768, 1440]) {
  test(`D10 statistics fit ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/stocks/AAPL");
      await expect(page.getByTestId("stock-statistics")).toHaveAttribute("data-state", "ready");
      await page.getByTestId("stock-statistics").scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}
