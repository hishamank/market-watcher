import { expect, startJourney } from "./lib.mjs";

const j = await startJourney("connection");
const { page, stack, step, shot, save, openConnected } = j;
const root = page.getByTestId("app-root");

const recordTransitions = () =>
  page.evaluate(() => {
    const node = document.querySelector('[data-testid="app-root"]');
    window.__transitions = [];
    new MutationObserver(() => window.__transitions.push(node.getAttribute("data-connection"))).observe(node, {
      attributes: true,
      attributeFilter: ["data-connection"],
    });
  });
const transitions = () => page.evaluate(() => window.__transitions);

await step("G1", "fetch / and read the badge", async () => {
  const html = await (await fetch(`${stack.WEB_URL}/`)).text();
  expect(html).toContain('data-feed-mode="simulated"');
  await openConnected("/?debug=1");
  await expect(page.getByTestId("feed-mode-badge")).toHaveText(/Simulated/);
  return "server HTML and the badge both say simulated";
});

await step("C1", "open /?debug=1", async () => {
  await expect(page.getByTestId("chaos-panel")).toBeVisible();
  await shot("C1-chaos-panel");
  return "chaos-panel visible in simulator mode";
});

await step("G3", "press chaos-drop", async () => {
  await recordTransitions();
  await page.getByTestId("chaos-drop").click();
  await expect.poll(async () => (await transitions()).join(">"), { timeout: 10_000 }).toMatch(/stale.*connected/);
  await expect(page.getByTestId("connection-banner")).toHaveCount(0);
  return `data-connection went ${(await transitions()).join(" > ")}`;
});

await step("G3", "press chaos-offline, then press it again", async () => {
  await page.getByTestId("chaos-offline").click();
  await expect(root).toHaveAttribute("data-connection", "offline");
  await expect(page.getByTestId("connection-banner")).toBeVisible();
  await shot("G3-offline");
  await page.getByTestId("chaos-offline").click();
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 10_000 });
  return "offline with banner, then connected again";
});

await step("G2", "press chaos-force-closed, then press it again", async () => {
  await page.getByTestId("chaos-force-closed").click();
  await expect(root).toHaveAttribute("data-market-status", "closed", { timeout: 1_000 });
  await expect(page.getByTestId("market-status-label")).toBeVisible();
  await expect(page.getByTestId("chaos-countdown-force-closed")).toBeVisible();
  await shot("G2-market-closed");
  await page.getByTestId("chaos-force-closed").click();
  await expect(root).toHaveAttribute("data-market-status", "open", { timeout: 5_000 });
  return "closed with label and countdown, then open again";
});

await step("H1", "read GET /health", async () => {
  const health = await (await fetch(`${stack.GATEWAY_URL}/health`)).json();
  save("health.json", health);
  expect(health.connections).toBeGreaterThanOrEqual(1);
  return `connections=${health.connections}`;
});

await j.finish();
