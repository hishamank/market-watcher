import { defineConfig, devices } from "@playwright/test";

const gatewayPort = 4100;
const webPort = 3100;
const gatewayUrl = `http://localhost:${gatewayPort}`;

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter ./apps/gateway start",
      cwd: "../..",
      env: { PORT: String(gatewayPort), FEED: "simulator", SIM_SEED: "42" },
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
