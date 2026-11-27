import { expect, test, type Page } from "@playwright/test";
import { openConnected, setChaosSwitch, setHistoryFailures, waitForTick } from "./support/chart.ts";
import { collectConsoleProblems } from "./support/console.ts";
import { gatewayUrl } from "./support/gateway-process.ts";

const steadyIds = ["price-chart", "range-tab-1D", "detail-previous-close", "detail-price"];

function boxes(page: Page) {
  return page.evaluate(
    (ids) =>
      ids.map((id) => {
        const box = document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect();
        return box === undefined
          ? null
          : [box.x + window.scrollX, box.y + window.scrollY, box.width, box.height].map(Math.round);
      }),
    steadyIds,
  );
}

function recordLayoutShifts(page: Page) {
  return page.addInitScript(() => {
    const target = window as unknown as { layoutShift: number };
    target.layoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        value: number;
        sources: Array<{ node?: Element }>;
      }>) {
        const debugOnly =
          entry.sources.length > 0 &&
          entry.sources.every(({ node }) => node?.closest('[data-testid="chaos-panel"]'));
        if (debugOnly) continue;
        target.layoutShift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

test("D5 history latency shows a same-size skeleton, then the chart, with no layout shift", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await recordLayoutShifts(page);
  await openConnected(page, "/stocks/ORCL?debug=1");
  const chart = page.getByTestId("price-chart");
  await expect(chart).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("chart-last-price")).toHaveCSS("visibility", "visible");
  await setChaosSwitch(page, "chaos-history-latency", true);
  try {
    const before = await boxes(page);
    const clickedAt = Date.now();
    await page.getByTestId("range-tab-1Y").click();
    await expect(chart).toHaveAttribute("data-state", "loading");
    expect(await boxes(page)).toEqual(before);
    await expect(chart).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
    expect(Date.now() - clickedAt).toBeGreaterThanOrEqual(1_500);
    expect(await boxes(page)).toEqual(before);
    const shift = await page.evaluate(
      () => (window as unknown as { layoutShift: number }).layoutShift,
    );
    expect(shift).toBeLessThan(0.01);
  } finally {
    await setChaosSwitch(page, "chaos-history-latency", false);
  }
  expect(problems).toEqual([]);
});

test("D6 a failing range shows an inline error with retry while the header keeps ticking", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await openConnected(page, "/stocks/NFLX?debug=1");
  const chart = page.getByTestId("price-chart");
  await expect(chart).toHaveAttribute("data-state", "ready");
  await setHistoryFailures(page, 100);
  try {
    await page.getByTestId("range-tab-3M").click();
    await expect(chart).toHaveAttribute("data-state", "error", { timeout: 20_000 });
    await expect(page.getByTestId("detail-change")).toHaveText("—");
    await expect(page.getByTestId("detail-change-label")).toHaveText("Past 3 months");
    await waitForTick(page);
    await setHistoryFailures(page, 0);
    await page.getByTestId("chart-retry").click();
    await expect(chart).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("detail-change")).toHaveText(/^([+−][\d,.]+|0\.00) \(/);
  } finally {
    await setHistoryFailures(page, 0);
  }
});

test("D6 with failures at 100% an expired 1D copy draws muted with an as-of note", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await openConnected(page, "/?debug=1");
  try {
    await setChaosSwitch(page, "chaos-force-closed", true);
    const seeded = await request.get(`${gatewayUrl}/stocks/KO/history?range=1D`);
    expect(seeded.ok()).toBe(true);
    await setHistoryFailures(page, 100);
    await setChaosSwitch(page, "chaos-force-closed", false);
    await page.goto("/stocks/KO?debug=1");
    await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("chart-as-of")).toHaveText(/^As of \d{2}:\d{2} ET$/);
    await expect(page.getByTestId("chart-last-price")).toHaveAttribute("data-price", /\d/);
    await expect(page.getByTestId("chart-last-price")).toHaveCSS("visibility", "hidden");
    const [change, price, previousClose] = await page.evaluate(() =>
      ["detail-change", "detail-price", "detail-previous-close"].map((id) => {
        const text = document.querySelector(`[data-testid="${id}"]`)?.textContent ?? "";
        const amount = text.replace(/[$,()%]|\s.*$/g, "").replace("\u2212", "-");
        return Math.round(Number(amount) * 100);
      }),
    );
    expect(change).toBe((price ?? 0) - (previousClose ?? 0));
  } finally {
    await setHistoryFailures(page, 0);
    await setChaosSwitch(page, "chaos-force-closed", false);
  }
});
