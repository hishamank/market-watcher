import { expect, test, type Page } from "@playwright/test";

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(message.text());
    }
  });
  page.on("pageerror", (error) => problems.push(error.message));
  return problems;
}

interface ConnectionRecord {
  status: string | null;
  at: number;
}

async function watchConnectionTransitions(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="app-root"]');
    if (!root) throw new Error("app-root not found");
    const records: Array<{ status: string | null; at: number }> = [];
    const target = window as unknown as { __connTransitions?: typeof records };
    target.__connTransitions = records;
    const observer = new MutationObserver(() => {
      records.push({ status: root.getAttribute("data-connection"), at: performance.now() });
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-connection"] });
  });
}

async function readConnectionTransitions(page: Page): Promise<ConnectionRecord[]> {
  return page.evaluate(() => {
    const target = window as unknown as { __connTransitions?: ConnectionRecord[] };
    return target.__connTransitions ?? [];
  });
}

test("C1 chaos panel renders only with ?debug=1 and closes cleanly", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("chaos-panel")).toHaveCount(0);

  await page.goto("/?debug=1");
  await expect(page.getByTestId("chaos-panel")).toBeVisible();
  await page.getByTestId("chaos-close").click();
  await expect(page.getByTestId("chaos-panel")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("debug")).toBeNull();
  expect(problems).toEqual([]);
});

test("G3 step 2 drop connection goes stale at once then returns to connected", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/?debug=1");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });

  await watchConnectionTransitions(page);
  const clickedAt = await page.evaluate(() => performance.now());
  await page.getByTestId("chaos-drop").click();

  await expect
    .poll(async () => {
      const statuses = (await readConnectionTransitions(page)).map((entry) => entry.status);
      const staleIndex = statuses.indexOf("stale");
      return staleIndex >= 0 && statuses.indexOf("connected", staleIndex + 1) > staleIndex;
    })
    .toBe(true);

  const transitions = await readConnectionTransitions(page);
  const firstStale = transitions.find((entry) => entry.status === "stale");
  expect(firstStale).toBeDefined();
  expect((firstStale?.at ?? 0) - clickedAt).toBeLessThan(1_000);
  await expect(root).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("connection-banner")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("G3 step 3 freeze feed goes stale after 10 to 11 s then recovers", async ({ page }) => {
  test.setTimeout(25_000);
  const problems = collectConsoleProblems(page);
  await page.goto("/?debug=1");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });

  await watchConnectionTransitions(page);
  const clickedAt = await page.evaluate(() => performance.now());
  await page.getByTestId("chaos-freeze").click();

  await expect
    .poll(
      async () => {
        const statuses = (await readConnectionTransitions(page)).map((entry) => entry.status);
        const staleIndex = statuses.indexOf("stale");
        return staleIndex >= 0 && statuses.indexOf("connected", staleIndex + 1) > staleIndex;
      },
      { timeout: 18_000, intervals: [100] },
    )
    .toBe(true);

  const transitions = await readConnectionTransitions(page);
  const firstStale = transitions.find((entry) => entry.status === "stale");
  const elapsedMs = (firstStale?.at ?? 0) - clickedAt;
  expect(elapsedMs).toBeGreaterThanOrEqual(8_500);
  expect(elapsedMs).toBeLessThanOrEqual(11_500);
  await expect(root).toHaveAttribute("data-connection", "connected");
  await expect(page.getByTestId("connection-banner")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("G3 step 5 chaos go offline switches to offline and reconnects when disabled", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/?debug=1");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });

  await page.getByTestId("chaos-offline").click();
  await expect(root).toHaveAttribute("data-connection", "offline");
  await expect(page.getByTestId("connection-banner")).toBeVisible();
  await expect(page.getByTestId("connection-retry")).toHaveCount(0);

  await page.getByTestId("chaos-offline").click();
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
  await expect(page.getByTestId("connection-banner")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("G2 and C3 force closed and global controls sync countdowns across tabs and revert after 60 s", async ({
  page,
  context,
}) => {
  test.setTimeout(80_000);
  const problems = collectConsoleProblems(page);
  const second = await context.newPage();
  const secondProblems = collectConsoleProblems(second);

  await page.goto("/?debug=1");
  await second.goto("/?debug=1");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
  await expect(second.getByTestId("app-root")).toHaveAttribute("data-connection", "connected", {
    timeout: 2_000,
  });

  await page.getByTestId("chaos-force-closed").click();
  await page.getByTestId("chaos-tick-spike").click();
  await page.getByTestId("chaos-history-latency").click();
  await page.getByTestId("chaos-history-failures-100").click();

  await expect(root).toHaveAttribute("data-market-status", "closed", { timeout: 1_000 });
  await expect(page.getByTestId("market-status-label")).toBeVisible();
  await expect(second.getByTestId("app-root")).toHaveAttribute("data-market-status", "closed", {
    timeout: 1_000,
  });

  await expect(second.getByTestId("chaos-countdown-force-closed")).toBeVisible();
  await expect(second.getByTestId("chaos-countdown-tick-spike")).toBeVisible();
  await expect(second.getByTestId("chaos-countdown-history-latency")).toBeVisible();
  await expect(second.getByTestId("chaos-countdown-history-failures")).toBeVisible();

  await expect(root).toHaveAttribute("data-market-status", "open", { timeout: 65_000 });
  await expect(page.getByTestId("market-status-label")).toHaveCount(0);
  await expect(page.getByTestId("chaos-tick-spike")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("chaos-history-latency")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("chaos-history-failures-0")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(second.getByTestId("chaos-countdown-force-closed")).toHaveCount(0);

  await second.close();
  expect(problems).toEqual([]);
  expect(secondProblems).toEqual([]);
});
