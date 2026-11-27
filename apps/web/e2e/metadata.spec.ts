import { expect, test } from "@playwright/test";

const origin = process.env.SITE_URL ?? "https://stocks-watchlist-puce.vercel.app";

test("G8 metadata follows stock navigation, ranges and language", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page).toHaveTitle("Markets");
  await page.getByTestId("stock-row-name-AAPL").click();
  await expect(page).toHaveTitle("AAPL — Apple Inc. | Markets");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Apple Inc.*AAPL/,
  );
  await page.getByTestId("range-tab-1Y").click();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/stocks/AAPL`,
  );
  await page.getByTestId("list-pane").getByTestId("stock-row-name-MSFT").click();
  await expect(page).toHaveTitle(/MSFT — Microsoft.* \| Markets/);
  await page.getByTestId("language-option-ar").click();
  await expect(page).toHaveTitle(/MSFT.*الأسواق/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "ar");
  await page.reload();
  await expect(page).toHaveTitle(/MSFT.*الأسواق/);
  await page.getByTestId("language-option-en").click();
  await expect(page).toHaveTitle(/MSFT.*Markets/);
  expect(errors).toEqual([]);
});

test("G8 crawler HTML, sitemap, robots and icon expose canonical metadata", async ({ request }) => {
  const response = await request.get("/stocks/aapl?range=1Y", {
    headers: { "User-Agent": "facebookexternalhit/1.1" },
  });
  expect(response.ok()).toBe(true);
  const html = await response.text();
  const head = html.split("</head>")[0] ?? "";
  expect(head).toContain("<title>AAPL — Apple Inc. | Markets</title>");
  expect(head).toContain(`rel="canonical" href="${origin}/stocks/AAPL"`);
  expect(head).toContain('property="og:title" content="AAPL — Apple Inc. | Markets"');
  expect(head).toContain('name="twitter:title" content="AAPL — Apple Inc. | Markets"');
  const icon = await request.get("/icon.svg");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
  expect(head).toMatch(/rel="icon"[^>]*href="\/icon.svg/);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain(`<loc>${origin}/stocks/AAPL</loc>`);
  expect(xml).not.toContain("?range=");
  const missing = await request.get("/stocks/NOPE123", {
    headers: { "User-Agent": "facebookexternalhit/1.1" },
  });
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('name="robots" content="noindex"');
});
