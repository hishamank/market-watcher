import { expect, test } from "vitest";
import { parseRevision } from "./revision.ts";
import { buildApp } from "./app.ts";
import { createFakeFeed } from "./hub/fake-feed.ts";

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

test("health reports a revision only when the build supplied a commit", async () => {
  for (const [revision, reported] of [
    [undefined, false],
    [parseRevision(undefined), false],
    [parseRevision("07a9bf3"), true],
  ] as const) {
    const app = buildApp({
      feed: createFakeFeed(),
      feedMode: "simulated",
      allowedOrigins: new Set(),
      logger: false,
      ...(revision !== undefined ? { revision } : {}),
    });
    const response = await app.inject({ url: "/health" });
    expect("revision" in response.json()).toBe(reported);
    await app.close();
  }
});
