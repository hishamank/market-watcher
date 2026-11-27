import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import { createShutdown } from "./shutdown.ts";
import { startGateway } from "./socket/testing.ts";

const REVISION = "0123456789abcdef0123456789abcdef01234567";
const gatewayRoot = fileURLToPath(new URL("../", import.meta.url));
let child: ChildProcess | undefined;

afterEach(() => {
  vi.useRealTimers();
  child?.kill("SIGKILL");
  child = undefined;
});

async function startProcess(): Promise<{ port: string; output: () => string }> {
  child = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: gatewayRoot,
    env: { PATH: process.env["PATH"], HOST: "127.0.0.1", PORT: "0", GATEWAY_REVISION: REVISION },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let text = "";
  child.stdout?.on("data", (chunk: Buffer) => (text += chunk.toString()));
  const port = await vi.waitFor(
    () => {
      const found = /Server listening at http:\/\/127\.0\.0\.1:(\d+)/.exec(text)?.[1];
      if (found === undefined) throw new Error("gateway is not listening yet");
      return found;
    },
    { timeout: 15_000, interval: 50 },
  );
  return { port, output: () => text };
}

test("SIGTERM closes open sockets as going away, runs cleanup and exits 0", async () => {
  const gateway = await startProcess();
  const health = await fetch(`http://127.0.0.1:${gateway.port}/health`);
  expect(await health.json()).toMatchObject({ revision: REVISION });
  const socket = new WebSocket(`ws://127.0.0.1:${gateway.port}/ws?v=1`);
  await once(socket, "message");
  const closed = once(socket, "close");
  const exited = once(child!, "exit");

  child!.kill("SIGTERM");
  child!.kill("SIGTERM");
  child!.kill("SIGINT");

  expect((await closed)[0]).toBe(1001);
  expect((await exited)[0]).toBe(0);
  expect(gateway.output()).toContain(`gateway revision: ${REVISION}`);
  expect(gateway.output().match(/gateway received/g)).toHaveLength(1);
  expect(gateway.output()).toContain("gateway closed");
}, 30_000);

test("repeated signals share one close", async () => {
  const gateway = await startGateway();
  const close = vi.spyOn(gateway.app, "close");
  const exit = vi.fn();
  const shutdown = createShutdown({ app: gateway.app, exit, log: () => undefined });

  await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT"), shutdown("SIGTERM")]);

  expect(close).toHaveBeenCalledTimes(1);
  expect(exit.mock.calls).toEqual([[0]]);
});

test("a close that hangs exits 1 at the deadline", async () => {
  const gateway = await startGateway();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const realClose = gateway.app.close.bind(gateway.app);
  vi.spyOn(gateway.app, "close").mockReturnValue(new Promise(() => undefined) as never);
  const exit = vi.fn();
  const shutdown = createShutdown({ app: gateway.app, exit, deadlineMs: 5_000, log: () => {} });

  void shutdown("SIGTERM");
  await vi.advanceTimersByTimeAsync(4_999);
  expect(exit).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);

  expect(exit.mock.calls).toEqual([[1]]);
  vi.useRealTimers();
  await realClose();
});
