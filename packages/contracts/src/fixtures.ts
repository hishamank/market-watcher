import type { Quote } from "./quote.ts";

export const aaplQuote: Quote = {
  symbol: "AAPL",
  price: "187.42",
  change: "-2.58",
  changePercent: "-1.36",
  previousClose: "190.00",
  timestamp: 1_764_000_000_000,
};

export const pennyQuote: Quote = {
  symbol: "SNDL",
  price: "0.4387",
  change: "-0.0125",
  changePercent: "-2.77",
  previousClose: "0.4512",
  timestamp: 1_764_000_000_250,
};
