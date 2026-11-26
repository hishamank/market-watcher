import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`D8 star confirms only a local toggle, with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion, colorScheme: "dark" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/stocks/AAPL");
    const star = page.getByTestId("detail-star");
    await expect(star).toBeEnabled();
    await star.hover();
    await expect(star).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await star.evaluate((button) => {
      const names: string[] = [];
      Object.assign(window, { starAnimations: names });
      button.addEventListener("animationstart", (event) => {
        if (event instanceof AnimationEvent) names.push(event.animationName);
      });
    });
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    expect(await star.evaluate((button) => button.matches(":focus-visible"))).toBe(false);
    await expect(star).toHaveCSS("outline-style", "none");
    const animations = () => page.evaluate(() => Reflect.get(window, "starAnimations"));
    if (reducedMotion === "reduce") {
      await expect(star.locator("svg")).toHaveCSS("transform", "none");
      expect(await animations()).toEqual([]);
    } else {
      await expect
        .poll(animations)
        .toEqual(expect.arrayContaining(["star-on", "star-ring", "star-dot"]));
      await expect
        .poll(() => star.evaluate((button) => button.getAnimations({ subtree: true }).length))
        .toBe(0);
    }
    expect(
      await page
        .getByTestId("star-AAPL")
        .evaluate((button) => button.getAnimations({ subtree: true }).length),
    ).toBe(0);
    const afterStar = await animations();
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "false");
    expect(await animations()).toEqual(afterStar);
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    expect(await star.evaluate((button) => button.getAnimations({ subtree: true }).length)).toBe(0);
    await star.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await star.evaluate((button) => button.matches(":focus-visible"))).toBe(true);
    await expect(star).toHaveCSS("outline-style", "solid");
    await expect(star).toHaveCSS("outline-width", "2px");
  });
}
