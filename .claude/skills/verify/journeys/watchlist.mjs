import { expect, startJourney } from "./lib.mjs";

const j = await startJourney("watchlist");
const { page, context, step, shot, save, openConnected } = j;

const rowSymbols = (target = page) =>
  target
    .locator('[data-testid^="watchlist-row-"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-testid").replace("watchlist-row-", "")));
const stored = (target = page) => target.evaluate(() => window.localStorage.getItem("watchlist:v1"));
const pressed = (testId, target = page) => target.getByTestId(testId).getAttribute("aria-pressed");

await step("W5", "open /?view=watchlist directly on a fresh profile", async () => {
  await openConnected("/?view=watchlist");
  await expect(page.getByTestId("watchlist-empty")).toBeVisible();
  await shot("W5-empty");
  return `watchlist-empty visible, storage=${await stored()}`;
});

await step("W1", "on /, press star-MSFT then star-NVDA", async () => {
  await openConnected("/");
  await expect(page.getByTestId("star-MSFT")).toBeEnabled();
  await page.getByTestId("star-MSFT").click();
  await page.getByTestId("star-NVDA").click();
  await expect(page.getByTestId("star-MSFT")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("star-NVDA")).toHaveAttribute("aria-pressed", "true");
  await shot("W1-row-stars");
  return `both aria-pressed=true, storage=${await stored()}`;
});

await step("W2", "press view-toggle-watchlist", async () => {
  await page.getByTestId("view-toggle-watchlist").click();
  await expect(page).toHaveURL(/\?view=watchlist$/);
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await rowSymbols()).toEqual(["NVDA", "MSFT"]);
  const price = page.getByTestId("stock-row-price-NVDA");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before, { timeout: 10_000 });
  await shot("W2-watchlist");
  return `rows NVDA,MSFT; NVDA ticked from ${before} to ${await price.textContent()}`;
});

await step("W3", "reload the watchlist view", async () => {
  await page.reload();
  await expect(page.getByTestId("watchlist")).toBeVisible();
  expect(await rowSymbols()).toEqual(["NVDA", "MSFT"]);
  expect(JSON.parse(await stored())).toEqual(["NVDA", "MSFT"]);
  return `after reload rows NVDA,MSFT and storage=${await stored()}`;
});

await step("W4", "open / in a second tab and star TSLA there", async () => {
  await openConnected("/");
  const other = j.watch(await context.newPage());
  await openConnected("/", other);
  await expect(other.getByTestId("star-TSLA")).toBeEnabled();
  await other.getByTestId("star-TSLA").click();
  await expect(page.getByTestId("star-TSLA")).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
  await other.close();
  return "first tab shows star-TSLA pressed within 1 s, no reload";
});

await step("D8", "open /stocks/AAPL and press detail-star", async () => {
  await openConnected("/stocks/AAPL");
  await expect(page.getByTestId("detail-star")).toBeEnabled();
  await page.getByTestId("detail-star").click();
  await expect(page.getByTestId("detail-star")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");
  await shot("D8-detail-star");
  await page.goBack();
  await expect(page.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");
  return `detail-star and list-pane star-AAPL agree; storage=${await stored()}`;
});

await step("W7", "open /stocks/ABNB, star it, then open the watchlist", async () => {
  await openConnected("/stocks/ABNB");
  await page.getByTestId("detail-star").click();
  await openConnected("/?view=watchlist");
  await expect(page.getByTestId("stock-row-name-ABNB")).toHaveText("Airbnb, Inc.");
  await expect(page.getByTestId("stock-row-price-ABNB")).toHaveText(/^\$[\d,]+\.\d{2,4}$/);
  expect((await rowSymbols())[0]).toBe("ABNB");
  await shot("W7-outside-list");
  return `rows ${(await rowSymbols()).join(",")}`;
});

await step("S3", "search 'shop' and press search-result-star-SHOP", async () => {
  await openConnected("/");
  await page.getByTestId("search-input").click();
  await page.getByTestId("search-input").pressSequentially("shop", { delay: 20 });
  await expect(page.getByTestId("search-result-SHOP")).toBeVisible();
  await page.getByTestId("search-result-star-SHOP").click();
  await expect(page.getByTestId("search-result-star-SHOP")).toHaveAttribute("aria-pressed", "true");
  await shot("S3-search-star");
  await page.keyboard.press("Escape");
  return `storage=${await stored()}`;
});

await step("W2", "unstar NVDA from the watchlist row", async () => {
  await openConnected("/?view=watchlist");
  await page.getByTestId("star-NVDA").click();
  await expect(page.getByTestId("watchlist-row-NVDA")).toHaveCount(0, { timeout: 200 });
  return `rows now ${(await rowSymbols()).join(",")}`;
});

await step("W6", "set watchlist:v1 to 'not json' and reload", async () => {
  await page.evaluate(() => window.localStorage.setItem("watchlist:v1", "not json"));
  await page.reload();
  await expect(page.getByTestId("watchlist-empty")).toBeVisible();
  await openConnected("/");
  await page.getByTestId("star-MSFT").click();
  await expect(page.getByTestId("star-MSFT")).toHaveAttribute("aria-pressed", "true");
  return `empty after corruption, starring works again, storage=${await stored()}`;
});

save("storage.json", { "watchlist:v1": await stored(), pressedMSFT: await pressed("star-MSFT") });
await j.finish();
