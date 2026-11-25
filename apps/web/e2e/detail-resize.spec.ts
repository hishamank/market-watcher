import { chart } from "@mini/tokens";
import { expect, test, type Page } from "@playwright/test";

interface Placement {
  readonly dotX: number;
  readonly labelY: number;
  readonly lineEndX: number;
  readonly previousCloseY: number;
}

function rgbOf(hex: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
}

function measure(page: Page): Promise<Placement> {
  return page.evaluate((previousCloseRgb) => {
    const root = document.querySelector('[data-testid="price-chart"]');
    const dot = root?.querySelector<HTMLElement>('[data-testid="chart-last-price"]');
    const label = [...(root?.querySelectorAll<HTMLElement>("span") ?? [])].find((node) =>
      node.textContent?.startsWith("Previous close"),
    );
    const canvas = root?.querySelector("canvas");
    const context = canvas?.getContext("2d");
    if (!dot || !label || !canvas || !context) throw new Error("chart not drawn");
    const scale = canvas.width / canvas.clientWidth;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const lineRgb = (getComputedStyle(dot).color.match(/\d+/g) ?? []).map(Number);
    const matches = (index: number, rgb: number[], tolerance: number) =>
      (pixels[index + 3] ?? 0) > 200 &&
      rgb.every((value, channel) => Math.abs((pixels[index + channel] ?? 0) - value) < tolerance);
    let lineEndX = -1;
    let previousCloseY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      let dashed = 0;
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        if (matches(index, lineRgb, 5)) lineEndX = Math.max(lineEndX, x);
        if (matches(index, previousCloseRgb, 3)) dashed += 1;
      }
      if (previousCloseY < 0 && dashed > 100) previousCloseY = y;
    }
    const dotX = Number(/translate\(([-\d.]+)px/.exec(dot.style.transform)?.[1] ?? "NaN");
    const labelY = Number(/translateY\(([-\d.]+)px/.exec(label.style.transform)?.[1] ?? "NaN");
    return {
      dotX,
      labelY,
      lineEndX: lineEndX / scale,
      previousCloseY: previousCloseY / scale,
    };
  }, rgbOf(chart.dark.previousClose));
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
    await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('[data-testid="price-chart"]');
      if (root) root.style.height = "500px";
    });
    await expect
      .poll(async () => {
        const placement = await measure(page);
        return Math.abs(placement.labelY - placement.previousCloseY);
      })
      .toBeLessThanOrEqual(2);
  } finally {
    await setForceClosed(page, false);
    await context.close();
  }
});
