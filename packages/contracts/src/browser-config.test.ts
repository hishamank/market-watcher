import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import { skipEvalProbeInBrowsers } from "./browser-config.ts";

afterEach(() => {
  z.config({ jitless: false });
});

test("zod keeps its compiled parsers outside a browser and skips the eval probe inside one", () => {
  skipEvalProbeInBrowsers(false);
  expect(z.config().jitless).not.toBe(true);

  skipEvalProbeInBrowsers(true);
  expect(z.config().jitless).toBe(true);
  expect(z.object({ price: z.string() }).parse({ price: "1.00" })).toEqual({ price: "1.00" });
});
