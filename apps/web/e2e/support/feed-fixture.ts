import { test as base } from "@playwright/test";
import { gatewayPort } from "./gateway-process.ts";

export async function replaceFeed(mode: "live" | "simulated") {
  const response = await fetch(`http://localhost:${gatewayPort + 1}/${mode}`, { method: "POST" });
  if (!response.ok) throw new Error(`Feed fixture failed: ${response.status}`);
}

export const test = base.extend<{ useLiveFeed: () => Promise<void> }>({
  useLiveFeed: async ({ request }, provide) => {
    try {
      await provide(async () => {
        const response = await request.post(`http://localhost:${gatewayPort + 1}/live`);
        if (!response.ok()) throw new Error(`Feed fixture failed: ${response.status()}`);
      });
    } finally {
      await replaceFeed("simulated");
    }
  },
});
