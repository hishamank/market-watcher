import type { FastifyReply, FastifyRequest } from "fastify";
import {
  ABUSE_COOLDOWN_MS,
  CONNECTIONS_PER_IP,
  MAX_CONNECTIONS,
  MAX_COOLDOWN_ENTRIES,
} from "../hub/limits.ts";
import { addressKey } from "./address-key.ts";

export const LOCAL_WEB_ORIGINS = ["http://localhost:3000", "http://localhost:3100"];

export function parseAllowedOrigins(value: string | undefined): ReadonlySet<string> {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return new Set(origins.length > 0 ? origins : LOCAL_WEB_ORIGINS);
}

export interface Admission {
  check(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  opened(ip: string): void;
  closed(ip: string): void;
  penalize(ip: string): void;
}

export function createAdmission(
  allowedOrigins: ReadonlySet<string>,
  now: () => number = () => Date.now(),
  maxConnections: number = MAX_CONNECTIONS,
): Admission {
  const openByIp = new Map<string, number>();
  const coolingUntil = new Map<string, number>();
  let open = 0;

  function cooling(key: string): boolean {
    const until = coolingUntil.get(key);
    if (until !== undefined && until <= now()) {
      coolingUntil.delete(key);
    }
    return coolingUntil.has(key);
  }

  function penalize(ip: string): void {
    if (coolingUntil.size >= MAX_COOLDOWN_ENTRIES) {
      [...coolingUntil.keys()].forEach(cooling);
    }
    if (coolingUntil.size < MAX_COOLDOWN_ENTRIES) {
      coolingUntil.set(addressKey(ip), now() + ABUSE_COOLDOWN_MS);
    }
  }

  async function check(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const origin = request.headers.origin;
    if (origin !== undefined && !allowedOrigins.has(origin)) {
      await reply.code(403).send({ error: "origin_not_allowed" });
    } else if (cooling(addressKey(request.ip))) {
      await reply.code(429).send({ error: "cooling_down" });
    } else if ((openByIp.get(addressKey(request.ip)) ?? 0) >= CONNECTIONS_PER_IP) {
      await reply.code(429).send({ error: "too_many_connections" });
    } else if (open >= maxConnections) {
      await reply.code(503).send({ error: "at_capacity" });
    }
  }

  function opened(ip: string): void {
    const key = addressKey(ip);
    open += 1;
    openByIp.set(key, (openByIp.get(key) ?? 0) + 1);
  }

  function closed(ip: string): void {
    const key = addressKey(ip);
    const count = (openByIp.get(key) ?? 0) - 1;
    open -= 1;
    if (count > 0) {
      openByIp.set(key, count);
    } else {
      openByIp.delete(key);
    }
  }

  return { check, opened, closed, penalize };
}
