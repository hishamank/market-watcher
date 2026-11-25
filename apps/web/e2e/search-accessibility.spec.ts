import { expect, type Locator, type Page, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

async function expectOptionInsideDropdown(option: Locator): Promise<void> {
  const bounds = await option.evaluate((element) => {
    const container = element.closest('[role="listbox"]')?.parentElement;
    if (!container) {
      throw new Error("Missing dropdown scroll container");
    }
    const optionRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const visibleTop = containerRect.top + container.clientTop;
    return {
      optionTop: optionRect.top,
      optionBottom: optionRect.bottom,
      visibleTop,
      visibleBottom: visibleTop + container.clientHeight,
    };
  });

  expect(bounds.optionTop).toBeGreaterThanOrEqual(bounds.visibleTop - 0.5);
  expect(bounds.optionBottom).toBeLessThanOrEqual(bounds.visibleBottom + 0.5);
}

async function expectFocusInside(page: Page, container: Locator): Promise<void> {
  const inside = await container.evaluate((el) => {
    const active = document.activeElement;
    return active !== null && active !== document.body && el.contains(active);
  });
  expect(inside).toBe(true);
  await expect(page.getByTestId("view-toggle-all")).not.toBeFocused();
}

test("S3 keyboard navigation keeps every active search option inside the visible dropdown", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");

  const input = page.getByTestId("search-input");
  await input.fill("a");
  const listbox = page.getByRole("listbox");
  const options = listbox.locator('[role="option"]');
  await expect(options).toHaveCount(10);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(input).toHaveAttribute("role", "combobox");

  for (let index = 0; index < 10; index += 1) {
    await input.press("ArrowDown");
    const active = options.nth(index);
    await expect(active).toHaveAttribute("aria-selected", "true");
    await expectOptionInsideDropdown(active);
  }

  for (let index = 8; index >= 0; index -= 1) {
    await input.press("ArrowUp");
    const active = options.nth(index);
    await expect(active).toHaveAttribute("aria-selected", "true");
    await expectOptionInsideDropdown(active);
  }

  expect(problems).toEqual([]);
});

test("S3 mobile search sheet traps focus as a modal dialog and restores focus on Escape", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-connection", "connected");

  const trigger = page.getByRole("button", { name: "Search" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /search/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  const backgroundInert = await page
    .getByTestId("view-toggle-all")
    .evaluate((el) => el.closest("[inert]") !== null);
  expect(backgroundInert).toBe(true);

  const input = page.getByTestId("search-input");
  await expect(input).toBeFocused();
  await input.fill("a");
  await dialog.getByRole("button", { name: "Clear" }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();

  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press("Tab");
    await expectFocusInside(page, dialog);
  }

  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press("Shift+Tab");
    await expectFocusInside(page, dialog);
  }

  const backButton = dialog.getByRole("button", { name: "All stocks" });
  await page.keyboard.press("Tab");
  await expect(backButton).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  const stillInert = await page
    .getByTestId("view-toggle-all")
    .evaluate((el) => el.closest("[inert]") !== null);
  expect(stillInert).toBe(false);

  expect(problems).toEqual([]);
});
