import { expect, test } from "@playwright/test";
import { capture } from "../../../.claude/skills/verify/journeys/capture.mjs";
import { collectConsoleProblems } from "./support/console.ts";

test("D1 journey evidence captures the completed view transition", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.setContent(`<style>
    html { background: rgb(255, 0, 0); }
    ::view-transition-group(root) { animation-duration: 1s; }
  </style>`);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(async () => {
    const transition = document.startViewTransition(() => {
      document.documentElement.style.background = "rgb(0, 0, 255)";
    });
    await transition.ready;
  });
  const screenshot = await capture(page, { fullPage: true });
  const pixel = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, screenshot.toString("base64"));
  expect(pixel).toEqual([0, 0, 255, 255]);
});

test("D1 journey evidence rejects an aborted view transition", async ({ page }) => {
  await page.setContent("<p>Before</p>");
  await page.evaluate(() => {
    const transition = document.startViewTransition(() => {
      document.querySelector("p").textContent = "After";
      return new Promise((resolve) => (window.finishUpdate = resolve));
    });
    window.testTransition = transition;
    void transition.ready.catch(() => {});
  });
  await expect.poll(() => page.evaluate(() => typeof window.finishUpdate)).toBe("function");
  const rejected = expect(capture(page, { fullPage: true })).rejects.toThrow();
  await page.evaluate(() => {
    window.testTransition.skipTransition();
    window.finishUpdate();
  });
  await rejected;
});

for (const reducedMotion of ["no-preference", "reduce"]) {
  test(`D1 phone journey capture preserves warm navigation (${reducedMotion})`, async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      window.observedTransitions = [];
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (...args) => {
        const transition = start(...args);
        const observed = { ready: false, finished: false };
        window.observedTransitions.push(observed);
        void transition.ready.then(
          () => (observed.ready = true),
          () => {},
        );
        void transition.finished.then(
          () => (observed.finished = true),
          () => {},
        );
        return transition;
      };
    });
    for (const path of ["/stocks/AAPL", "/?debug=1"]) {
      await page.goto(path);
      await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");
      if (path === "/stocks/AAPL") {
        await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
      }
    }
    await page.getByTestId("chaos-freeze").click();
    await page.getByTestId("chaos-close").click();
    await page.getByTestId("stock-row-name-AAPL").click();
    await expect(page.getByTestId("detail-price")).toHaveText(/^\$/);
    await capture(page, { fullPage: true });
    expect(await page.evaluate(() => window.observedTransitions)).toEqual([
      { ready: true, finished: true },
    ]);
    await expect(page.getByTestId("detail-name")).toHaveText("Apple Inc.");
    await page.getByTestId("header-back").click();
    await expect(page.getByTestId("stock-list")).toBeVisible();
    expect(problems).toEqual([]);
  });
}
