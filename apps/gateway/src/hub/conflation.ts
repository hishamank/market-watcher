import type { Quote } from "@mini/contracts";
import { MAX_BUFFERED_BYTES, STUCK_CLOSE_MS } from "./limits.ts";
import type { Member } from "./member.ts";

export type FlushOutcome = "sent" | "idle" | "skipped" | "stuck";

export function flushMember(
  member: Member,
  latest: ReadonlyMap<string, Quote>,
  now: number,
): FlushOutcome {
  if (member.peer.bufferedAmount() > MAX_BUFFERED_BYTES) {
    member.stuckSince ??= now;
    if (member.changed.size > 0) {
      member.skippedFrames += 1;
    }
    return now - member.stuckSince >= STUCK_CLOSE_MS ? "stuck" : "skipped";
  }
  member.stuckSince = undefined;
  if (member.changed.size === 0) {
    return "idle";
  }
  const quotes = [...member.changed].flatMap((symbol) => latest.get(symbol) ?? []);
  member.changed.clear();
  member.peer.send({ type: "quotes", quotes });
  return "sent";
}

export function flushAll(
  members: Iterable<Member>,
  latest: ReadonlyMap<string, Quote>,
  now: number,
): Member[] {
  return [...members].filter((member) => flushMember(member, latest, now) === "stuck");
}

export function sendHeartbeats(members: Iterable<Member>, serverTime: number): void {
  for (const member of members) {
    member.peer.send({ type: "heartbeat", serverTime, skippedFrames: member.skippedFrames });
  }
}
