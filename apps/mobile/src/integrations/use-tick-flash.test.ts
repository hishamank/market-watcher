import { expect, test } from "vitest";
import { flashStartOf } from "./use-tick-flash.ts";

test("a changed price starts a flash while the market is open", () => {
  expect(flashStartOf("200.00", "201.50", false)).toEqual({
    direction: "up",
    roll: { from: "200.00", to: "201.50" },
  });
});

test("a corrected close after the market closes starts no flash", () => {
  expect(flashStartOf("200.00", "201.50", true)).toBeUndefined();
});
