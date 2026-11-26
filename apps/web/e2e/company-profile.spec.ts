import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

test("D9 overview expands, resets by symbol and distinguishes funds", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/stocks/AAPL");
  const card = page.getByTestId("company-profile");
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("company-profile-source")).toHaveText("Sample company information");
  const toggle = page.getByTestId("company-profile-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("company-description")).toContainText(
    "without contacting an external data provider",
  );
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.goto("/stocks/SPY");
  await expect(card).toContainText("About the fund");
  await expect(page.getByTestId("company-profile-sector")).toHaveCount(0);
  await page.goto("/stocks/NVDA");
  await expect(card).toHaveAttribute("data-state", "empty");
  await expect(page.getByTestId("detail-price")).toBeVisible();
  expect(problems).toEqual([]);
});

test("D9 a failed profile retries without interrupting prices", async ({ page }) => {
  let failing = true;
  await page.route("**/stocks/AAPL/profile", (route) =>
    failing
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            feedMode: "simulated",
            marketStatus: "open",
            error: { code: "unavailable", message: "Unavailable" },
          }),
        })
      : route.continue(),
  );
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("company-profile")).toHaveAttribute("data-state", "error");
  const price = page.getByTestId("detail-price");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before ?? "", { timeout: 10_000 });
  failing = false;
  await page.getByTestId("company-profile-retry").click();
  await expect(page.getByTestId("company-profile")).toHaveAttribute("data-state", "ready");
});

test("D9 links have safe targets and Yahoo provenance is explicit", async ({ page }) => {
  await page.route("**/stocks/AAPL/profile", (route) =>
    route.fulfill({
      json: {
        symbol: "AAPL",
        source: "yahoo",
        fetchedAt: 1_795_776_000_000,
        profile: {
          kind: "company",
          description: "A profile fixture.",
          sector: null,
          industry: null,
          exchange: "Nasdaq",
          website: { url: "https://example.com/", label: "example.com" },
        },
      },
    }),
  );
  await page.goto("/stocks/AAPL");
  const website = page.getByTestId("company-profile-website");
  await expect(website).toHaveAttribute("href", "https://example.com/");
  await expect(website).toHaveAttribute("target", "_blank");
  await expect(website).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByTestId("company-profile-source")).toContainText("Source: Yahoo Finance");
  await expect(page.getByTestId("company-profile-source")).toContainText("Retrieved");
  await expect(page.getByTestId("company-profile-toggle")).toHaveCount(0);
});

for (const width of [360, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`D9 overview layout at ${width}px in ${theme}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/stocks/AAPL");
      await expect(page.getByTestId("company-profile")).toHaveAttribute("data-state", "ready");
      await page.getByTestId("company-profile").scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`overview-${width}-${theme}.png`),
        fullPage: true,
      });
      await page.getByTestId("company-profile-toggle").click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
}
