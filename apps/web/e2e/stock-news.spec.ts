import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./support/console.ts";

const liveNews = {
  symbol: "AAPL",
  source: "yahoo",
  fetchedAt: 1795776000000,
  articles: Array.from({ length: 5 }, (_, index) => ({
    id: `article-${index}`,
    title: `A company headline ${index + 1}`,
    url: `https://example.com/articles/${index}`,
    site: "example.com",
    publisher: index === 0 ? "Example Publisher" : null,
    publishedAt: 1795719638000 - index * 3600000,
    thumbnail: null,
  })),
};

test("D11 sample news shows three stories, expands, resets by symbol and has an empty state", async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-news")).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("news-story")).toHaveCount(3);
  await expect(page.getByTestId("news-source")).toContainText("Fictional headlines");
  await expect(page.getByTestId("news-story").getByRole("link")).toHaveCount(0);
  await page.getByTestId("news-more").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("news-story")).toHaveCount(6);
  await expect(page.getByTestId("news-more")).toHaveAttribute("aria-expanded", "true");
  await page.getByTestId("news-more").click();
  await expect(page.getByTestId("news-story")).toHaveCount(3);
  await page.goto("/stocks/MSFT");
  await expect(page.getByTestId("news-story")).toHaveCount(3);
  await page.goto("/stocks/NVDA");
  await expect(page.getByTestId("stock-news")).toHaveAttribute("data-state", "empty");
  expect(problems).toEqual([]);
});

test("D11 Yahoo stories use publisher or destination site, ET dates and safe external links", async ({
  page,
}) => {
  await page.route("**/stocks/AAPL/news", (route) => route.fulfill({ json: liveNews }));
  await page.goto("/stocks/AAPL");
  const story = page.getByTestId("news-story").first();
  await expect(story).toContainText("Example Publisher");
  await expect(story).toContainText("14:00 ET");
  await expect(page.getByTestId("news-story").nth(1)).toContainText("example.com");
  const link = story.getByRole("link");
  await expect(link).toHaveAttribute("href", "https://example.com/articles/0");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByTestId("news-source")).toContainText("News via Yahoo Finance");
  await page.getByTestId("news-more").click();
  await expect(page.getByTestId("news-story")).toHaveCount(5);
});

test("D11 news retries without interrupting prices or the other sections", async ({ page }) => {
  let failing = true;
  await page.route("**/stocks/AAPL/news", (route) =>
    failing
      ? route.fulfill({
          status: 503,
          json: {
            feedMode: "simulated",
            marketStatus: "open",
            error: { code: "unavailable", message: "Unavailable" },
          },
        })
      : route.continue(),
  );
  await page.goto("/stocks/AAPL");
  await expect(page.getByTestId("stock-news")).toHaveAttribute("data-state", "error");
  await expect(page.getByTestId("company-profile")).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("stock-statistics")).toHaveAttribute("data-state", "ready");
  const price = page.getByTestId("detail-price");
  const before = await price.textContent();
  await expect(price).not.toHaveText(before ?? "", { timeout: 10000 });
  failing = false;
  await page.getByTestId("news-retry").click();
  await expect(page.getByTestId("stock-news")).toHaveAttribute("data-state", "ready");
});

for (const width of [360, 1440]) {
  test(`D11 news fits ${width}px in both languages and themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/stocks/AAPL");
      await expect(page.getByTestId("stock-news")).toHaveAttribute("data-state", "ready");
      await page.getByTestId("news-more").click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByTestId("language-toggle").click();
      await expect(page.getByTestId("stock-news")).toContainText(
        colorScheme === "light" ? "أخبار الشركة" : "Company news",
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}

test("D11 supplied thumbnails render and failed images fall back to text", async ({ page }) => {
  let imageFails = false;
  await page.route("https://images.example.com/story.svg", (route) =>
    imageFails
      ? route.fulfill({ status: 404, body: "Missing" })
      : route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="72"><rect width="96" height="72" fill="#888"/></svg>',
        }),
  );
  await page.route("**/stocks/AAPL/news", (route) =>
    route.fulfill({
      json: {
        ...liveNews,
        articles: liveNews.articles.map((article, index) => ({
          ...article,
          thumbnail: index === 0 ? "https://images.example.com/story.svg" : null,
        })),
      },
    }),
  );
  await page.goto("/stocks/AAPL");
  const image = page.getByTestId("news-story").first().locator("img");
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(96);
  imageFails = true;
  await page.reload();
  await page.getByTestId("stock-news").scrollIntoViewIfNeeded();
  await expect(image).toHaveCount(0);
  await expect(page.getByTestId("news-story").first()).toContainText("A company headline 1");
});
