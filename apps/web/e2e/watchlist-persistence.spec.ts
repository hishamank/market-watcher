import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

for (const locale of ["en", "ar"] as const) {
  test(`W1 W3 W4 failed persistence rolls back and recovers in ${locale}`, async ({
    page,
    context,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (
          this === localStorage &&
          key === "watchlist:v1" &&
          !sessionStorage.getItem("failed-write")
        ) {
          sessionStorage.setItem("failed-write", "1");
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        return original.call(this, key, value);
      };
    });
    await page.goto("/");
    if (locale === "ar") await page.getByTestId("language-option-ar").click();
    await expect(page.locator("html")).toHaveAttribute("lang", new RegExp(`^${locale}(?:-|$)`));
    const star = page.getByTestId("star-AAPL");
    await expect(star).toBeEnabled();
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "false");
    const error = page.locator('[aria-live="assertive"][aria-atomic="true"]');
    await expect(error).toContainText(locale === "en" ? "Couldn't update your watchlist" : "قائمة");
    expect(await page.evaluate(() => localStorage.getItem("watchlist:v1"))).toBeNull();
    const second = await context.newPage();
    await second.goto("/");
    await expect(second.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "false");
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await expect(error).toBeEmpty();
    await expect(second.getByTestId("star-AAPL")).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("watchlist:v1")))
      .toBe('["AAPL"]');
    await page.reload();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await second.close();
    expect(problems).toEqual([]);
  });
}
