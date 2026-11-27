import { expect, test, vi } from "vitest";
import {
  chooseDebugTools,
  isDebugToolsOn,
  isDebugToolsRestored,
  parseDebugTools,
  restoreDebugTools,
} from "./debug-tools.ts";

const storage = vi.hoisted(() => ({
  saved: [] as Array<[string, string]>,
  failWrites: false,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: (key: string, value: string) => {
      storage.saved.push([key, value]);
      return storage.failWrites ? Promise.reject(new Error("disk full")) : Promise.resolve();
    },
  },
}));

test("debug tools start off unless the saved value is on", () => {
  expect(parseDebugTools(null)).toBe(false);
  expect(parseDebugTools("yes")).toBe(false);
  expect(parseDebugTools("on")).toBe(true);
});

test("a choice is saved, and a late restore never overrides it", () => {
  expect(isDebugToolsRestored()).toBe(false);
  restoreDebugTools("on");
  expect(isDebugToolsRestored()).toBe(true);
  expect(isDebugToolsOn()).toBe(true);
  chooseDebugTools(false);
  restoreDebugTools("on");
  expect(isDebugToolsOn()).toBe(false);
  expect(storage.saved).toEqual([["debug-tools:v1", "off"]]);
});

test("a failed save keeps the choice for this session", async () => {
  storage.failWrites = true;
  chooseDebugTools(true);
  await Promise.resolve();
  restoreDebugTools(null);
  expect(isDebugToolsOn()).toBe(true);
  storage.failWrites = false;
});
