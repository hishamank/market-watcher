import type { NewsSource } from "./source.ts";

const headlines = [
  "A closer look at the latest quarterly results",
  "What investors are watching this week",
  "A look at the year ahead",
  "The themes shaping the next earnings season",
  "Understanding the latest market update",
  "A longer-term perspective on the business",
];

export const simulatorNewsSource: NewsSource = {
  async load(symbol) {
    if (!["AAPL", "MSFT", "SPY"].includes(symbol)) return [];
    return headlines.map((title, index) => ({
      id: `sample-${symbol}-${index}`,
      title: `${symbol}: ${title}`,
      url: `https://example.com/#sample-${symbol}-${index}`,
      site: "example.com",
      publisher: null,
      publishedAt: Date.UTC(2026, 10, 26, 18 - index * 3),
      thumbnail: null,
    }));
  },
};
