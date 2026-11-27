import { z } from "zod";

function inBrowser(): boolean {
  return Reflect.has(globalThis, "document");
}

export function skipEvalProbeInBrowsers(isBrowser: boolean = inBrowser()): void {
  if (isBrowser) {
    z.config({ jitless: true });
  }
}

skipEvalProbeInBrowsers();
