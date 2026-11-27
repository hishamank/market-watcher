import { expect, test, vi } from "vitest";
import {
  chooseDebugTools,
  isDebugToolsOn,
  parseDebugTools,
  restoreDebugTools,
} from "./debug-tools.ts";

const saved = vi.hoisted(() => [] as Array<[string, string]>);

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: (key: string, value: string) => {
      saved.push([key, value]);
      return Promise.resolve();
    },
  },
}));

test("debug tools start off unless the saved value is on", () => {
  expect(parseDebugTools(null)).toBe(false);
  expect(parseDebugTools("yes")).toBe(false);
  expect(parseDebugTools("on")).toBe(true);
});

test("a choice is saved, and a late restore never overrides it", () => {
  restoreDebugTools("on");
  expect(isDebugToolsOn()).toBe(true);
  chooseDebugTools(false);
  restoreDebugTools("on");
  expect(isDebugToolsOn()).toBe(false);
  expect(saved).toEqual([["debug-tools:v1", "off"]]);
});
