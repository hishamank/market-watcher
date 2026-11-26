import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const watchlistRowSymbols = (page: Page) =>
  page
    .locator('[data-testid^="watchlist-row-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node.getAttribute("data-testid") ?? "").replace("watchlist-row-", "")),
    );

test("W2 watchlist shows starred stocks newest first, ticks live, and unstarring removes immediately", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("star-MSFT")).toBeEnabled();

  await page.getByTestId("star-MSFT").click();
  await page.getByTestId("star-NVDA").click();
  await page.getByTestId("view-toggle-watchlist").click();

  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await watchlistRowSymbols(page)).toEqual(["NVDA", "MSFT"]);
  await expect(page.getByTestId("stock-row-name-NVDA")).toHaveText("NVIDIA Corporation");
  await expect(page.getByTestId("stock-row-name-MSFT")).toHaveText("Microsoft Corporation");
  await expect(page.getByTestId("stock-row-price-NVDA")).toHaveText(/^\$[\d,]+\.\d{2}$/);
  await expect(page.getByTestId("stock-row-change-NVDA")).toContainText(/[+−0]/);

  const prices = page.locator('[data-testid^="stock-row-price-"]');
  const before = await prices.allTextContents();
  await expect
    .poll(async () => (await prices.allTextContents()).join() !== before.join(), {
      timeout: 10_000,
    })
    .toBe(true);

  await page.getByTestId("star-NVDA").click();
  await expect(page.getByTestId("watchlist-row-NVDA")).toHaveCount(0, { timeout: 200 });
  expect(await watchlistRowSymbols(page)).toEqual(["MSFT"]);

  await page.getByTestId("star-MSFT").click();
  await expect(page.getByTestId("watchlist-empty")).toBeVisible({ timeout: 200 });
  expect(problems).toEqual([]);
});

test("W3 stars persist in order across reload and render neutral on the server without shift", async ({
  page,
  request,
}) => {
  const problems = collectConsoleProblems(page);
  const serverHtml = await (await request.get("/")).text();
  expect(serverHtml).toMatch(/data-testid="star-MSFT"[^>]*aria-pressed="false"[^>]*disabled/);
  expect(serverHtml).toMatch(/data-testid="star-NVDA"[^>]*aria-pressed="false"[^>]*disabled/);

  await page.goto("/");
  await expect(page.getByTestId("star-MSFT")).toBeEnabled();
  await page.getByTestId("star-MSFT").click();
  await page.getByTestId("star-NVDA").click();

  await page.reload();
  await expect(page.getByTestId("star-NVDA")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("star-MSFT")).toHaveAttribute("aria-pressed", "true");
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<{ value?: number }>) {
            total += entry.value ?? 0;
          }
        });
        observer.observe({ type: "layout-shift", buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(total);
        }, 150);
      }),
  );
  expect(cls).toBeLessThan(0.01);

  const watchlistHtml = await (await request.get("/?view=watchlist")).text();
  expect(watchlistHtml).toContain('data-testid="watchlist-skeleton"');
  await page.goto("/?view=watchlist");
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await watchlistRowSymbols(page)).toEqual(["NVDA", "MSFT"]);
  expect(problems).toEqual([]);
});

test("W4 starring in one tab syncs to another tab within 1 s without reload", async ({
  context,
}) => {
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  const tabWatchlist = await context.newPage();
  const problemsA = collectConsoleProblems(tabA);
  const problemsB = collectConsoleProblems(tabB);
  const problemsW = collectConsoleProblems(tabWatchlist);

  await Promise.all([tabA.goto("/"), tabB.goto("/"), tabWatchlist.goto("/?view=watchlist")]);
  await expect(tabA.getByTestId("star-TSLA")).toBeEnabled();
  await expect(tabB.getByTestId("star-TSLA")).toHaveAttribute("aria-pressed", "false");
  await expect(tabWatchlist.getByTestId("watchlist-empty")).toBeVisible();

  await tabA.getByTestId("star-TSLA").click();
  await expect(tabB.getByTestId("star-TSLA")).toHaveAttribute("aria-pressed", "true", {
    timeout: 1_000,
  });
  await expect(tabWatchlist.getByTestId("watchlist-row-TSLA")).toBeVisible({ timeout: 1_000 });

  await tabA.evaluate(() => window.localStorage.clear());
  await expect(tabB.getByTestId("star-TSLA")).toHaveAttribute("aria-pressed", "false", {
    timeout: 1_000,
  });
  await expect(tabWatchlist.getByTestId("watchlist-empty")).toBeVisible({ timeout: 1_000 });
  expect([...problemsA, ...problemsB, ...problemsW]).toEqual([]);
});

test("W5 empty watchlist shows a friendly hint and links back to all stocks", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/?view=watchlist");

  const empty = page.getByTestId("watchlist-empty");
  await expect(empty).toBeVisible();
  await expect(empty).toContainText("Your watchlist is empty");
  await expect(page.getByTestId("list-error")).toHaveCount(0);

  await empty.getByRole("link", { name: "See all stocks" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("stock-list")).toBeVisible();
  expect(problems).toEqual([]);
});

test("W5 a suggestion's star fills the empty watchlist", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/?view=watchlist");

  const suggestions = page.getByTestId("watchlist-suggestions");
  await expect(suggestions.getByRole("listitem")).toHaveCount(3);
  const star = suggestions.getByTestId("star-AAPL");
  await expect(star).toBeEnabled();
  await star.click();

  await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();
  await expect(page.getByTestId("watchlist-empty")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("W6 corrupt storage starts empty with no error and allows starring afterwards", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("seeded-corrupt") === null) {
      window.localStorage.setItem("watchlist:v1", "not json");
      window.sessionStorage.setItem("seeded-corrupt", "1");
    }
  });
  await page.goto("/?view=watchlist");
  await expect(page.getByTestId("watchlist-empty")).toBeVisible();
  await expect(page.getByTestId("list-error")).toHaveCount(0);

  await page.getByTestId("view-toggle-all").click();
  await expect(page.getByTestId("star-AAPL")).toBeEnabled();
  await page.getByTestId("star-AAPL").click();
  await expect(page.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.localStorage.getItem("watchlist:v1"))).toBe('["AAPL"]');
  expect(problems).toEqual([]);
});
