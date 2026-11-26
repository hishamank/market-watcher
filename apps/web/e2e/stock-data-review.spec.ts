import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const profile = {
  symbol: "AAPL",
  source: "yahoo",
  fetchedAt: 1_795_776_000_000,
  profile: {
    kind: "company",
    description: "Only a company description.",
    sector: null,
    industry: null,
    exchange: null,
    website: null,
  },
};
const earnings = {
  symbol: "AAPL",
  source: "yahoo",
  fetchedAt: 1_795_776_000_000,
  earnings: {
    currency: "USD",
    basis: "gaap",
    nextReport: null,
    quarters: [
      {
        fiscalQuarter: 4,
        fiscalYear: 2026,
        periodEnd: 1790726400000,
        actual: null,
        estimate: "1.96",
      },
    ],
  },
};

test("D9 Yahoo overview timestamps follow Arabic locale", async ({ page }) => {
  await page.route("**/stocks/AAPL/profile", (route) => route.fulfill({ json: profile }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/stocks/AAPL");
  await page.getByTestId("language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("company-profile-source")).toContainText("نوفمبر");
  await expect(page.getByTestId("company-profile-source")).not.toContainText("Nov");
});

test("D9 description-only profiles omit the empty facts container", async ({ page }) => {
  await page.route("**/stocks/AAPL/profile", (route) => route.fulfill({ json: profile }));
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("company-description")).toHaveText(profile.profile.description);
  await expect(page.getByTestId("company-profile").locator("dl")).toHaveCount(0);
});

test("D12 timestamps on the same ET date display one report date with no duplicate keys", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.route("**/stocks/AAPL/earnings", (route) =>
    route.fulfill({
      json: {
        ...earnings,
        earnings: {
          ...earnings.earnings,
          nextReport: {
            dates: [Date.parse("2027-01-28T13:30:00Z"), Date.parse("2027-01-28T21:00:00Z")],
            confidence: "scheduled",
          },
        },
      },
    }),
  );
  await page.goto("/stocks/AAPL");
  await expect(
    page.getByTestId("earnings-next").getByText("Jan 28, 2027", { exact: true }),
  ).toHaveCount(1);
  await expect(page.getByTestId("earnings-next")).not.toContainText("–");
  expect(problems).toEqual([]);
});

test("D12 estimate-only earnings omit the summary and give the chart the full desktop width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/stocks/AAPL/earnings", (route) => route.fulfill({ json: earnings }));
  await page.goto("/stocks/AAPL");
  const section = page.getByTestId("stock-earnings");
  await expect(section).toHaveAttribute("data-state", "ready");
  await expect(section.locator("dl")).toHaveCount(0);
  await expect(page.getByTestId("earnings-chart")).toContainText("$1.96");
  const width = await section.evaluate((el) => el.clientWidth);
  const chart = await page
    .getByTestId("earnings-chart")
    .evaluate((el) => ({
      width: el.clientWidth,
      border: getComputedStyle(el).borderInlineStartWidth,
    }));
  expect(chart.width).toBeGreaterThanOrEqual(width - 48);
  expect(chart.border).toBe("0px");
});

test("D10 Arabic last-price prose follows locale while the range stays LTR", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/stocks/AAPL");
  await page.getByTestId("language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const range = page.getByTestId("statistics-year-range");
  await expect(range.locator("p")).toBeVisible();
  expect(await range.locator("p").evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
  expect(
    await page
      .getByTestId("statistics-range-marker")
      .evaluate((el) => getComputedStyle(el).direction),
  ).toBe("ltr");
});
