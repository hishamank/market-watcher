import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const amount = (text: string) => Number(text.replace(/[$,]/g, ""));

async function openConnected(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
}

async function waitForTick(page: Page) {
  const price = page.getByTestId("detail-price");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before ?? "", { timeout: 10_000 });
}

test("D1 opening a row shows the live detail header, and back returns to the list", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await openConnected(page, "/");
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page).toHaveURL(/\/stocks\/AAPL$/);
  await expect(page.getByTestId("detail-name")).toHaveText("Apple Inc.");
  await expect(page.getByTestId("detail-change-label")).toHaveText("Today");
  await waitForTick(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("stock-list")).toBeVisible();
  expect(problems).toEqual([]);
});

test("D1 server HTML holds the detail header with a price", async ({ request }) => {
  const html = await (await request.get("/stocks/AAPL")).text();
  expect(html).toContain('data-testid="detail-header"');
  expect(html).toMatch(/data-testid="detail-name"[^>]*>Apple Inc\.</);
  expect(html).toMatch(/data-testid="detail-price"[^>]*>\$[\d,]+\.\d{2}</);
  expect(html).toMatch(/data-testid="detail-change-label"[^>]*>Today</);
});

test("D1 back from a detail page restores the watchlist view", async ({ page }) => {
  await page.goto("/stocks/AAPL?view=watchlist");
  await page.getByTestId("detail-back").click();
  await expect(page).toHaveURL(/\/\?view=watchlist$/);
  await expect(page.getByTestId("view-toggle-watchlist")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("watchlist-empty")).toBeVisible();
});

test("D1 at 1440 px the list stays beside the detail as a compact pane", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openConnected(page, "/stocks/AAPL");
  const pane = page.getByTestId("list-pane");
  await expect(pane.getByTestId("stock-row-AAPL")).toBeVisible();
  await expect(pane.getByTestId("stock-row-percent-AAPL")).toBeHidden();
  const [paneBox, headerBox] = [
    await pane.boundingBox(),
    await page.getByTestId("detail-header").boundingBox(),
  ];
  expect(paneBox?.width).toBe(400);
  expect(headerBox?.x ?? 0).toBeGreaterThan((paneBox?.x ?? 0) + 400);
});

test("D2 range tabs set the URL, the header change and the chart, with back and forward", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await openConnected(page, "/stocks/AAPL?debug=1");
  const chart = page.getByTestId("price-chart");
  for (const [range, label] of [
    ["1W", "Past week"],
    ["1Y", "Past year"],
  ] as const) {
    await page.getByTestId(`range-tab-${range}`).click();
    await expect(page).toHaveURL(new RegExp(`[?&]range=${range}`));
    await expect(page).toHaveURL(/[?&]debug=1/);
    await expect(page.getByTestId(`range-tab-${range}`)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("detail-change-label")).toHaveText(label);
    await expect(chart).toHaveAttribute("data-state", "ready");
    const direction = await page.getByTestId("detail-change").getAttribute("data-direction");
    await expect(chart).toHaveAttribute("data-direction", direction ?? "");
    await expect(page.getByTestId("detail-price")).toHaveAttribute(
      "data-direction",
      direction ?? "",
    );
    await expect(page.getByTestId("detail-change")).toHaveText(
      /^([+−][\d,.]+ \(([+−][\d.]+|0\.00)%\)|0\.00 \(0\.00%\))$/,
    );
  }
  await page.goBack();
  await expect(page.getByTestId("range-tab-1W")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("detail-change-label")).toHaveText("Past week");
  await page.goForward();
  await expect(page.getByTestId("range-tab-1Y")).toHaveAttribute("aria-selected", "true");
  expect(problems).toEqual([]);
});

test("D2 returning to a range already viewed draws at once", async ({ page }) => {
  await openConnected(page, "/stocks/AAPL");
  const chart = page.getByTestId("price-chart");
  await page.getByTestId("range-tab-1M").click();
  await expect(page.getByTestId("detail-change-label")).toHaveText("Past month");
  await expect(chart).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => {
    const node = document.querySelector('[data-testid="price-chart"]');
    const seen: string[] = [];
    Object.assign(window, { chartStates: seen });
    if (node === null) return;
    new MutationObserver(() => seen.push(node.getAttribute("data-state") ?? "")).observe(node, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
  });
  await page.getByTestId("range-tab-1D").click();
  await expect(page.getByTestId("detail-change-label")).toHaveText("Today");
  await expect(chart).toHaveAttribute("data-state", "ready");
  const states = await page.evaluate(
    () => (window as unknown as { chartStates: string[] }).chartStates,
  );
  expect(states).not.toContain("loading");
});

test("D2 opening a range from the URL renders it on the server", async ({ request }) => {
  const html = await (await request.get("/stocks/AAPL?range=1Y")).text();
  expect(html).toMatch(/aria-selected="true"[^>]*data-testid="range-tab-1Y"/);
  expect(html).toMatch(/data-testid="detail-change-label"[^>]*>Past year</);
});

async function chartMatchesHeader(page: Page) {
  return page.evaluate(() => {
    const point = document.querySelector('[data-testid="chart-last-price"]');
    const price = document.querySelector('[data-testid="detail-price"]');
    const drawn = Number(point?.getAttribute("data-price") ?? "NaN");
    return drawn === Number((price?.textContent ?? "").replace(/[$,]/g, ""));
  });
}

test("D3 the chart's last point equals the header price at every tick", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openConnected(page, "/stocks/AAPL");
  await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
  for (let tick = 0; tick < 4; tick += 1) {
    await waitForTick(page);
    await expect.poll(() => chartMatchesHeader(page), { intervals: [20] }).toBe(true);
  }
  expect(amount((await page.getByTestId("detail-price").textContent()) ?? "")).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test("D3 the 1D axis spans the whole session, so the line ends at the current time", async ({
  page,
}) => {
  await openConnected(page, "/stocks/AAPL");
  const point = page.getByTestId("chart-last-price");
  await expect(point).toHaveCSS("visibility", "visible");
  const { offset, width } = await page.evaluate(() => {
    const chart = document.querySelector('[data-testid="price-chart"]')?.getBoundingClientRect();
    const dot = document.querySelector('[data-testid="chart-last-price"]')?.getBoundingClientRect();
    return { offset: (dot?.x ?? 0) - (chart?.x ?? 0), width: chart?.width ?? 1 };
  });
  const now = new Date();
  const sessionShare =
    (now.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
    86_400_000;
  expect(Math.abs(offset / width - sessionShare)).toBeLessThan(0.05);
});

test("D7 an unknown symbol answers 404 with a way back to the list", async ({ page }) => {
  const response = await page.goto("/stocks/NOPE123");
  expect(response?.status()).toBe(404);
  const notFound = page.getByTestId("not-found");
  await expect(notFound).toContainText("NOPE123");
  await expect(notFound.getByRole("link")).toHaveAttribute("href", "/");
});

test("D8 the detail star toggles and the list agrees", async ({ page }) => {
  await openConnected(page, "/stocks/AAPL");
  const star = page.getByTestId("detail-star");
  await expect(star).toBeEnabled();
  await expect(star).toHaveAttribute("aria-pressed", "false");
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await page.goto("/");
  await expect(page.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");
});
