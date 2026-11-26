import type { Quote } from "@mini/contracts";
import type { Member } from "./member.ts";
import type { QuoteBook } from "./quote-book.ts";
import type { Watchers } from "./watchers.ts";

const marked = new WeakMap<Member, Map<string, string>>();

function markedFor(member: Member): Map<string, string> {
  let previous = marked.get(member);
  if (!previous) {
    previous = new Map();
    marked.set(member, previous);
  }
  return previous;
}

export function changed(member: Member, quote: Quote): void {
  const previous = markedFor(member);
  if (quote.lastKnown) {
    const content = JSON.stringify(quote);
    if (previous.get(quote.symbol) === content) return;
    previous.set(quote.symbol, content);
  } else {
    previous.delete(quote.symbol);
  }
  member.changed.add(quote.symbol);
}

export function trackUnquoted(
  member: Member,
  accepted: readonly string[],
  unavailable: readonly string[],
  latest: ReadonlyMap<string, Quote>,
): void {
  for (const symbol of accepted) {
    const held = latest.get(symbol);
    if (held?.lastKnown) markedFor(member).set(symbol, JSON.stringify(held));
    if (unavailable.includes(symbol) || held?.lastKnown) member.unquoted.add(symbol);
  }
}

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
      if (member.unquoted.has(quote.symbol)) {
        if (!quote.lastKnown) member.unquoted.delete(quote.symbol);
        changed(member, quote);
      }
    }
  }
}
