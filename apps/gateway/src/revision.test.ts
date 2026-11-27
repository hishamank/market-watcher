import { expect, test } from "vitest";
import { parseRevision } from "./revision.ts";
import { startGateway } from "./socket/testing.ts";

test("only a commit hash is reported as the revision", () => {
  expect(parseRevision("07A9BF3af30836858d18e2400f6752ab41264268\n")).toBe(
    "07a9bf3af30836858d18e2400f6752ab41264268",
  );
  expect(parseRevision("07a9bf3")).toBe("07a9bf3");
  expect(parseRevision(undefined)).toBe("unknown");
  expect(parseRevision("")).toBe("unknown");
  expect(parseRevision("main; rm -rf /")).toBe("unknown");
  expect(parseRevision("sk-live-not-a-commit")).toBe("unknown");
});

test("health omits the revision when the gateway was not given one", async () => {
  const gateway = await startGateway();
  const response = await gateway.app.inject({ url: "/health" });
  expect(response.json()).not.toHaveProperty("revision");
  await gateway.close();
});
