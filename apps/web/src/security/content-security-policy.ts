export interface PolicyInput {
  readonly nonce: string;
  readonly gatewayUrl: string;
  readonly development: boolean;
}

function gatewaySources(gatewayUrl: string): string[] {
  try {
    const { origin } = new URL(gatewayUrl);
    return [origin, origin.replace(/^http/, "ws")];
  } catch {
    return [];
  }
}

export function contentSecurityPolicy({ nonce, gatewayUrl, development }: PolicyInput): string {
  const script = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (development) script.push("'unsafe-eval'");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": script,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...gatewaySources(gatewayUrl)],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}
