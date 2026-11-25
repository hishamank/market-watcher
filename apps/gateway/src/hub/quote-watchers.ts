import type { Quote } from "@mini/contracts";
import type { QuoteBook } from "./quote-book.ts";
import type { Watchers } from "./watchers.ts";

export function expire(book: QuoteBook, watchers: Watchers): void {
  for (const symbol of book.expire()) {
    for (const member of watchers.of(symbol)) {
      member.changed.delete(symbol);
      member.unquoted.add(symbol);
    }
  }
}

export function adopt(quotes: readonly Quote[], watchers: Watchers): void {
  for (const quote of quotes) {
    for (const member of watchers.of(quote.symbol)) {
      if (member.unquoted.delete(quote.symbol)) {
        member.changed.add(quote.symbol);
      }
    }
  }
}
