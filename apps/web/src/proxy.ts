import { type NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "./security/content-security-policy.ts";

export const NONCE_HEADER = "x-nonce";

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy({
    nonce,
    gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000",
    development: process.env.NODE_ENV === "development",
  });
  const headers = new Headers(request.headers);
  headers.set(NONCE_HEADER, nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
