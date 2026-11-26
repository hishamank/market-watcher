import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const response = {
  symbol: "AAPL",
  source: "yahoo",
  fetchedAt: 1795776000000,
  earnings: {
    currency: "USD",
    basis: "nongaap",
    nextReport: { dates: [1801170000000, 1801256400000], confidence: "unknown" },
    quarters: [
      {
        fiscalQuarter: 3,
        fiscalYear: 2026,
        periodEnd: 1782777600000,
        actual: "-0.50",
        estimate: "-0.25",
      },
      { fiscalQuarter: 4, fiscalYear: 2026, periodEnd: 1790726400000, actual: "0", estimate: null },
    ],
  },
};

test("D12 earnings show the next report, latest EPS and four fiscal quarters, and hide for funds", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-earnings")).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("earnings-next")).toContainText("Jan 28, 2027");
  await expect(page.getByTestId("earnings-next")).toContainText("Estimated");
  await expect(page.getByTestId("earnings-latest")).toContainText("$2.08");
  await expect(page.getByTestId("earnings-quarter")).toHaveCount(4);
  await expect(page.getByTestId("earnings-chart")).toContainText("GAAP · USD · Fiscal quarters");
  const empty = page.waitForResponse((item) => item.url().endsWith("/stocks/SPY/earnings"));
  await page.goto("/stocks/SPY");
  await empty;
  await expect(page.getByTestId("stock-earnings")).toHaveCount(0);
  await expect(page.getByTestId("stock-statistics")).toHaveAttribute("data-state", "ready");
  expect(problems).toEqual([]);
});

test("D12 losses, zero, missing estimates and uncertain date ranges are explicit", async ({
  page,
}) => {
  await page.route("**/stocks/AAPL/earnings", (route) => route.fulfill({ json: response }));
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("earnings-chart")).toContainText("−$0.50");
  await expect(page.getByTestId("earnings-latest")).toContainText("$0.00");
  await expect(page.getByTestId("earnings-latest")).toContainText("—");
  await expect(page.getByTestId("earnings-next")).toContainText("Jan 28, 2027 – Jan 29, 2027");
  await expect(page.getByTestId("earnings-next")).toContainText("Date not confirmed");
  await expect(page.getByTestId("earnings-chart")).toContainText("Non-GAAP");
});

test("D12 partial earnings hide unavailable subsections and failed requests still retry", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/stocks/AAPL/earnings", (route) =>
    failing
      ? route.fulfill({
          status: 503,
          json: {
            feedMode: "simulated",
            marketStatus: "open",
            error: { code: "unavailable", message: "Unavailable" },
          },
        })
      : route.fulfill({ json: { ...response, earnings: { ...response.earnings, quarters: [] } } }),
  );
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-earnings")).toHaveAttribute("data-state", "error");
  const price = page.getByTestId("detail-price");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before ?? "", { timeout: 10000 });
  failing = false;
  await page.getByTestId("earnings-retry").click();
  await expect(page.getByTestId("earnings-next")).toBeVisible();
  await expect(page.getByTestId("earnings-chart")).toHaveCount(0);
  await expect(page.getByTestId("earnings-latest")).toHaveCount(0);
});

test("D9 D10 D11 D12 sections with no content disappear, including all-null records", async ({
  page,
}) => {
  const routes = {
    profile: {
      profile: {
        kind: "company",
        description: null,
        sector: null,
        industry: null,
        exchange: null,
        website: null,
      },
    },
    statistics: {
      statistics: {
        currency: "USD",
        marketCap: null,
        trailingPE: null,
        trailingEps: null,
        dividendYield: null,
        averageVolume: null,
        yearRange: null,
      },
    },
    earnings: { earnings: { currency: null, basis: "unknown", nextReport: null, quarters: [] } },
    news: { articles: [] },
  };
  for (const [endpoint, content] of Object.entries(routes))
    await page.route(`**/stocks/AAPL/${endpoint}`, (route) =>
      route.fulfill({ json: { symbol: "AAPL", source: "yahoo", fetchedAt: 1000, ...content } }),
    );
  const responses = Promise.all(
    Object.keys(routes).map((endpoint) =>
      page.waitForResponse((item) => item.url().endsWith(`/stocks/AAPL/${endpoint}`)),
    ),
  );
  await page.goto("/stocks/AAPL");
  await responses;
  for (const section of ["company-profile", "stock-statistics", "stock-news", "stock-earnings"])
    await expect(page.getByTestId(section)).toHaveCount(0);
  await expect(page.getByTestId("detail-price")).toBeVisible();
});

for (const width of [360, 1440]) {
  test(`D12 earnings fit ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/stocks/AAPL");
      await expect(page.getByTestId("stock-earnings")).toHaveAttribute("data-state", "ready");
      await page.getByTestId("stock-earnings").scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}

test("D12 large EPS and an unconfirmed date fit 320px in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/stocks/AAPL/earnings", (route) =>
    route.fulfill({
      json: {
        ...response,
        earnings: {
          ...response.earnings,
          nextReport: { dates: [1801170000000], confidence: "unknown" },
          quarters: [1, 2, 3, 4].map((fiscalQuarter) => ({
            fiscalQuarter,
            fiscalYear: 2026,
            periodEnd: 1782777600000 + fiscalQuarter,
            actual: "-12.34",
            estimate: "-10.50",
          })),
        },
      },
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-earnings")).toHaveAttribute("data-state", "ready");
  for (const direction of ["ltr", "rtl"]) {
    if (direction === "rtl") await page.getByTestId("language-option-ar").click();
    await expect(page.locator("html")).toHaveAttribute("dir", direction);
    expect(
      await page
        .getByTestId("stock-earnings")
        .evaluate((section) => section.scrollWidth <= section.clientWidth),
    ).toBe(true);
    expect(
      await page
        .getByTestId("earnings-quarter")
        .evaluateAll((quarters) =>
          quarters.every((quarter) => quarter.scrollWidth <= quarter.clientWidth),
        ),
    ).toBe(true);
    expect(
      await page
        .getByTestId("earnings-next")
        .evaluate((next) => next.scrollWidth <= next.clientWidth),
    ).toBe(true);
  }
});
