import type { NewsArticle } from "@mini/contracts";

export interface NewsSource {
  load(symbol: string, signal: AbortSignal): Promise<NewsArticle[]>;
}
