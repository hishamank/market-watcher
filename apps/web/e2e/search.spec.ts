import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

test("S1 search by ticker or name ranks exact ticker first, includes Apple, caps at 10, and debounces 150 ms", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  const queries: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/stocks/search") {
      queries.push(url.searchParams.get("q") ?? "");
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");

  const input = page.getByTestId("search-input");
  await input.click();
  await expect(page.getByText("Find a stock")).toBeVisible();

  await input.pressSequentially("aapl", { delay: 20 });
  const options = page.locator('[role="option"][data-testid^="search-result-"]');
  await expect(options.first()).toHaveAttribute("data-testid", "search-result-AAPL");
  expect(queries).toEqual(["aapl"]);

  await input.fill("app");
  await expect(options.first()).toHaveAttribute("data-testid", "search-result-APP");
  await expect(page.getByTestId("search-result-AAPL")).toBeVisible();

  await input.fill("a");
  await expect(options).toHaveCount(10);
  await expect(options.first()).toHaveAttribute("data-testid", "search-result-A");

  await input.fill("zzzzzz");
  await expect(page.getByText('No results for "zzzzzz"')).toBeVisible();

  expect(problems).toEqual([]);
});

test("S2 out-of-order delayed responses cancel earlier requests and final results match apple", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  const requested: string[] = [];
  const aborted: string[] = [];

  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/stocks/search") {
      aborted.push(url.searchParams.get("q") ?? "");
    }
  });

  await page.route("**/stocks/search*", async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") ?? "";
    requested.push(q);
    const delayMs = q === "a" ? 900 : q === "ap" ? 600 : 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      await route.continue();
    } catch {
      return;
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");

  const input = page.getByTestId("search-input");
  await input.fill("a");
  await expect.poll(() => requested).toContain("a");

  await input.fill("ap");
  await expect.poll(() => requested).toContain("ap");

  await input.fill("apple");
  const options = page.locator('[role="option"][data-testid^="search-result-"]');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toHaveAttribute("data-testid", "search-result-AAPL");

  await page.waitForTimeout(1_000);
  await expect(options).toHaveCount(1);
  await expect(options.first()).toHaveAttribute("data-testid", "search-result-AAPL");
  expect(aborted).toEqual(expect.arrayContaining(["a", "ap"]));
  expect(problems).toEqual([]);
});

test("S3 star from search results syncs and selecting a result opens its detail page", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");

  const input = page.getByTestId("search-input");
  await input.fill("aapl");
  const resultStar = page.getByTestId("search-result-star-AAPL");
  await expect(resultStar).toHaveAttribute("aria-pressed", "false");
  await resultStar.click();
  await expect(resultStar).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");

  await input.fill("abnb");
  const abnbStar = page.getByTestId("search-result-star-ABNB");
  await expect(abnbStar).toHaveAttribute("aria-pressed", "false");
  await abnbStar.click();
  await expect(abnbStar).toHaveAttribute("aria-pressed", "true");

  await input.focus();
  await input.press("ArrowDown");
  await expect(page.getByTestId("search-result-ABNB")).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/stocks\/ABNB$/);
  await expect(page.getByTestId("detail-header")).toBeVisible();
  await expect(page.getByTestId("detail-star")).toHaveAttribute("aria-pressed", "true");

  await input.fill("msft");
  await page.getByTestId("search-result-MSFT").locator("a").click();
  await expect(page).toHaveURL(/\/stocks\/MSFT$/);
  await expect(page.getByTestId("detail-name")).toHaveText("Microsoft Corporation");

  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByTestId("search-input").fill("nvda");
  await page.getByTestId("search-result-NVDA").locator("a").click();
  await expect(page).toHaveURL(/\/stocks\/NVDA$/);

  expect(problems).toEqual([]);
});
