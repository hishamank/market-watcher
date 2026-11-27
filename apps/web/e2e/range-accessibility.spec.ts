import { expect, test } from "@playwright/test";

for (const width of [320, 360, 375, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`D2 G4 Arabic ranges fit ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/stocks/AAPL");
      await page.getByTestId("language-option-ar").click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
      for (const range of ["1D", "1W", "1M", "3M", "1Y", "5Y"]) {
        const button = page.getByTestId(`range-tab-${range}`);
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(await button.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    });
  }
}

test("D2 G4 range buttons expose selection and support native keyboard activation", async ({
  page,
}) => {
  await page.goto("/stocks/AAPL");
  const first = page.getByTestId("range-tab-1D");
  await expect(first.locator("..")).toHaveAttribute("role", "group");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await first.focus();
  await page.keyboard.press("Tab");
  const week = page.getByTestId("range-tab-1W");
  await expect(week).toBeFocused();
  await page.keyboard.press("Space");
  await expect(week).toHaveAttribute("aria-pressed", "true");
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(page).toHaveURL(/range=1W/);
  await expect(page.getByTestId("detail-change-label")).toHaveText("Past week");
  await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("range-tab-1M")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/range=1M/);
});
