import { expect, test, type Page } from "@playwright/test";

interface Placement {
  readonly dotX: number;
  readonly dotY: number;
  readonly lineEndX: number;
  readonly lineEndYs: readonly number[];
  readonly canvasHeight: number;
}

function measure(page: Page): Promise<Placement> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="price-chart"]');
    const dot = root?.querySelector<HTMLElement>('[data-testid="chart-last-price"]');
    const canvas = root?.querySelector("canvas");
    const context = canvas?.getContext("2d");
    if (!dot || !canvas || !context) throw new Error("chart not drawn");
    const scale = canvas.width / canvas.clientWidth;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const lineRgb = (getComputedStyle(dot).color.match(/\d+/g) ?? []).map(Number);
    const matches = (index: number) =>
      (pixels[index + 3] ?? 0) > 200 &&
      lineRgb.every((value, channel) => Math.abs((pixels[index + channel] ?? 0) - value) < 5);
    let lineEndX = -1;
    let lineEndYs: number[] = [];
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (!matches((y * canvas.width + x) * 4) || x < lineEndX) continue;
        lineEndYs = x > lineEndX ? [y / scale] : [...lineEndYs, y / scale];
        lineEndX = x;
      }
    }
    const [dotX, dotY] = (/translate\(([-\d.]+)px, ([-\d.]+)px/.exec(dot.style.transform) ?? [])
      .slice(1)
      .map(Number);
    return {
      dotX: dotX ?? Number.NaN,
      dotY: dotY ?? Number.NaN,
      lineEndX: lineEndX / scale,
      lineEndYs,
      canvasHeight: canvas.clientHeight,
    };
  });
}

async function setForceClosed(page: Page, on: boolean) {
  const control = page.getByTestId("chaos-force-closed");
  if ((await control.getAttribute("aria-checked")) !== String(on)) await control.click();
  await expect(control).toHaveAttribute("aria-checked", String(on));
}

test("D3 chart overlays follow the canvas after a width and a height-only resize", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto("/stocks/AAPL?debug=1");
  await expect(page.getByTestId("chart-last-price")).toHaveCSS("visibility", "visible");
  try {
    await setForceClosed(page, true);
    await expect(page.getByTestId("app-root")).toHaveAttribute("data-market-status", "closed");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect
      .poll(async () => {
        const placement = await measure(page);
        return Math.abs(placement.dotX - placement.lineEndX);
      })
      .toBeLessThanOrEqual(2);
    const { canvasHeight } = await measure(page);
    await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('[data-testid="price-chart"]');
      if (root) root.style.height = "500px";
    });
    await expect.poll(async () => (await measure(page)).canvasHeight).toBeGreaterThan(canvasHeight);
    await expect
      .poll(async () => {
        const placement = await measure(page);
        return Math.min(...placement.lineEndYs.map((y) => Math.abs(placement.dotY - y)));
      })
      .toBeLessThanOrEqual(2);
  } finally {
    await setForceClosed(page, false);
    await context.close();
  }
});
