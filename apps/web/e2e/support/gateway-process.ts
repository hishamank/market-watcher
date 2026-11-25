import { spawn, type ChildProcess } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const gatewayPort = 4100;
export const gatewayUrl = `http://localhost:${gatewayPort}`;
export const gatewayPidFile = join(tmpdir(), `mini-e2e-gateway-${gatewayPort}.pid`);

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

export function startGateway(detached: boolean): ChildProcess {
  return spawn("pnpm", ["--filter", "./apps/gateway", "start"], {
    cwd: repoRoot,
    detached,
    stdio: detached ? "ignore" : "inherit",
    env: { ...process.env, PORT: String(gatewayPort), FEED: "simulator", SIM_SEED: "42" },
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
