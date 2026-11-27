import { expect, startJourney } from "./lib.mjs";

const j = await startJourney("stock-detail");
const { page, stack, step, shot, openConnected } = j;

const amount = (text) => Number(text.replace(/[$,]/g, "").replace("−", "-"));
const chartMatchesHeader = () =>
  page.evaluate(() => {
    const drawn = Number(document.querySelector('[data-testid="chart-last-price"]')?.getAttribute("data-price"));
    const shown = document.querySelector('[data-testid="detail-price"]')?.textContent ?? "";
    return drawn === Number(shown.replace(/[$,]/g, ""));
  });
const waitForTick = async () => {
  const price = page.getByTestId("detail-price");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before, { timeout: 10_000 });
};

await step("D1", "on /, click stock-row-name-AAPL", async () => {
  await openConnected("/");
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page).toHaveURL(/\/stocks\/AAPL$/);
  await expect(page.getByTestId("detail-name")).toHaveText("Apple Inc.");
  await expect(page.getByTestId("detail-change-label")).toHaveText("Today");
  await waitForTick();
  await shot("D1-detail");
  return `URL /stocks/AAPL, header Apple Inc., price ticking at ${await page.getByTestId("detail-price").textContent()}`;
});

await step("D3", "watch four ticks on 1D", async () => {
  await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
  for (let tick = 0; tick < 4; tick += 1) {
    await waitForTick();
    await expect.poll(chartMatchesHeader, { intervals: [20] }).toBe(true);
  }
  return "chart-last-price data-price equalled detail-price after each of 4 ticks";
});

await step("D4", "hover the chart at 30% of its width, then leave it", async () => {
  const box = await page.getByTestId("price-chart").boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await expect(page.getByTestId("chart-readout")).toBeVisible();
  const readout = await page.getByTestId("chart-readout").textContent();
  await expect(page.getByTestId("detail-change-label")).toHaveText(/ ET$/);
  await shot("D4-scrub");
  await page.mouse.move(box.x + box.width * 0.5, box.y - 120);
  await expect(page.getByTestId("detail-change-label")).toHaveText("Today");
  return `readout "${readout}", header returned to Today after leaving`;
});

await step("D2", "press each range tab", async () => {
  const labels = { "1W": "Past week", "1M": "Past month", "3M": "Past 3 months", "1Y": "Past year", "5Y": "Past 5 years", "1D": "Today" };
  for (const [range, label] of Object.entries(labels)) {
    await page.getByTestId(`range-tab-${range}`).click();
    await expect(page.getByTestId(`range-tab-${range}`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("detail-change-label")).toHaveText(label);
    await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
    if (range === "1Y") await shot("D2-1Y");
  }
  await expect(page).toHaveURL(/range=1D|\/stocks\/AAPL$/);
  return "every range button set aria-pressed, its label and a ready chart";
});

await step("D2", "open /stocks/AAPL?range=1Y directly", async () => {
  await openConnected("/stocks/AAPL?range=1Y");
  await expect(page.getByTestId("range-tab-1Y")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("detail-change-label")).toHaveText("Past year");
  return "deep link renders 1Y";
});

await step("D7", "open /stocks/NOPE123", async () => {
  j.allowConsole(/status of 404 \(Not Found\)/, "D7 loads a 404 page on purpose");
  const response = await page.goto(`${stack.WEB_URL}/stocks/NOPE123`);
  expect(response.status()).toBe(404);
  await expect(page.getByTestId("not-found")).toBeVisible();
  await shot("D7-not-found");
  return "HTTP 404 with not-found";
});

await step("D1", "search 'msft' and select the result link", async () => {
  await openConnected("/");
  await page.getByTestId("search-input").pressSequentially("msft", { delay: 20 });
  await page.getByTestId("search-result-MSFT").locator("a").click();
  await expect(page).toHaveURL(/\/stocks\/MSFT$/);
  await expect(page.getByTestId("detail-name")).toHaveText("Microsoft Corporation");
  return "search result opened /stocks/MSFT";
});

await step("D1", "at 1440 px click stock-row-name-NVDA in the list pane beside AAPL", async () => {
  await openConnected("/stocks/AAPL");
  await page.getByTestId("list-pane").getByTestId("stock-row-name-NVDA").click();
  await expect(page).toHaveURL(/\/stocks\/NVDA$/);
  await expect(page.getByTestId("detail-name")).toHaveText("NVIDIA Corporation");
  await shot("D1-list-pane-1440");
  return "list pane row opened /stocks/NVDA";
});

await step("D1", "at 768 px open /stocks/AAPL and press detail-back", async () => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openConnected("/stocks/AAPL");
  await page.getByTestId("detail-back").click();
  await expect(page.getByTestId("stock-list")).toBeVisible();
  return "tablet back link returns to the list";
});

await step("D1", "at 360 x 740 open /stocks/AAPL and press header-back", async () => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openConnected("/");
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page.getByTestId("detail-price")).toHaveText(/^\$/);
  expect(amount(await page.getByTestId("detail-price").textContent())).toBeGreaterThan(0);
  await shot("D1-detail-360");
  await page.getByTestId("header-back").click();
  await expect(page.getByTestId("stock-list")).toBeVisible();
  return "phone layout back button returns to the list";
});

await j.finish();
