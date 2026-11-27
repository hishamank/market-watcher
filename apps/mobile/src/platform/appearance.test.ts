import { expect, test, vi } from "vitest";
import { chooseAppearance, parseAppearance, restoreAppearance } from "./appearance.ts";

const native = vi.hoisted(() => ({
  schemes: [] as string[],
  saved: [] as Array<[string, string]>,
  failWrites: false,
}));

vi.mock("react-native", () => ({
  Appearance: { setColorScheme: (scheme: string) => native.schemes.push(scheme) },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: (key: string, value: string) => {
      native.saved.push([key, value]);
      return native.failWrites ? Promise.reject(new Error("disk full")) : Promise.resolve();
    },
  },
}));

test("an unknown saved value follows the system", () => {
  expect(parseAppearance("sepia")).toBe("system");
  expect(parseAppearance(null)).toBe("system");
  expect(parseAppearance("dark")).toBe("dark");
});

test("a choice is saved, and System hands the scheme back to the OS", () => {
  restoreAppearance("dark");
  chooseAppearance("system");
  restoreAppearance("light");
  expect(native.schemes).toEqual(["dark", "auto"]);
  expect(native.saved).toEqual([["color-scheme:v1", "system"]]);
});

test("a failed save keeps the choice for this session", async () => {
  native.failWrites = true;
  chooseAppearance("dark");
  await Promise.resolve();
  expect(native.schemes.at(-1)).toBe("dark");
  native.failWrites = false;
});
