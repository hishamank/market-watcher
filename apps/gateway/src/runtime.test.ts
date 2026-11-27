import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("main.ts loads under plain node, the way the image runs it, with no TypeScript loader", () => {
  const gatewayRoot = fileURLToPath(new URL("../", import.meta.url));
  const result = spawnSync(process.execPath, ["src/main.ts"], {
    cwd: gatewayRoot,
    env: { PATH: process.env["PATH"], FEED: "not-a-feed", PORT: "0" },
    encoding: "utf8",
    timeout: 20_000,
  });
  expect(result.stderr).toContain("FEED=not-a-feed is not a feed mode");
  expect(result.stderr).not.toContain("ERR_");
  expect(result.status).toBe(1);
}, 30_000);
