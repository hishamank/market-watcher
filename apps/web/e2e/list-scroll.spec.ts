import { expect, test, type Page } from "@playwright/test";
import { gatewayUrl } from "./support/gateway-process.ts";

interface SentFrame {
  type: string;
  symbols: string[];
  at: number;
}

function recordSentFrames(page: Page): SentFrame[] {
  const frames: SentFrame[] = [];
  page.on("websocket", (socket) => {
    socket.on("framesent", (frame) => {
      const message = JSON.parse(String(frame.payload)) as { type: string; symbols?: string[] };
      frames.push({ type: message.type, symbols: message.symbols ?? [], at: Date.now() });
    });
  });
  return frames;
}

function unsubscribesOf(frames: SentFrame[], symbol: string, after: number): SentFrame[] {
  return frames.filter(
    (frame) => frame.type === "unsubscribe" && frame.symbols.includes(symbol) && frame.at >= after,
  );
}

const rowIds = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-testid]")]
      .map((node) => node.getAttribute("data-testid") ?? "")
      .filter((id) => /^stock-row-[A-Z.]+$/.test(id)),
  );

const scrollTo = (page: Page, edge: "top" | "bottom") =>
  page.evaluate((where) => {
    window.scrollTo(0, where === "top" ? 0 : document.documentElement.scrollHeight);
  }, edge);

test("L3 only near-visible rows mount and scrolled-away symbols unsubscribe after 2 s", async ({
  page,
  request,
}) => {
  test.setTimeout(40_000);
  const symbols = (
    (await (await request.get(`${gatewayUrl}/stocks`)).json()) as {
      stocks: Array<{ symbol: string }>;
    }
  ).stocks.map((stock) => stock.symbol);
  const lastSymbol = symbols.at(-1) ?? "";
  await page.setViewportSize({ width: 360, height: 740 });
  const frames = recordSentFrames(page);
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  expect((await rowIds(page)).length).toBeLessThan(symbols.length);

  await scrollTo(page, "bottom");
  const leftAt = Date.now();
  const firstPageEnd = await page.evaluate(() => window.scrollY);
  await expect(page.getByTestId(`stock-row-${lastSymbol}`)).toBeVisible();
  await expect(page.getByTestId(`stock-row-price-${lastSymbol}`)).toHaveText(/^\$\d/);
  expect(await page.getByTestId("stock-row-AAPL").count()).toBe(0);
  await expect.poll(() => unsubscribesOf(frames, "AAPL", leftAt).length).toBe(1);
  const delay = (unsubscribesOf(frames, "AAPL", leftAt)[0]?.at ?? 0) - leftAt;
  expect(delay).toBeGreaterThanOrEqual(1_500);
  expect(delay).toBeLessThanOrEqual(3_500);

  await scrollTo(page, "top");
  await expect(page.getByTestId("stock-row-AAPL")).toBeVisible();
  await page.evaluate((y) => window.scrollTo(0, y), firstPageEnd);
  const bounceAt = Date.now();
  await expect(page.getByTestId(`stock-row-${lastSymbol}`)).toBeVisible();
  await page.waitForTimeout(500);
  await scrollTo(page, "top");
  await expect(page.getByTestId("stock-row-AAPL")).toBeVisible();
  await page.waitForTimeout(3_000);
  expect(unsubscribesOf(frames, "AAPL", bounceAt)).toEqual([]);
});

test("L3 scrolling past the first page loads the next one with live prices", async ({
  page,
  request,
}) => {
  const firstPage = (await (await request.get(`${gatewayUrl}/stocks?limit=50`)).json()) as {
    nextCursor: string;
  };
  const nextPage = (await (
    await request.get(`${gatewayUrl}/stocks?limit=50&cursor=${firstPage.nextCursor}`)
  ).json()) as { stocks: Array<{ symbol: string }> };
  const nextSymbol = nextPage.stocks[0]?.symbol ?? "";
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
  expect(await page.getByTestId(`stock-row-${nextSymbol}`).count()).toBe(0);

  await scrollTo(page, "bottom");
  await expect(page.getByTestId(`stock-row-${nextSymbol}`)).toBeAttached({ timeout: 10_000 });
  await expect(page.getByTestId(`stock-row-price-${nextSymbol}`)).toHaveText(/^\$\d/);
  const mounted = await rowIds(page);
  expect(new Set(mounted).size).toBe(mounted.length);
});
