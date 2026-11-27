import type { FastifyInstance } from "fastify";
import { closeWithDeadline } from "./socket/session.ts";

export const SHUTDOWN_DEADLINE_MS = 5_000;
export const CLOSE_GOING_AWAY = 1001;

export interface ShutdownOptions {
  app: FastifyInstance;
  deadlineMs?: number;
  exit?: (code: number) => void;
  log?: (message: string) => void;
}

export type Shutdown = (signal: string) => Promise<void>;

export function createShutdown({
  app,
  deadlineMs = SHUTDOWN_DEADLINE_MS,
  exit = (code) => process.exit(code),
  log = (message) => console.log(message),
}: ShutdownOptions): Shutdown {
  let stopping: Promise<void> | undefined;

  async function stop(signal: string): Promise<void> {
    log(`gateway received ${signal}, closing`);
    const deadline = setTimeout(() => {
      log(`gateway did not close within ${deadlineMs} ms, exiting`);
      exit(1);
    }, deadlineMs);
    deadline.unref();
    for (const socket of app.websocketServer.clients) {
      closeWithDeadline(socket, CLOSE_GOING_AWAY, "Gateway shutting down");
    }
    try {
      await app.close();
      log("gateway closed");
      exit(0);
    } catch (err: unknown) {
      log(`gateway close failed: ${err instanceof Error ? err.message : String(err)}`);
      exit(1);
    } finally {
      clearTimeout(deadline);
    }
  }

  return (signal) => {
    stopping ??= stop(signal);
    return stopping;
  };
}
