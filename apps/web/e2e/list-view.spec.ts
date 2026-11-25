import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

test("L5 the view toggle writes ?view=watchlist and back restores the view", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  const all = page.getByTestId("view-toggle-all");
  const watchlist = page.getByTestId("view-toggle-watchlist");
  await expect(all).toHaveAttribute("aria-current", "page");

  await watchlist.click();
  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(watchlist).toHaveAttribute("aria-current", "page");

  await all.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(all).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("stock-list")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(watchlist).toHaveAttribute("aria-current", "page");
  expect(problems).toEqual([]);
});

test("L5 /?view=watchlist server-renders the skeleton, then the watchlist", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  const html = await (await page.request.get("/?view=watchlist")).text();
  expect(html).toContain('data-testid="watchlist-skeleton"');
  expect(html).not.toContain('data-testid="stock-list"');
  await page.goto("/?view=watchlist");
  await expect(page.getByTestId("watchlist-empty")).toBeVisible();
  await expect(page.getByTestId("watchlist-skeleton")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("W1 a row star toggles aria-pressed at once and every star agrees", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  const html = await (await page.request.get("/")).text();
  expect(html).toMatch(/data-testid="star-AAPL"[^>]*disabled/);
  await page.goto("/");
  const stars = page.getByTestId("star-AAPL");
  await expect(stars.first()).toBeEnabled();
  await expect(stars.first()).toHaveAttribute("aria-pressed", "false");

  await stars.first().click();
  await expect(stars.first()).toHaveAttribute("aria-pressed", "true", { timeout: 200 });
  for (const star of await stars.all()) await expect(star).toHaveAttribute("aria-pressed", "true");

  await stars.first().click();
  await expect(stars.first()).toHaveAttribute("aria-pressed", "false", { timeout: 200 });
  expect(problems).toEqual([]);
});
