import { expect, test } from "@playwright/test";

test("G6 the toggle switches to Arabic in place and the server keeps it", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });
  await page.goto("/");
  const root = page.getByTestId("app-root");
  await expect(root).toHaveAttribute("data-connection", "connected", { timeout: 2_000 });
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "ltr");

  await page.getByTestId("language-option-ar").click();

  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "الأسواق" })).toBeVisible();
  await expect(page.getByTestId("language-toggle")).toHaveAttribute("data-locale", "ar");
  await expect(page.getByRole("button", { name: "العربية" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(root).toHaveAttribute("data-connection", "connected");

  const served = await (await page.request.get("/")).text();
  expect(served).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "الأسواق" })).toBeVisible();

  await page.getByTestId("language-option-en").click();
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
  expect(problems).toEqual([]);
});
