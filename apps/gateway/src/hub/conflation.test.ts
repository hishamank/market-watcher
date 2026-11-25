import { expect, test, vi } from "vitest";
import { flushMember } from "./conflation.ts";
import { createMember } from "./member.ts";

test("a flush with only missing quotes clears the changes without sending a frame", () => {
  const send = vi.fn();
  const member = createMember({ send, reply: vi.fn(), close: vi.fn(), bufferedAmount: () => 0 });
  member.changed.add("AAPL");
  expect(flushMember(member, new Map(), 0)).toBe("idle");
  expect(send).not.toHaveBeenCalled();
  expect(member.changed.size).toBe(0);
});
