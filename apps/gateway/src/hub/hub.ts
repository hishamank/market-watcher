import type { MarketStatus, Quote, RequestId, ServerMessage } from "@mini/contracts";
import type { Feed } from "../feeds/types.ts";
import { flushAll, sendHeartbeats } from "./conflation.ts";
import {
  CLOSE_INTERNAL_ERROR,
  CLOSE_SLOW_CONSUMER,
  FLUSH_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  MAX_SUBSCRIPTIONS,
  REPLY_DEADLINE_MS,
  UPSTREAM_RETRY_MS,
} from "./limits.ts";
import {
  createMember,
  type Member,
  type Peer,
  releaseWritable,
  wakeWritable,
  whenWritable,
} from "./member.ts";
import { createQuoteBook, type QuoteBook, type Warn } from "./quote-book.ts";
import { planSubscribe } from "./subscribe-plan.ts";
import { sendAnswer, type SubscribeRequest, withDeadline } from "./subscribe-reply.ts";
import { createUpstream, type Upstream } from "./upstream.ts";
import { createWatchers, type Watchers } from "./watchers.ts";

export interface HubOptions {
  feed: Feed;
  now: () => number;
  warn: Warn;
}

export interface Hub {
  join(peer: Peer): void;
  leave(peer: Peer): Promise<void>;
  subscribe(peer: Peer, request: SubscribeRequest): Promise<void>;
  refuse(peer: Peer, requestId: RequestId): Promise<void>;
  unsubscribe(peer: Peer, symbols: readonly string[]): Promise<void>;
  broadcast(message: ServerMessage): void;
  marketStatus(): MarketStatus;
  stats(): { connections: number; upstreamSymbols: number };
  close(): Promise<void>;
}

interface Parts {
  readonly members: ReadonlyMap<Peer, Member>;
  readonly feed: Feed;
  readonly watchers: Watchers;
  readonly upstream: Upstream;
  readonly book: QuoteBook;
  readonly warn: Warn;
  readonly leave: (peer: Peer) => Promise<void>;
}

function release(symbols: readonly string[], parts: Parts): void {
  parts.book.forget(symbols.filter((symbol) => !parts.watchers.isWatched(symbol)));
  void parts.upstream.reconcile(symbols);
}

function adopt(quotes: readonly Quote[], watchers: Watchers): void {
  for (const quote of quotes) {
    for (const member of watchers.of(quote.symbol)) {
      if (member.unquoted.delete(quote.symbol)) {
        member.changed.add(quote.symbol);
      }
    }
  }
}

async function answerSubscribe(
  member: Member,
  request: SubscribeRequest,
  parts: Parts,
): Promise<void> {
  const isOpen = () => parts.members.get(member.peer) === member;
  if (!isOpen()) {
    return;
  }
  const { feed, watchers, upstream, book } = parts;
  const plan = planSubscribe(member.symbols, request.symbols, feed.catalogue, MAX_SUBSCRIPTIONS);
  watchers.add(member, plan.added);
  const ready = upstream
    .reconcile(plan.accepted)
    .then(() => book.fetch(plan.accepted))
    .then((quotes) => adopt(quotes, watchers));
  await withDeadline(ready, REPLY_DEADLINE_MS);
  await whenWritable(member);
  if (isOpen()) {
    const unavailable = sendAnswer(member.peer, request.requestId, plan, book.latest);
    unavailable.forEach((symbol) => member.unquoted.add(symbol));
  }
}

function failSubscribe(member: Member, request: SubscribeRequest, parts: Parts, err: unknown) {
  parts.warn({ err, requestId: request.requestId }, "failed to handle a subscribe, closing");
  if (parts.members.get(member.peer) === member) {
    void parts.leave(member.peer);
    member.peer.close(CLOSE_INTERNAL_ERROR, "Subscribe failed inside the gateway");
  }
}

async function refuseSubscribe(peer: Peer, requestId: RequestId, parts: Parts): Promise<void> {
  const member = parts.members.get(peer);
  if (member) {
    await whenWritable(member);
    if (parts.members.get(peer) === member) {
      peer.reply({ type: "error", code: "rate_limited", message: "Too many messages", requestId });
    }
  }
}

function retryUpstream(parts: Parts): void {
  parts.upstream.retry();
  const unquoted = [...parts.members.values()].flatMap((member) => [...member.unquoted]);
  adopt(
    unquoted.flatMap((symbol) => parts.book.latest.get(symbol) ?? []),
    parts.watchers,
  );
  void parts.book.refresh(unquoted).then((quotes) => adopt(quotes, parts.watchers));
}

export function createHub({ feed, now, warn }: HubOptions): Hub {
  const members = new Map<Peer, Member>();
  const watchers = createWatchers();
  const upstream = createUpstream(feed.live, watchers.isWatched, warn);
  const book = createQuoteBook(feed.live, watchers.isWatched, warn);
  const parts: Parts = { members, feed, watchers, upstream, book, warn, leave };

  function onQuote(quote: Quote): void {
    if (book.remember(quote)) {
      for (const member of watchers.of(quote.symbol)) {
        member.unquoted.delete(quote.symbol);
        member.changed.add(quote.symbol);
      }
    }
  }

  async function leave(peer: Peer): Promise<void> {
    const member = members.get(peer);
    if (member) {
      members.delete(peer);
      releaseWritable(member);
      release(watchers.remove(member, [...member.symbols]), parts);
    }
  }

  function inOrder(peer: Peer, task: (member: Member) => Promise<void> | void): Promise<void> {
    const member = members.get(peer);
    return member ? member.inOrder(async () => task(member)) : Promise.resolve();
  }

  function flush(): void {
    wakeWritable(members.values());
    for (const member of flushAll(members.values(), book.latest, now())) {
      void leave(member.peer);
      member.peer.close(CLOSE_SLOW_CONSUMER, "Outbound buffer stayed full");
    }
  }

  function broadcast(message: ServerMessage): void {
    members.forEach((_member, peer) => peer.send(message));
  }

  const stopQuotes = feed.live.onQuote(onQuote);
  const stopStatus = feed.calendar.onStatusChange((marketStatus) =>
    broadcast({ type: "market_status", marketStatus }),
  );
  const timers = [
    setInterval(flush, FLUSH_INTERVAL_MS),
    setInterval(() => sendHeartbeats(members.values(), now()), HEARTBEAT_INTERVAL_MS),
    setInterval(() => retryUpstream(parts), UPSTREAM_RETRY_MS),
  ];

  return {
    join: (peer) => void members.set(peer, createMember(peer)),
    leave,
    subscribe: (peer, request) =>
      inOrder(peer, (member) =>
        answerSubscribe(member, request, parts).catch((err: unknown) =>
          failSubscribe(member, request, parts, err),
        ),
      ),
    refuse: (peer, requestId) => refuseSubscribe(peer, requestId, parts),
    unsubscribe: (peer, symbols) =>
      inOrder(peer, (member) => release(watchers.remove(member, symbols), parts)),
    broadcast,
    marketStatus: () => feed.calendar.status(now()),
    stats: () => ({ connections: members.size, upstreamSymbols: watchers.symbolCount() }),
    async close() {
      timers.forEach(clearInterval);
      stopQuotes();
      stopStatus();
      members.clear();
      book.close();
      await upstream.close();
    },
  };
}
