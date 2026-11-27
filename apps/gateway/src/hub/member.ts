import type { ServerMessage } from "@mini/contracts";
import { MAX_BUFFERED_BYTES } from "./limits.ts";
import { createSerial, type Serial } from "./serial.ts";

export interface Peer {
  send(message: ServerMessage): void;
  reply(message: ServerMessage): void;
  bufferedAmount(): number;
  close(code: number, reason: string): void;
}

export interface Member {
  readonly peer: Peer;
  readonly symbols: Set<string>;
  readonly changed: Set<string>;
  readonly unquoted: Set<string>;
  readonly inOrder: Serial;
  readonly writable: (() => void)[];
  pending: number;
  skippedFrames: number;
  stuckSince: number | undefined;
}

export function createMember(peer: Peer): Member {
  return {
    peer,
    symbols: new Set(),
    changed: new Set(),
    unquoted: new Set(),
    inOrder: createSerial(),
    writable: [],
    pending: 0,
    skippedFrames: 0,
    stuckSince: undefined,
  };
}

export function whenWritable(member: Member): Promise<void> {
  if (member.peer.bufferedAmount() <= MAX_BUFFERED_BYTES) {
    return Promise.resolve();
  }
  return new Promise((resolve) => member.writable.push(resolve));
}

export function releaseWritable(member: Member): void {
  member.writable.splice(0).forEach((resolve) => resolve());
}

export function wakeWritable(members: Iterable<Member>): void {
  for (const member of members) {
    if (member.writable.length > 0 && member.peer.bufferedAmount() <= MAX_BUFFERED_BYTES) {
      releaseWritable(member);
    }
  }
}
