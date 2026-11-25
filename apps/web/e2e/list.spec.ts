import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const pricePattern = /data-testid="stock-row-price-([A-Z.]+)"[^>]*>([^<]*)</g;
const changePattern =
  /data-testid="stock-row-change-([A-Z.]+)"[^>]*>(<svg.*?<\/svg>)([^<]*)<span[^>]*>([^<]*)<\/span>/g;

function expectPriceDecimals(text: string): void {
  const amount = Number(text.replace(/[$,]/g, ""));
  expect(text).toMatch(amount >= 1 ? /^\$[\d,]+\.\d{2}$/ : /^\$0\.\d{4}$/);
}

test("L1 server HTML holds the first window of rows with prices and day change", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('data-testid="stock-list"');
  expect(html).toMatch(/data-testid="stock-row-name-AAPL"[^>]*>Apple Inc\.</);
  const prices = [...html.matchAll(pricePattern)];
  expect(prices.length).toBeGreaterThanOrEqual(10);
  for (const [, , text] of prices) expectPriceDecimals(text ?? "");
  const changes = [...html.matchAll(changePattern)];
  expect(changes.length).toBe(prices.length);
  for (const [, , arrow, amount, percent] of changes) {
    const text = `${amount ?? ""}${percent ?? ""}`;
    expect(arrow).toContain("<path");
    expect(text).toMatch(/^([+−]\d[\d,]*\.\d{2} \(([+−]\d+\.\d{2}|0\.00)%\)|0\.00 \(0\.00%\))$/);
  }
});

test("L1 prices use tabular numerals and are never empty after hydration", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  const prices = page.locator('[data-testid^="stock-row-price-"]');
  expect(await prices.count()).toBeGreaterThanOrEqual(10);
  for (const text of await prices.allTextContents()) expectPriceDecimals(text);
  const numeric = await prices
    .first()
    .evaluate((node) => getComputedStyle(node).fontVariantNumeric);
  expect(numeric).toContain("tabular-nums");
  expect(problems).toEqual([]);
});

async function readFlash(page: Page) {
  return page.evaluate(() => {
    const node = document.querySelector('[data-testid^="stock-row-price-"][data-flash]');
    if (node === null) return null;
    const symbol = node.getAttribute("data-testid")?.replace("stock-row-price-", "") ?? "";
    const ring = document.querySelector(
      `[data-testid="stock-row-change-${symbol}"] > span[aria-hidden="true"]`,
    );
    return {
      flash: node.getAttribute("data-flash"),
      direction: node.getAttribute("data-direction"),
      ringDisplay: ring === null ? null : getComputedStyle(ring).display,
    };
  });
}

test("L2 visible prices tick and flash in the row's day direction", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  const prices = page.locator('[data-testid^="stock-row-price-"]');
  const before = await prices.allTextContents();
  await expect
    .poll(async () => (await prices.allTextContents()).join() !== before.join(), {
      timeout: 10_000,
    })
    .toBe(true);
  const box: { seen: Awaited<ReturnType<typeof readFlash>> } = { seen: null };
  await expect
    .poll(
      async () => {
        box.seen = await readFlash(page);
        return box.seen;
      },
      { timeout: 10_000, intervals: [50] },
    )
    .not.toBeNull();
  expect(box.seen?.flash).toBe(box.seen?.direction);
  expect(box.seen?.ringDisplay).toBe("block");
  expect(problems).toEqual([]);
});

test("L2 with reduced motion data-flash is set but no ring animates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  await expect
    .poll(async () => (await readFlash(page))?.ringDisplay ?? null, {
      timeout: 10_000,
      intervals: [50],
    })
    .toBe("none");
});

test("L1 at 1440 px day change and day change % are separate columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  const pill = page.getByTestId("stock-row-change-AAPL");
  const percent = page.getByTestId("stock-row-percent-AAPL");
  await expect(percent).toBeVisible();
  await expect(percent).toHaveText(/^([+−]\d+\.\d{2}%|0\.00%)$/);
  await expect(pill).toHaveText(/^([+−]\d[\d,]*\.\d{2}|0\.00)$/, { useInnerText: true });
  const [pillBox, percentBox] = [await pill.boundingBox(), await percent.boundingBox()];
  expect(percentBox?.x ?? 0).toBeGreaterThan((pillBox?.x ?? 0) + (pillBox?.width ?? 0));
});
