import { expect, test, type Page } from "@playwright/test";
import { chartMatchesHeader, openConnected } from "./support/chart.ts";
import { collectConsoleProblems } from "./support/console.ts";

const amount = (text: string) => Number(text.replace(/[$,]/g, "").replace("−", "-"));
const readoutPattern = /^(\d{2}:\d{2} ET)(\$[\d,]+\.\d+)([+−][\d,.]+|0\.00) \(/;

async function readReadout(page: Page) {
  const text = (await page.getByTestId("chart-readout").textContent()) ?? "";
  const [, time = "", price = "", change = ""] = readoutPattern.exec(text) ?? [];
  return { time, price, change };
}

async function expectScrubbedHeader(page: Page) {
  const readout = await readReadout(page);
  expect(readout.time).toMatch(/ ET$/);
  await expect(page.getByTestId("detail-change-label")).toHaveText(readout.time);
  await expect(page.getByTestId("detail-price")).toHaveText(readout.price);
  const previousClose = amount(
    (await page.getByTestId("detail-previous-close").textContent()) ?? "",
  );
  expect(Math.round((amount(readout.price) - previousClose) * 100)).toBe(
    Math.round(amount(readout.change) * 100),
  );
  return readout.time;
}

test("D4 scrubbing with the pointer and the keyboard shows the point, then returns to live", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await openConnected(page, "/stocks/AAPL");
  const chart = page.getByTestId("price-chart");
  await expect(page.getByTestId("chart-last-price")).toHaveCSS("visibility", "visible");
  const box = await chart.boundingBox();
  if (box === null) throw new Error("chart has no box");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await expect(page.getByTestId("chart-readout")).toBeVisible();
  await expectScrubbedHeader(page);
  await page.mouse.move(box.x + box.width * 0.5, box.y - 120);
  await expect(page.getByTestId("chart-readout")).toHaveCount(0);
  await expect(page.getByTestId("detail-change-label")).toHaveText("Today");

  await chart.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  const second = await expectScrubbedHeader(page);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("detail-change-label")).not.toHaveText(second);
  const third = await expectScrubbedHeader(page);
  expect(third).not.toBe(second);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("detail-change-label")).toHaveText(second);
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("chart-readout")).toHaveCount(0);
  await expect(page.getByTestId("detail-change-label")).toHaveText("Today");
  expect(problems).toEqual([]);
});

test("D3 after a reconnect the 1D history refetches and the line ends at the live price", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await openConnected(page, "/stocks/AAPL?debug=1");
  await expect(page.getByTestId("chart-last-price")).toHaveCSS("visibility", "visible");
  const refetched = page.waitForResponse(
    (response) => response.url().includes("/stocks/AAPL/history?range=1D") && response.ok(),
  );
  await page.getByTestId("chaos-drop").click();
  await refetched;
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect.poll(() => chartMatchesHeader(page), { intervals: [20] }).toBe(true);
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
  expect(problems).toEqual([]);
});

async function nextLivePrice(page: Page) {
  const dot = page.getByTestId("chart-last-price");
  const before = (await dot.getAttribute("data-price")) ?? "";
  await expect(dot).not.toHaveAttribute("data-price", before, { timeout: 10_000 });
}

async function expectHeldAcrossTicks(page: Page) {
  const ids = ["chart-readout", "detail-price", "detail-change-label"];
  const read = () =>
    page.evaluate(
      (testIds) =>
        testIds.map((id) => document.querySelector(`[data-testid="${id}"]`)?.textContent ?? ""),
      ids,
    );
  const held = await read();
  expect(held[0]).toMatch(readoutPattern);
  for (let tick = 0; tick < 4; tick += 1) {
    await nextLivePrice(page);
    expect(await read()).toEqual(held);
  }
}

test("D4 a scrub on the newest bar holds across live ticks, by pointer and by keyboard", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const problems = collectConsoleProblems(page);
  await openConnected(page, "/stocks/MSFT");
  await expect(page.getByTestId("chart-last-price")).toHaveCSS("visibility", "visible");
  const dot = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="chart-last-price"]')?.getBoundingClientRect();
    return { x: box?.x ?? 0, y: box?.y ?? 0 };
  });
  await page.mouse.move(dot.x + 4, dot.y);
  await expect(page.getByTestId("chart-readout")).toBeVisible();
  await expectHeldAcrossTicks(page);
  const box = await page.getByTestId("price-chart").boundingBox();
  if (box === null) throw new Error("chart has no box");
  await page.mouse.move(box.x + box.width * 0.5, box.y - 120);
  await expect(page.getByTestId("chart-readout")).toHaveCount(0);

  await page.getByTestId("price-chart").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("chart-readout")).toBeVisible();
  await expectHeldAcrossTicks(page);
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("chart-readout")).toHaveCount(0);
  expect(problems).toEqual([]);
});
