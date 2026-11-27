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
    await expect(warning).toContainText("Refreshing price");
    control.unavailable();
    await expect(warning).toContainText("Current price unavailable");
    await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
    if (path === "/") await expect(page.getByTestId("stock-row-as-of-MSFT")).toHaveCount(0);
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
