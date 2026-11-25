import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  gatewayAnswers,
  gatewayPidFile,
  startGateway,
  stopGatewayGroup,
} from "./support/gateway-process.ts";

test("L4 list error offers retry and the list returns without a reload", async ({ page }) => {
  test.setTimeout(90_000);
  stopGatewayGroup(Number(readFileSync(gatewayPidFile, "utf8")));
  await expect.poll(gatewayAnswers, { timeout: 10_000 }).toBe(false);
  const restarted: { pid?: number | undefined } = {};
  try {
    await page.goto("/");
    await page.evaluate(() => {
      (window as unknown as { __sameDocument?: boolean }).__sameDocument = true;
    });
    await expect(page.getByTestId("list-error")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("list-retry")).toBeVisible();
    await expect(page.getByTestId("stock-list")).toHaveCount(0);

    restarted.pid = startGateway(true).pid;
    await expect.poll(gatewayAnswers, { timeout: 30_000 }).toBe(true);
    await page.getByTestId("list-retry").click();
    await expect(page.getByTestId("stock-row-AAPL")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("list-error")).toHaveCount(0);
    const sameDocument = await page.evaluate(
      () => (window as unknown as { __sameDocument?: boolean }).__sameDocument,
    );
    expect(sameDocument).toBe(true);
  } finally {
    stopGatewayGroup(restarted.pid);
  }
});

test("D1 a stock that never loads shows an error with retry instead of a lasting skeleton", async ({
  page,
}) => {
  test.setTimeout(90_000);
  if (await gatewayAnswers()) stopGatewayGroup(Number(readFileSync(gatewayPidFile, "utf8")));
  await expect.poll(gatewayAnswers, { timeout: 10_000 }).toBe(false);
  const restarted: { pid?: number | undefined } = {};
  try {
    await page.goto("/stocks/AAPL");
    await expect(page.getByTestId("detail-error")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("detail-header")).toHaveCount(0);

    restarted.pid = startGateway(true).pid;
    await expect.poll(gatewayAnswers, { timeout: 30_000 }).toBe(true);
    await page.getByTestId("detail-retry").click();
    await expect(page.getByTestId("detail-header")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("detail-error")).toHaveCount(0);
    await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready", {
      timeout: 30_000,
    });
  } finally {
    stopGatewayGroup(restarted.pid);
  }
});
