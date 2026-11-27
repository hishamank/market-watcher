import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`L1 G4 financial values are named and hidden columns stay silent in ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    if (locale === "ar") await page.getByTestId("language-option-ar").click();
    const link = page.getByTestId("stock-row-AAPL").getByRole("link");
    const labels =
      locale === "en"
        ? ["Price", "Previous close", "Day high", "Day low", "Last update"]
        : ["السعر", "الإغلاق السابق", "أعلى سعر اليوم", "أدنى سعر اليوم", "آخر تحديث"];
    for (const label of labels) await expect(link).toHaveAccessibleName(new RegExp(label));
    await page.getByTestId("columns-button").click();
    await page.getByTestId("column-toggle-previousClose").uncheck();
    await expect(link).not.toHaveAccessibleName(new RegExp(labels[1]!));
    await page.getByTestId("column-toggle-previousClose").check();
    await expect(link).toHaveAccessibleName(new RegExp(labels[1]!));
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(link).toHaveAccessibleName(new RegExp(labels[0]!));
    for (const label of labels.slice(1))
      await expect(link).not.toHaveAccessibleName(new RegExp(label));
  });
}
