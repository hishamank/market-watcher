import { expect, test } from "@playwright/test";

test("G7 follows the system until a choice, persists it and syncs tabs", async ({
  page,
  context,
}) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = page.getByTestId("theme-switch");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(14, 14, 15)");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(241, 241, 239)");
  expect(await page.evaluate(() => localStorage.getItem("color-scheme:v1"))).toBe("light");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  const other = await context.newPage();
  await other.goto("/");
  await toggle.click();
  await expect(other.getByTestId("theme-switch")).toHaveAttribute("aria-checked", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(problems).toEqual([]);
});

test("G7 saved theme is applied before hydration", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("Missing web URL");
  const context = await browser.newContext({
    javaScriptEnabled: true,
    colorScheme: "light",
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: "color-scheme:v1", value: "dark" }] }],
    },
  });
  const page = await context.newPage();
  await page.route("**/*.js*", (route) => route.abort());
  await page.goto(baseURL);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(14, 14, 15)");
  await context.close();
});

test("G7 keyboard switching and reduced motion at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: "Dark mode" });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(".theme-switch-rays")).toHaveCSS("transition-duration", "0s");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const storage of ["invalid", "blocked"]) {
  test(`G7 ${storage} storage keeps the switch usable`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript((mode) => {
      if (mode === "invalid") localStorage.setItem("color-scheme:v1", "broken");
      else
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new Error("blocked");
          },
        });
    }, storage);
    await page.goto("/");
    const toggle = page.getByTestId("theme-switch");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await page.getByTestId("stock-row-name-AAPL").click();
    await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(241, 241, 239)");
  });
}

test("G6 G7 language and theme choices coexist in the header", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByTestId("language-option-ar").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const toggle = page.getByRole("switch", { name: "الوضع الداكن" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(toggle).toBeInViewport();
    await expect(page.getByTestId("language-toggle")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page.getByTestId("price-chart")).toHaveAttribute("data-state", "ready");
  await toggle.click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(241, 241, 239)");
  await page.getByTestId("language-option-en").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("switch", { name: "Dark mode" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  expect(problems).toEqual([]);
});
