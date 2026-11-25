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

test("G1 feed mode is in the server render before hydration", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('data-feed-mode="simulated"');
  expect(html).toMatch(/data-testid="feed-mode-badge"[^>]*>(?:<[^>]+>)*[^<]*Simulated/);
});

test("G1 feed mode badge reads Simulated with no console errors", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/");
  await expect(page.getByTestId("feed-mode-badge")).toHaveText("Simulated");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-feed-mode", "simulated");
  expect(problems).toEqual([]);
});

test("G2 market status is open against the simulator gateway with no closed label", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  const html = await (await page.request.get("/")).text();
  expect(html).toContain('data-market-status="open"');
  await page.goto("/");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
  await expect(root).toHaveAttribute("data-market-status", "open");
  await expect(page.getByTestId("market-status-label")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("G3 step 1 connecting turns connected within 2 s with no banner", async ({ page }) => {
  const html = await (await page.request.get("/")).text();
  expect(html).toContain('data-connection="connecting"');
  await page.goto("/");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
  await expect(page.getByTestId("connection-banner")).toHaveCount(0);
});

test("G3 step 5 offline shows the banner and online reconnects", async ({ page, context }) => {
  await page.goto("/");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
  await context.setOffline(true);
  await expect(root).toHaveAttribute("data-connection", "offline");
  await expect(page.getByTestId("connection-banner")).toBeVisible();
  await expect(page.getByTestId("connection-retry")).toHaveCount(0);
  await context.setOffline(false);
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
});
