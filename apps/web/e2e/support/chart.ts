import { expect, type Page } from "@playwright/test";

export async function openConnected(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
}

export async function waitForTick(page: Page) {
  const price = page.getByTestId("detail-price");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before ?? "", { timeout: 10_000 });
}

export function chartMatchesHeader(page: Page) {
  return page.evaluate(() => {
    const point = document.querySelector('[data-testid="chart-last-price"]');
    const price = document.querySelector('[data-testid="detail-price"]');
    const drawn = Number(point?.getAttribute("data-price") ?? "NaN");
    return drawn === Number((price?.textContent ?? "").replace(/[$,]/g, ""));
  });
}

export async function setChaosSwitch(page: Page, testId: string, on: boolean) {
  const control = page.getByTestId(testId);
  if ((await control.getAttribute("aria-checked")) !== String(on)) await control.click();
  await expect(control).toHaveAttribute("aria-checked", String(on));
}

export async function setHistoryFailures(page: Page, rate: 0 | 50 | 100) {
  const control = page.getByTestId(`chaos-history-failures-${rate}`);
  await control.click();
  await expect(control).toHaveAttribute("aria-checked", "true");
}
