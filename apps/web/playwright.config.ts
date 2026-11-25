import { defineConfig, devices } from "@playwright/test";
import { gatewayUrl, webPort } from "./e2e/support/gateway-process.ts";

const chromium = devices["Desktop Chrome"];

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: chromium, testIgnore: /gateway-down/ },
    {
      name: "gateway-down",
      use: chromium,
      testMatch: /gateway-down/,
      dependencies: ["chromium"],
    },
  ],
  webServer: [
    {
      command: "node apps/web/e2e/support/run-gateway.ts",
      cwd: "../..",
      url: `${gatewayUrl}/stocks`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm build && pnpm start --port ${webPort}`,
      env: { NEXT_PUBLIC_GATEWAY_URL: gatewayUrl },
      url: `http://localhost:${webPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
