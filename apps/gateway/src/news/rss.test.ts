import { describe, expect, it } from "vitest";
import { parseYahooRss } from "./rss.ts";

const wrap = (items: string) =>
  `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Feed</title>${items}</channel></rss>`;
function item(id: string, url: string, date = "Thu, 26 Nov 2026 19:00:38 +0000", extras = "") {
  return `<item><guid isPermaLink="false">${id}</guid><title><![CDATA[Growth & earnings <today>]]></title><link>${url.replaceAll("&", "&amp;")}</link><pubDate>${date}</pubDate>${extras}</item>`;
}

describe("RSS boundary", () => {
  it("sorts newest first, decodes text and deduplicates IDs and tracking links", () => {
    const xml = wrap(
      item("old", "https://example.com/old", "Wed, 25 Nov 2026 19:00:38 +0000") +
        item("new", "https://example.com/news?utm_source=x&utm_medium=rss&.tsrc=rss") +
        item("duplicate-url", "https://example.com/news") +
        item("new", "https://example.com/elsewhere"),
    );
    const articles = parseYahooRss(xml);
    expect(articles.map((article) => article.id)).toEqual(["new", "old"]);
    expect(articles[0]).toMatchObject({
      title: "Growth & earnings <today>",
      site: "example.com",
      publisher: null,
      thumbnail: null,
      publishedAt: Date.UTC(2026, 10, 26, 19, 0, 38),
    });
  });
  it("keeps supplied publisher and thumbnail, skips invalid articles and unsafe media", () => {
    const xml = wrap(
      item(
        "good",
        "https://example.com/good",
        undefined,
        '<source url="https://example.com">Publisher &amp; Co</source><media:thumbnail url="https://example.com/image.jpg"/>',
      ) +
        item("bad", "javascript:alert(1)") +
        item("credentials", "https://user:pass@example.com/story") +
        item("date", "https://example.com/date", "invalid") +
        item(
          "no-image",
          "https://example.com/no-image",
          undefined,
          '<media:thumbnail url="data:image/svg+xml,bad"/>',
        ),
    );
    const articles = parseYahooRss(xml);
    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      publisher: "Publisher & Co",
      thumbnail: "https://example.com/image.jpg",
    });
    expect(articles[1]?.thumbnail).toBeNull();
  });
  it("rejects malformed feeds and entity declarations, accepts empty feeds and caps the batch", () => {
    expect(() => parseYahooRss("<rss><channel>")).toThrow();
    expect(() => parseYahooRss('<!DOCTYPE rss [<!ENTITY x "x">]>' + wrap(""))).toThrow();
    expect(() => parseYahooRss("<html><body>Unavailable</body></html>")).toThrow();
    expect(parseYahooRss(wrap(""))).toEqual([]);
    expect(
      parseYahooRss(
        wrap(
          Array.from({ length: 12 }, (_, index) =>
            item(String(index), `https://example.com/${index}`),
          ).join(""),
        ),
      ),
    ).toHaveLength(9);
  });
});
