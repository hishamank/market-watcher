import { spawn, type ChildProcess } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const gatewayPort = Number(process.env["E2E_GATEWAY_PORT"] ?? 4100);
export const gatewayControlPort = Number(process.env["E2E_CONTROL_PORT"] ?? gatewayPort + 10000);
export const webPort = Number(process.env["E2E_WEB_PORT"] ?? 3100);
export const gatewayUrl = `http://localhost:${gatewayPort}`;
export const gatewayPidFile = join(tmpdir(), `mini-e2e-gateway-${gatewayPort}.pid`);

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const e2eRestRateLimitMax = "100000";

export function startGateway(detached: boolean): ChildProcess {
  return spawn("pnpm", ["--filter", "./apps/gateway", "start"], {
    cwd: repoRoot,
    detached,
    stdio: detached ? "ignore" : "inherit",
    env: {
      ...process.env,
      PORT: String(gatewayPort),
      FEED: "simulator",
      SIM_SEED: "42",
      ALLOWED_ORIGINS: `http://localhost:${webPort}`,
      REST_RATE_LIMIT_MAX: e2eRestRateLimitMax,
    },
  });
}

export function stopGatewayGroup(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    return;
  }
}

export async function gatewayAnswers(): Promise<boolean> {
  try {
    return (await fetch(`${gatewayUrl}/stocks`)).ok;
  } catch {
    return false;
  }
}
