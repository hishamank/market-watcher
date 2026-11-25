import type { FastifyReply, FastifyRequest } from "fastify";
import { CONNECTIONS_PER_IP } from "../hub/limits.ts";

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
}

export function createAdmission(allowedOrigins: ReadonlySet<string>): Admission {
  const openByIp = new Map<string, number>();

  async function check(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const origin = request.headers.origin;
    if (origin !== undefined && !allowedOrigins.has(origin)) {
      await reply.code(403).send({ error: "origin_not_allowed" });
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
  };
}
