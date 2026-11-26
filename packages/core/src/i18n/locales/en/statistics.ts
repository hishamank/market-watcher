export const statisticsStrings = {
  "statistics.title": "Key statistics",
  "statistics.marketCap": "Market cap",
  "statistics.trailingPE": "P/E ratio (TTM)",
  "statistics.trailingEps": "EPS (TTM)",
  "statistics.dividendYield": "Dividend yield",
  "statistics.averageVolume": "Avg. volume (3M)",
  "statistics.yearRange": "52-week range",
  "statistics.marketCapHelp":
    "The total market value of a company's outstanding shares. K = thousand, M = million, B = billion, T = trillion. Not applicable to funds.",
  "statistics.trailingPEHelp":
    "Share price divided by earnings per share over the trailing twelve months (TTM). A dash means unavailable or not meaningful for this security.",
  "statistics.trailingEpsHelp":
    "Earnings per share over the trailing twelve months (TTM). Negative earnings indicate a loss. Monetary values are in US dollars.",
  "statistics.dividendYieldHelp":
    "Yahoo's indicated annual dividend as a percentage of the share price. A dash means no value was supplied, not a zero yield.",
  "statistics.averageVolumeHelp":
    "The average number of shares traded each day over the past three months. K = thousand, M = million.",
  "statistics.yearRangeHelp":
    "The lowest and highest prices reported by Yahoo over the past 52 weeks. The marker uses the latest available price shown on this page and stays at the nearest end if that price falls outside the range. Sources may update at different times.",
  "statistics.lastPrice": "Last price {{price}}",
  "statistics.sample": "Sample statistics · USD",
  "statistics.note": "USD · Unavailable values shown as —",
  "statistics.loading": "Loading key statistics",
  "statistics.empty": "Statistics aren't available for this security yet.",
  "statistics.error": "Statistics couldn't be loaded.",
} as const;
