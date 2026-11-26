import { expect, startJourney } from "./lib.mjs";

const j = await startJourney("stock-list");
const { page, stack, step, shot, save, openConnected } = j;

await step("L1", "fetch / as HTML without running JavaScript", async () => {
  const html = await (await fetch(`${stack.WEB_URL}/`)).text();
  save("L1-server.html", html);
  const prices = html.match(/data-testid="stock-row-price-[A-Z.]+"[^>]*>\$[\d,]+\.\d{2,4}</g) ?? [];
  expect(prices.length).toBeGreaterThanOrEqual(10);
  expect(html).toMatch(/data-testid="stock-row-name-AAPL"[^>]*>Apple Inc\.</);
  expect(html).toContain('data-feed-mode="simulated"');
  return `${prices.length} rows carry a price in the server HTML`;
});

await step("L2", "open / and wait for ticks", async () => {
  await openConnected("/");
  const prices = page.locator('[data-testid^="stock-row-price-"]');
  const before = await prices.allTextContents();
  await page.evaluate(() => {
    const selector = '[data-testid^="stock-row-price-"]';
    const valueOf = (node) => Number((node.textContent ?? "").replace(/[^0-9.]/g, ""));
    const history = new Map([...document.querySelectorAll(selector)].map((node) => [node, [valueOf(node)]]));
    window.seenFlashes = [];
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        const node = target?.closest(selector);
        if (!node) continue;
        const values = history.get(node) ?? [];
        if (values.at(-1) !== valueOf(node)) values.push(valueOf(node));
        history.set(node, values);
        const flash = node.getAttribute("data-flash");
        if (record.type === "attributes" && record.oldValue === null && flash !== null && values.length > 1) {
          window.seenFlashes.push({ id: node.dataset.testid, flash, delta: values.at(-1) - values.at(-2) });
        }
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ["data-flash"] });
  });
  await expect.poll(async () => (await prices.allTextContents()).join() !== before.join(), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.seenFlashes.length), { timeout: 10_000 }).toBeGreaterThan(0);
  const seen = await page.evaluate(() => window.seenFlashes);
  for (const flash of seen) expect(flash.flash).toBe(flash.delta > 0 ? "up" : "down");
  await shot("L2-ticking");
  return `prices changed; ${seen.length} flash(es), each matching its tick's direction (first: ${seen[0].id} ${seen[0].flash})`;
});

await step("L5", "press view-toggle-watchlist, browser back, then view-toggle-all from the watchlist", async () => {
  await page.getByTestId("view-toggle-watchlist").click();
  await expect(page).toHaveURL(/\?view=watchlist$/);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${stack.WEB_URL}/$`));
  await expect(page.getByTestId("stock-list")).toBeVisible();
  await page.getByTestId("view-toggle-watchlist").click();
  await page.getByTestId("view-toggle-all").click();
  await expect(page).toHaveURL(new RegExp(`${stack.WEB_URL}/$`));
  await expect(page.getByTestId("stock-list")).toBeVisible();
  return "toggle set ?view=watchlist, back and view-toggle-all both restored All";
});

await step("L3", "at 360 x 740, count rows, scroll to the bottom", async () => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openConnected("/");
  const mounted = await page.locator('[data-testid^="stock-row-name-"]').count();
  expect(mounted).toBeLessThan(50);
  const symbols = (await (await fetch(`${stack.GATEWAY_URL}/stocks`)).json()).stocks.map((s) => s.symbol);
  const last = symbols.at(-1);
  await shot("L3-top-360");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByTestId(`stock-row-${last}`)).toBeVisible();
  await expect(page.getByTestId(`stock-row-price-${last}`)).toHaveText(/^\$\d/);
  await expect(page.getByTestId("stock-row-AAPL")).toHaveCount(0);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
  await shot("L3-bottom-360");
  return `${mounted} rows mounted at the top; ${last} priced at the bottom; AAPL unmounted; no horizontal scroll`;
});

await j.finish();
