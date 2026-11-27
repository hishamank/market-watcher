import type { RequestId } from "@mini/contracts";
import { MAX_PENDING_OPERATIONS } from "./limits.ts";
import { type Member, type Peer, whenWritable } from "./member.ts";

export type Overload = (member: Member) => void;

export function bounded(
  member: Member,
  overload: Overload,
  work: () => Promise<void>,
): Promise<void> {
  if (member.pending >= MAX_PENDING_OPERATIONS) {
    overload(member);
    return Promise.resolve();
  }
  member.pending += 1;
  return work().finally(() => {
    member.pending -= 1;
  });
}

export async function refuseSubscribe(
  members: ReadonlyMap<Peer, Member>,
  peer: Peer,
  requestId: RequestId,
): Promise<void> {
  const member = members.get(peer);
  if (member) {
    await whenWritable(member);
    if (members.get(peer) === member) {
      peer.reply({ type: "error", code: "rate_limited", message: "Too many messages", requestId });
    }
  }
}
