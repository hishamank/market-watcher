import { expect, test } from "@playwright/test";

test("D1 desktop back keeps the originating list through ranges, pane navigation and reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page.getByTestId("detail-back")).toBeVisible();
  await page.getByTestId("detail-back").click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId("star-AAPL").click();
  await page.getByTestId("view-toggle-watchlist").click();
  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(page.getByTestId("watchlist")).toBeVisible();
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page).toHaveURL(/\/stocks\/AAPL\?view=watchlist$/);
  await expect(page.getByTestId("detail-back")).toHaveText("Watchlist");
  await page.getByTestId("range-tab-1W").click();
  await page.reload();
  await expect(page.getByTestId("detail-back")).toHaveAttribute("href", "/?view=watchlist");
  await page.getByTestId("list-pane").getByTestId("stock-row-name-MSFT").click();
  await expect(page).toHaveURL(/\/stocks\/MSFT\?view=watchlist$/);
  await page.getByTestId("detail-back").click();
  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(page.getByTestId("watchlist")).toBeVisible();
});

test("D1 tablet and phone back links use the URL view and direct links default to all", async ({
  page,
}) => {
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const back = page.getByTestId(width < 768 ? "header-back" : "detail-back");
    for (const view of ["", "?view=unknown", "?view=watchlist"]) {
      await page.goto(`/stocks/AAPL${view}`);
      await expect(back).toBeVisible();
      await back.click();
      await expect(page).toHaveURL(view === "?view=watchlist" ? /\/\?view=watchlist$/ : /\/$/);
    }
  }
});
