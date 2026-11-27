import { isIPv6 } from "node:net";

const MAPPED_IPV4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const PREFIX_GROUPS = 4;

function expandGroups(address: string): string[] {
  const [head = "", tail] = address.split("::");
  const left = head === "" ? [] : head.split(":");
  const right = tail === undefined || tail === "" ? [] : tail.split(":");
  const missing = tail === undefined ? 0 : Math.max(0, 8 - left.length - right.length);
  return [...left, ...Array<string>(missing).fill("0"), ...right];
}

export function addressKey(ip: string): string {
  const address = ip.split("%")[0] ?? ip;
  const mapped = MAPPED_IPV4.exec(address)?.[1];
  if (mapped !== undefined) return mapped;
  if (!isIPv6(address)) return address;
  const groups = expandGroups(address)
    .slice(0, PREFIX_GROUPS)
    .map((group) => Number.parseInt(group, 16).toString(16));
  return `${groups.join(":")}::/64`;
}
