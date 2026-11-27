import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const watchlistRowSymbols = (page: Page) =>
  page
    .locator('[data-testid^="watchlist-row-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node.getAttribute("data-testid") ?? "").replace("watchlist-row-", "")),
    );

test("W8 watchlist sorts by a column, cycles back to starred order and keeps the sort across navigation", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("star-MSFT")).toBeEnabled();
  await expect(page.locator('[data-testid^="watchlist-sort-"]')).toHaveCount(0);

  for (const symbol of ["MSFT", "NVDA", "AAPL"]) await page.getByTestId(`star-${symbol}`).click();
  await page.getByTestId("view-toggle-watchlist").click();
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await watchlistRowSymbols(page)).toEqual(["AAPL", "NVDA", "MSFT"]);

  const priceSort = page.getByTestId("watchlist-sort-price");
  const before = await priceSort.boundingBox();
  await priceSort.click();
  await expect(page).toHaveURL(/\/\?view=watchlist&sort=price-desc$/);
  expect(await priceSort.boundingBox()).toEqual(before);

  const symbolSort = page.getByTestId("watchlist-sort-symbol");
  await symbolSort.click();
  await expect(page).toHaveURL(/\/\?view=watchlist&sort=symbol-asc$/);
  await expect(symbolSort).toHaveAttribute("data-sort", "asc");
  expect(await watchlistRowSymbols(page)).toEqual(["AAPL", "MSFT", "NVDA"]);

  await symbolSort.click();
  await expect(symbolSort).toHaveAttribute("data-sort", "desc");
  expect(await watchlistRowSymbols(page)).toEqual(["NVDA", "MSFT", "AAPL"]);

  await page.reload();
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await watchlistRowSymbols(page)).toEqual(["NVDA", "MSFT", "AAPL"]);

  await page.getByTestId("stock-row-name-MSFT").click();
  await expect(page).toHaveURL(/\/stocks\/MSFT\?view=watchlist&sort=symbol-desc$/);
  await page.goBack();
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await watchlistRowSymbols(page)).toEqual(["NVDA", "MSFT", "AAPL"]);

  await page.getByTestId("star-MSFT").click();
  await expect(page.getByTestId("watchlist-row-MSFT")).toHaveCount(0);
  expect(await watchlistRowSymbols(page)).toEqual(["NVDA", "AAPL"]);

  await symbolSort.click();
  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(symbolSort).toHaveAttribute("data-sort", "none");
  expect(await watchlistRowSymbols(page)).toEqual(["AAPL", "NVDA"]);
  expect(problems).toEqual([]);
});
