import { isIP } from "node:net";
import type { ChaosScope } from "@mini/contracts";
import type { FastifyServerOptions } from "fastify";
import { parseRateLimitMax, parseTrustProxy, type RestRateLimitOptions } from "./rest/plugins.ts";
import { parseRevision } from "./revision.ts";
import { LOCAL_WEB_ORIGINS } from "./socket/admission.ts";
import { parseChaosScope } from "./socket/chaos-scope.ts";

export class ConfigError extends Error {}

type Env = Readonly<Record<string, string | undefined>>;

export interface GatewayConfig {
  readonly port: number;
  readonly host: string;
  readonly chaosScope: ChaosScope;
  readonly allowedOrigins: ReadonlySet<string>;
  readonly trustProxy: NonNullable<FastifyServerOptions["trustProxy"]>;
  readonly rateLimit: RestRateLimitOptions | undefined;
  readonly revision: string;
  readonly logger: NonNullable<FastifyServerOptions["logger"]>;
}

const PROXY_NAMES = new Set(["loopback", "linklocal", "uniquelocal"]);

function shown(value: string): string {
  const printable = value.replace(/[^\x20-\x7e]/g, "?");
  return printable.length > 80 ? `${printable.slice(0, 80)}…` : printable;
}

function items(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parsePort(value: string | undefined): number {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return 4000;
  const port = /^\d{1,5}$/.test(trimmed) ? Number(trimmed) : Number.NaN;
  if (!(port >= 0 && port <= 65_535)) {
    throw new ConfigError(`PORT=${shown(trimmed)} is not a port. Use a whole number up to 65535.`);
  }
  return port;
}

function originOf(entry: string): string | undefined {
  try {
    const url = new URL(entry);
    const bare = url.pathname === "/" && url.search === "" && url.hash === "";
    const plain = /^https?:$/.test(url.protocol) && url.username === "" && url.password === "";
    return bare && plain && !entry.includes("?") && !entry.includes("#") ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function parseOrigins(value: string | undefined): ReadonlySet<string> {
  const entries = items(value);
  const bad = entries.find((entry) => originOf(entry) === undefined);
  if (bad !== undefined) {
    throw new ConfigError(
      `ALLOWED_ORIGINS entry ${shown(bad)} is not an origin. ` +
        "Use scheme://host or scheme://host:port, with no path.",
    );
  }
  const origins = entries.flatMap((entry) => originOf(entry) ?? []);
  return new Set(origins.length > 0 ? origins : LOCAL_WEB_ORIGINS);
}

function isProxyEntry(entry: string): boolean {
  const [address = "", prefix, ...rest] = entry.split("/");
  const family = isIP(address);
  if (PROXY_NAMES.has(entry)) return true;
  if (family === 0 || rest.length > 0) return false;
  return (
    prefix === undefined ||
    (/^[1-9]\d{0,2}$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128))
  );
}

export function checkTrustProxy(value: string | undefined): void {
  const trimmed = value?.trim() ?? "";
  if (/^(|true|false|\d+)$/.test(trimmed)) return;
  const bad = items(trimmed).find((entry) => !isProxyEntry(entry));
  if (bad !== undefined) {
    throw new ConfigError(
      `TRUST_PROXY entry ${shown(bad)} is not understood. ` +
        "Use false, true, a hop count, or comma-separated IP addresses or CIDR ranges.",
    );
  }
}

function parseFlag(name: string, value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "" || trimmed === "false") return false;
  if (trimmed === "true") return true;
  throw new ConfigError(`${name}=${shown(trimmed)} is not a switch. Use true or false.`);
}

export function requestLogger(logAddresses: boolean): NonNullable<FastifyServerOptions["logger"]> {
  if (logAddresses) return true;
  return {
    serializers: {
      req: (request: { method: string; url: string }) => ({
        method: request.method,
        url: request.url,
      }),
    },
  };
}

export function loadConfig(env: Env): GatewayConfig {
  const limit = env["REST_RATE_LIMIT_MAX"]?.trim() ?? "";
  const rateLimit = parseRateLimitMax(limit);
  if (limit !== "" && rateLimit === undefined) {
    throw new ConfigError(`REST_RATE_LIMIT_MAX=${shown(limit)} is not a positive whole number.`);
  }
  checkTrustProxy(env["TRUST_PROXY"]);
  return {
    port: parsePort(env["PORT"]),
    host: env["HOST"]?.trim() || "localhost",
    chaosScope: parseChaosScope(env["CHAOS_SCOPE"]),
    allowedOrigins: parseOrigins(env["ALLOWED_ORIGINS"]),
    trustProxy: parseTrustProxy(env["TRUST_PROXY"]),
    rateLimit,
    revision: parseRevision(env["GATEWAY_REVISION"]),
    logger: requestLogger(parseFlag("LOG_CLIENT_ADDRESSES", env["LOG_CLIENT_ADDRESSES"])),
  };
}
