import type { FastifyReply, FastifyRequest } from "fastify";
import { ABUSE_COOLDOWN_MS, CONNECTIONS_PER_IP, MAX_COOLDOWN_ENTRIES } from "../hub/limits.ts";

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
): Admission {
  const openByIp = new Map<string, number>();
  const coolingUntil = new Map<string, number>();

  function cooling(ip: string): boolean {
    const until = coolingUntil.get(ip);
    if (until !== undefined && until <= now()) {
      coolingUntil.delete(ip);
    }
    return coolingUntil.has(ip);
  }

  function penalize(ip: string): void {
    if (coolingUntil.size >= MAX_COOLDOWN_ENTRIES) {
      [...coolingUntil.keys()].forEach(cooling);
    }
    if (coolingUntil.size < MAX_COOLDOWN_ENTRIES) {
      coolingUntil.set(ip, now() + ABUSE_COOLDOWN_MS);
    }
  }

  async function check(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const origin = request.headers.origin;
    if (origin !== undefined && !allowedOrigins.has(origin)) {
      await reply.code(403).send({ error: "origin_not_allowed" });
    } else if (cooling(request.ip)) {
      await reply.code(429).send({ error: "cooling_down" });
    } else if ((openByIp.get(request.ip) ?? 0) >= CONNECTIONS_PER_IP) {
      await reply.code(429).send({ error: "too_many_connections" });
    }
  }

  function closed(ip: string): void {
    const count = (openByIp.get(ip) ?? 0) - 1;
    if (count > 0) {
      openByIp.set(ip, count);
    } else {
      openByIp.delete(ip);
    }
  }

  return {
    check,
    opened: (ip) => void openByIp.set(ip, (openByIp.get(ip) ?? 0) + 1),
    closed,
    penalize,
  };
}
