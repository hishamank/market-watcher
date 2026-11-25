import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";
import { gatewayUrl } from "./support/gateway-process.ts";

interface CatalogueFile {
  defaultList: string[];
  assets: Array<{ symbol: string; name: string }>;
}

const catalogue = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../gateway/data/catalogue.json"), "utf8"),
) as CatalogueFile;

const defaultSet = new Set(catalogue.defaultList);
const outsideListSymbols = catalogue.assets
  .map((asset) => asset.symbol)
  .filter((symbol) => !defaultSet.has(symbol));

const watchlistRowSymbols = (page: Page) =>
  page
    .locator('[data-testid^="watchlist-row-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node.getAttribute("data-testid") ?? "").replace("watchlist-row-", "")),
    );

test("W7 symbols outside the default list load via ?symbols=, tick live, and unstar without flicker", async ({
  page,
  request,
}) => {
  const problems = collectConsoleProblems(page);
  const defaultBody = (await (await request.get(`${gatewayUrl}/stocks`)).json()) as {
    stocks: Array<{ symbol: string }>;
  };
  const liveDefaultSymbols = defaultBody.stocks.map((stock) => stock.symbol);
  expect(liveDefaultSymbols).not.toContain("ABNB");
  expect(liveDefaultSymbols).not.toContain("SNOW");

  const symbolRequests: string[][] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    const param = url.searchParams.get("symbols");
    if (url.pathname === "/stocks" && param !== null) {
      symbolRequests.push(param.split(","));
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("watchlist:v1", JSON.stringify(["ABNB", "SNOW", "MSFT"]));
  });
  await page.goto("/?view=watchlist");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await watchlistRowSymbols(page)).toEqual(["ABNB", "SNOW", "MSFT"]);
  await expect(page.getByTestId("stock-row-name-ABNB")).toHaveText("Airbnb, Inc.");
  await expect(page.getByTestId("stock-row-price-ABNB")).toHaveText(/^\$[\d,]+\.\d{2}$/);
  expect(symbolRequests).toContainEqual(["ABNB", "SNOW"]);

  const priceBefore = await page.getByTestId("stock-row-price-ABNB").textContent();
  await expect
    .poll(
      async () => (await page.getByTestId("stock-row-price-ABNB").textContent()) !== priceBefore,
      {
        timeout: 10_000,
      },
    )
    .toBe(true);

  const requestsBeforeUnstar = symbolRequests.length;
  await page.getByTestId("star-ABNB").click();
  await expect(page.getByTestId("watchlist-row-ABNB")).toHaveCount(0, { timeout: 200 });
  await expect(page.getByTestId("watchlist-skeleton")).toHaveCount(0);
  expect(await watchlistRowSymbols(page)).toEqual(["SNOW", "MSFT"]);
  await page.waitForTimeout(300);
  expect(symbolRequests).toHaveLength(requestsBeforeUnstar);
  expect(problems).toEqual([]);
});

test("W7 starring a cached outside-list stock sends no ?symbols= request", async ({ context }) => {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  const thirdSymbol =
    outsideListSymbols.find((symbol) => symbol !== "ABNB" && symbol !== "SNOW") ?? "A";
  const symbolRequests: string[][] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    const param = url.searchParams.get("symbols");
    if (url.pathname === "/stocks" && param !== null) {
      symbolRequests.push(param.split(","));
    }
  });

  await page.addInitScript(
    (symbols) => {
      window.localStorage.setItem("watchlist:v1", JSON.stringify(symbols));
    },
    ["ABNB", "SNOW", thirdSymbol],
  );
  await page.goto("/?view=watchlist");
  await expect(page.getByTestId("watchlist-row-ABNB")).toBeVisible();
  await expect(page.getByTestId("watchlist-row-SNOW")).toBeVisible();
  await expect(page.getByTestId(`watchlist-row-${thirdSymbol}`)).toBeVisible();

  await page.getByTestId("star-ABNB").click();
  await expect(page.getByTestId("watchlist-row-ABNB")).toHaveCount(0, { timeout: 200 });
  await page.getByTestId(`star-${thirdSymbol}`).click();
  await expect(page.getByTestId(`watchlist-row-${thirdSymbol}`)).toHaveCount(0, { timeout: 200 });
  await page.waitForTimeout(300);
  const requestsBeforeReStar = symbolRequests.length;

  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await otherTab.evaluate(() => {
    window.localStorage.setItem("watchlist:v1", JSON.stringify(["ABNB", "SNOW"]));
  });
  await expect(page.getByTestId("watchlist-row-ABNB")).toBeVisible({ timeout: 1_000 });
  await expect(page.getByTestId("watchlist-skeleton")).toHaveCount(0);
  expect(await watchlistRowSymbols(page)).toEqual(["ABNB", "SNOW"]);
  await page.waitForTimeout(300);
  expect(symbolRequests).toHaveLength(requestsBeforeReStar);
  expect(symbolRequests).toHaveLength(1);
  expect(problems).toEqual([]);
});

test("W7 watchlists over 100 outside symbols chunk ?symbols= requests within the 100 cap", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  const starred = outsideListSymbols.slice(0, 105);
  const batches: number[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    const param = url.searchParams.get("symbols");
    if (url.pathname === "/stocks" && param !== null) {
      batches.push(param.split(",").length);
    }
  });

  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript((symbols) => {
    window.localStorage.setItem("watchlist:v1", JSON.stringify(symbols));
  }, starred);
  await page.goto("/?view=watchlist");
  await expect(page.getByTestId("watchlist")).toBeVisible();

  const firstSymbol = starred[0] ?? "";
  const lastSymbol = starred.at(-1) ?? "";
  await expect(page.getByTestId(`watchlist-row-${firstSymbol}`)).toBeVisible();
  await expect(page.getByTestId(`stock-row-price-${firstSymbol}`)).toHaveText(/^\$\d/);
  expect([...batches].sort((a, b) => b - a)).toEqual([100, 5]);
  expect((await watchlistRowSymbols(page)).length).toBeLessThan(starred.length);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByTestId(`watchlist-row-${lastSymbol}`)).toBeVisible();
  await expect(page.getByTestId(`stock-row-price-${lastSymbol}`)).toHaveText(/^\$\d/);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId(`watchlist-row-${firstSymbol}`)).toBeVisible();
  const batchesBeforeRemove = batches.length;
  await page.getByTestId(`star-${firstSymbol}`).click();
  await expect(page.getByTestId(`watchlist-row-${firstSymbol}`)).toHaveCount(0, { timeout: 200 });
  await expect(page.getByTestId("watchlist-skeleton")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(batches).toHaveLength(batchesBeforeRemove);
  expect(problems).toEqual([]);
});
