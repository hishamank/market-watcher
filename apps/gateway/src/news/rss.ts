import { NewsArticleSchema, NewsUrlSchema, type NewsArticle } from "@mini/contracts";
import { XMLParser, XMLValidator } from "fast-xml-parser";

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

function text(value: unknown): string | null {
  const content = typeof value === "string" ? value : field(value, "#text");
  return typeof content === "string" ? content.trim() || null : null;
}

function safeUrl(value: unknown): string | null {
  const parsed = NewsUrlSchema.safeParse(text(value));
  return parsed.success ? parsed.data : null;
}

function article(item: unknown): NewsArticle | null {
  const url = safeUrl(field(item, "link"));
  const thumbnail = field(item, "media:thumbnail");
  const media = Array.isArray(thumbnail) ? thumbnail[0] : thumbnail;
  const parsed = NewsArticleSchema.safeParse({
    id: text(field(item, "guid")) ?? url,
    title: text(field(item, "title")),
    url,
    site: url ? new URL(url).hostname.replace(/^www\./, "") : null,
    publisher: text(field(item, "source")),
    publishedAt: Date.parse(text(field(item, "pubDate")) ?? ""),
    thumbnail: safeUrl(field(media, "@_url")),
  });
  return parsed.success ? parsed.data : null;
}

function articleKey(url: string): string {
  const key = new URL(url);
  key.hash = "";
  const tracking = [...key.searchParams.keys()].filter(
    (name) => name.startsWith("utm_") || name === ".tsrc",
  );
  for (const name of tracking) key.searchParams.delete(name);
  key.searchParams.sort();
  return key.href;
}

export function parseYahooRss(xml: string): NewsArticle[] {
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml) || XMLValidator.validate(xml) !== true) {
    throw new Error("Invalid RSS document");
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
  });
  const parsed: unknown = parser.parse(xml);
  const channel = field(field(parsed, "rss"), "channel");
  if (typeof channel !== "object" || channel === null) throw new Error("Missing RSS channel");
  const raw = field(channel, "item");
  const items: unknown[] = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const articles = items
    .flatMap((item) => {
      const result = article(item);
      return result ? [result] : [];
    })
    .sort((a, b) => b.publishedAt - a.publishedAt);
  const ids = new Set<string>();
  const urls = new Set<string>();
  return articles
    .filter((item) => {
      const key = articleKey(item.url);
      if (ids.has(item.id) || urls.has(key)) return false;
      ids.add(item.id);
      urls.add(key);
      return true;
    })
    .slice(0, 9);
}
