import { expect, test } from "vitest";
import { contentSecurityPolicy } from "./content-security-policy.ts";

const base = { nonce: "abc123", gatewayUrl: "https://gateway.example", development: false };

test("production policy allows only nonce scripts and the gateway's two origins", () => {
  const policy = contentSecurityPolicy(base);
  expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic';");
  expect(policy).toContain("connect-src 'self' https://gateway.example wss://gateway.example;");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(policy).not.toMatch(/connect-src[^;]*\*/);
});

test("a local gateway maps to http and ws, and development adds eval for React", () => {
  const policy = contentSecurityPolicy({
    ...base,
    gatewayUrl: "http://localhost:4000/",
    development: true,
  });
  expect(policy).toContain("connect-src 'self' http://localhost:4000 ws://localhost:4000;");
  expect(policy).toContain("'unsafe-eval'");
});

test("an unreadable gateway URL adds no connect source", () => {
  expect(contentSecurityPolicy({ ...base, gatewayUrl: "not a url" })).toContain(
    "connect-src 'self';",
  );
});
