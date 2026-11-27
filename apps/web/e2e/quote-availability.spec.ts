import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";
import { interceptAvailability } from "./support/quote-availability.ts";

for (const [path, width] of [
  ["/", 1440],
  ["/", 360],
  ["/stocks/AAPL", 1440],
  ["/stocks/AAPL", 360],
] as const) {
  test(`L2 D1 R2 symbol availability remains distinct from transport and last-known at ${path} (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 740 });
    const problems = collectConsoleProblems(page);
    const control = await interceptAvailability(page);
    await page.goto(path);
    const warning = page.getByTestId(path === "/" ? "stock-row-as-of-AAPL" : "detail-price-as-of");
    await expect.poll(control.pendingSnapshots).toBeGreaterThan(0);
    await page.waitForTimeout(350);
    await expect(warning).toHaveCount(0);
    control.unavailable();
    await expect(warning).toContainText("Current price unavailable");
    await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
    await expect(
      page.getByTestId(path === "/" ? "stock-row-price-AAPL" : "detail-price"),
    ).toHaveClass(/text-text-muted/);
    if (path === "/") {
      await expect(page.getByTestId("stock-row-as-of-MSFT")).toHaveCount(0);
      await expect(page.getByTestId("stock-row-price-MSFT")).not.toHaveClass(/text-text-muted/);
    }
    await page.screenshot({ path: test.info().outputPath("symbol-unavailable.png") });
    control.lastKnown();
    await expect(warning).toContainText("Price as of");
    await expect(warning).not.toContainText("Current price unavailable");
    control.available();
    await expect(warning).toHaveCount(0);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((message) => message.startsWith("Gateway error message"))).toBe(true);
  });
}
